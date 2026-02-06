const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    Collection, 
    Events 
} = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const axios = require('axios');
const { initializeDataDirectory } = require('./dataInit');
require('dotenv').config();

/* ===============================
   SAFETY CHECK: TOKEN
================================ */
const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN;
if (!TOKEN) {
    console.error('❌ TOKEN or DISCORD_TOKEN environment variable is missing');
    process.exit(1);
}

/* ===============================
   INITIALIZE DATA
================================ */
console.log('[STARTUP] Initializing data directory...');
initializeDataDirectory();

const resetScript = path.join(__dirname, 'reset_limit.js');
if (fs.existsSync(resetScript)) {
    try {
        require('./reset_limit.js');
    } catch (err) {
        console.error('[STARTUP] Error running reset script:', err);
    }
}

/* ===============================
   DISCORD CLIENT
================================ */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
        Partials.ThreadMember
    ],
    sweepers: {
        messages: {
            interval: 3600, 
            lifetime: 1800, 
        },
        users: {
            interval: 3600,
            filter: () => user => user.id !== client.user.id,
        }
    }
});

client.invites = new Map();
client.commands = new Collection();

/* ===============================
   READY EVENT
================================ */
client.once('ready', async () => {
    console.log(`✅ BOT ONLINE AS ${client.user.tag}`);
    
    // Cache invites
    (async () => {
        for (const guild of client.guilds.cache.values()) {
            try {
                const invites = await guild.invites.fetch();
                client.invites.set(guild.id, new Map(invites.map(inv => [inv.code, inv.uses])));
            } catch (err) {}
        }
    })();
});

/* ===============================
   COMMAND & EVENT HANDLERS
================================ */
const foldersPath = path.join(__dirname, 'commands');
function loadCommands(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
            loadCommands(itemPath);
        } else if (item.endsWith('.js')) {
            try {
                const command = require(itemPath);
                if (command.data && command.execute) client.commands.set(command.data.name, command);
            } catch (err) {}
        }
    }
}
loadCommands(foldersPath);

const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        const executeEvent = async (...args) => {
            try { await event.execute(...args); } catch (error) { console.error(`[EVENT ERROR] ${event.name}:`, error); }
        };
        if (event.once) client.once(event.name, executeEvent);
        else client.on(event.name, executeEvent);
    }
}

/* ===============================
   INVITE TRACKING
================================ */
client.on(Events.InviteCreate, invite => {
    const guildInvites = client.invites.get(invite.guild.id);
    if (guildInvites) guildInvites.set(invite.code, invite.uses);
});

client.on(Events.InviteDelete, invite => {
    const guildInvites = client.invites.get(invite.guild.id);
    if (guildInvites) guildInvites.delete(invite.code);
});

/* ===============================
   ERROR HANDLING
================================ */
process.on('unhandledRejection', err => {
    console.error('Unhandled promise rejection:', err);
});

/* ===============================
   LOGIN
================================ */
client.login(TOKEN).catch(err => {
    console.error('❌ Discord login failed:', err);
    process.exit(1);
});

/* ===============================
   EXPRESS SERVER & KEEP-ALIVE
================================ */
const app = express();
const PORT = process.env.PORT || 8000;

app.get('/', (req, res) => {
    res.json({
        status: 'online',
        bot: client.user ? client.user.tag : 'Starting...',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [SERVER] Running on port ${PORT}`);
    
    // --- SELF-PING MECHANISM ---
    // If you provide KOYEB_PUBLIC_URL in your environment variables, 
    // the bot will ping itself every 5 minutes to stay awake.
    const PUBLIC_URL = process.env.KOYEB_PUBLIC_URL || process.env.PUBLIC_URL;
    if (PUBLIC_URL) {
        console.log(`🔗 [KEEP-ALIVE] Self-ping enabled for: ${PUBLIC_URL}`);
        setInterval(async () => {
            try {
                await axios.get(PUBLIC_URL);
                console.log('💓 [KEEP-ALIVE] Self-ping successful');
            } catch (err) {
                console.error('💔 [KEEP-ALIVE] Self-ping failed:', err.message);
            }
        }, 300000); // Every 5 minutes
    } else {
        console.log('⚠️ [KEEP-ALIVE] KOYEB_PUBLIC_URL not set. Self-ping disabled.');
    }
});
