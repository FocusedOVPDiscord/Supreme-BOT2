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
const { initializeDataDirectory } = require('./dataInit');
require('dotenv').config();

/* ===============================
   SAFETY CHECK: TOKEN
================================ */
if (!process.env.TOKEN) {
    console.error('❌ TOKEN environment variable is missing');
    process.exit(1);
}

console.log('[DEBUG] TOKEN detected, length:', process.env.TOKEN.length);

/* ===============================
   INITIALIZE DATA
================================ */
console.log('[STARTUP] Initializing data directory...');
initializeDataDirectory();

// Run reset script if it exists
const resetScript = path.join(__dirname, 'reset_limit.js');
if (fs.existsSync(resetScript)) {
    try {
        require('./reset_limit.js');
        // We don't delete it here to avoid issues with multiple restarts, 
        // but it will ensure the user is cleared on the next boot.
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
    // Technical Improvement: Better memory handling via sweepers
    sweepers: {
        messages: {
            interval: 3600, // Every hour
            lifetime: 1800, // Remove messages older than 30 mins
        },
        users: {
            interval: 3600,
            filter: () => user => user.id !== client.user.id, // Keep the bot user
        }
    }
});

/* ===============================
   CACHES
================================ */
client.invites = new Map();
client.commands = new Collection();

/* ===============================
   READY EVENT (CRITICAL)
================================ */
client.once('ready', async () => {
    console.log(`✅ BOT ONLINE AS ${client.user.tag}`);
    console.log(`[DEBUG] Connected to ${client.guilds.cache.size} guilds`);

    // Cache invites in background to avoid blocking
    (async () => {
        console.log('[DEBUG] Starting invite cache...');
        for (const guild of client.guilds.cache.values()) {
            try {
                const invites = await guild.invites.fetch();
                client.invites.set(
                    guild.id,
                    new Map(invites.map(inv => [inv.code, inv.uses]))
                );
                console.log(`[DEBUG] Cached ${invites.size} invites for ${guild.name}`);
            } catch (err) {
                console.warn(`[WARN] Could not fetch invites for ${guild.name}: ${err.message}`);
            }
        }
        console.log('[DEBUG] Invite cache complete.');
    })();
});

/* ===============================
   COMMAND HANDLER
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
                if (command.data && command.execute) {
                    client.commands.set(command.data.name, command);
                    console.log(`[SUCCESS] Loaded command: ${command.data.name}`);
                }
            } catch (err) {
                console.error(`[ERROR] Failed loading command ${itemPath}`, err);
            }
        }
    }
}

loadCommands(foldersPath);

/* ===============================
   EVENT HANDLER
================================ */
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);

        // Technical Improvement: Cleaner UI callbacks and error-safe execution
        const executeEvent = async (...args) => {
            try {
                await event.execute(...args);
            } catch (error) {
                console.error(`[EVENT ERROR] Error in event ${event.name}:`, error);
            }
        };

        if (event.once) {
            client.once(event.name, executeEvent);
        } else {
            client.on(event.name, executeEvent);
        }
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
   LOGIN TO DISCORD (IMPORTANT)
================================ */
console.log('[DEBUG] Attempting to login to Discord...');
client.login(process.env.TOKEN)
    .then(() => console.log('[DEBUG] client.login() promise resolved'))
    .catch(err => {
        console.error('❌ Discord login failed:', err);
        process.exit(1);
    });

/* ===============================
   EXPRESS SERVER (OPTIONAL)
================================ */
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.json({
        status: 'online',
        bot: client.user ? client.user.tag : 'Starting...',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        discord: client.user ? 'connected' : 'disconnected',
        guilds: client.guilds.cache.size,
        uptime: process.uptime()
    });
});

app.listen(PORT, () => {
    console.log(`[INFO] Express server running on port ${PORT}`);
});
