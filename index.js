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
const { query } = require('./utils/db');
require('dotenv').config();

// --- CRASH RECOVERY ---
process.on('uncaughtException', (err) => {
    console.error('🔥 [FATAL] Uncaught Exception:', err);
    // Give time for logs to flush before exiting
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 [FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

/* ===============================
   SAFETY CHECK: TOKEN
================================ */
const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN;
if (!TOKEN) {
    console.error('❌ [ERROR] TOKEN or DISCORD_TOKEN environment variable is missing');
    process.exit(1);
}

/* ===============================
   INITIALIZE DATA
================================ */
console.log('[STARTUP] Initializing data directory...');
try {
    initializeDataDirectory();
    
    // Initialize TiDB Schema
    (async () => {
        try {
            console.log('🚀 [STARTUP] Initializing TiDB Schema...');
            await query(`
                CREATE TABLE IF NOT EXISTS settings (
                    guild_id VARCHAR(255),
                    setting_key VARCHAR(255),
                    setting_value TEXT,
                    PRIMARY KEY (guild_id, setting_key)
                )
            `);
            await query(`
                CREATE TABLE IF NOT EXISTS invites (
                    guild_id VARCHAR(255),
                    user_id VARCHAR(255),
                    regular INT DEFAULT 0,
                    fake INT DEFAULT 0,
                    bonus INT DEFAULT 0,
                    left_count INT DEFAULT 0,
                    PRIMARY KEY (guild_id, user_id)
                )
            `);
            await query(`
                CREATE TABLE IF NOT EXISTS join_history (
                    guild_id VARCHAR(255),
                    user_id VARCHAR(255),
                    inviter_id VARCHAR(255),
                    is_fake BOOLEAN,
                    joined_at BIGINT,
                    PRIMARY KEY (guild_id, user_id)
                )
            `);
            await query(`
                CREATE TABLE IF NOT EXISTS transcripts (
                    id VARCHAR(255) PRIMARY KEY,
                    guild_id VARCHAR(255),
                    user VARCHAR(255),
                    closed_at BIGINT,
                    messages JSON
                )
            `);
            await query(`
                CREATE TABLE IF NOT EXISTS trusted_ips (
                    ip VARCHAR(255) PRIMARY KEY,
                    user_id VARCHAR(255),
                    username VARCHAR(255),
                    avatar VARCHAR(255),
                    last_login DATETIME
                )
            `);
            console.log('✅ [STARTUP] TiDB Schema ready.');
        } catch (dbErr) {
            console.error('❌ [STARTUP] TiDB Schema initialization failed:', dbErr);
        }
    })();
} catch (err) {
    console.error('❌ [ERROR] Data initialization failed:', err);
}

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
    // Memory Management: Clear caches periodically
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
    console.log(`✅ [BOT] Online as ${client.user.tag}`);
    console.log(`📡 [BOT] Monitoring ${client.guilds.cache.size} guilds`);
    
    // Cache invites and members safely
    (async () => {
        for (const guild of client.guilds.cache.values()) {
            try {
                // Fetch invites
                const invites = await guild.invites.fetch();
                client.invites.set(guild.id, new Map(invites.map(inv => [inv.code, inv.uses])));
                console.log(`📦 [CACHE] Loaded ${invites.size} invites for ${guild.name}`);

                // Optimization: Don't fetch all members on startup to avoid rate limits
                // The dashboard will handle fetching if the cache is empty
                console.log(`👥 [CACHE] Skip full member fetch for ${guild.name} to avoid rate limits. Cache size: ${guild.members.cache.size}`);
            } catch (err) {
                console.warn(`⚠️ [CACHE] Could not fetch data for ${guild.name}: ${err.message}`);
            }
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
                if (command.data && command.execute) {
                    client.commands.set(command.data.name, command);
                    console.log(`⚙️ [LOAD] Command: ${command.data.name}`);
                }
            } catch (err) {
                console.error(`❌ [LOAD] Failed command ${itemPath}:`, err.message);
            }
        }
    }
}
loadCommands(foldersPath);

const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            const event = require(filePath);
            const executeEvent = async (...args) => {
                try { 
                    await event.execute(...args); 
                } catch (error) { 
                    console.error(`❌ [EVENT ERROR] ${event.name}:`, error); 
                }
            };
            if (event.once) client.once(event.name, executeEvent);
            else client.on(event.name, executeEvent);
            console.log(`⚙️ [LOAD] Event: ${event.name || file}`);
        } catch (err) {
            console.error(`❌ [LOAD] Failed event ${file}:`, err.message);
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
   LOGIN
================================ */
client.login(TOKEN).catch(err => {
    console.error('❌ [FATAL] Discord login failed:', err);
    process.exit(1);
});

/* ===============================
   EXPRESS SERVER & KEEP-ALIVE
================================ */
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const dashboardApi = require('./routes/dashboardApi');

const app = express();
const PORT = process.env.PORT || 8000;

// Session middleware for authentication with persistent file store
const sessionStore = new FileStore({
    path: path.join(__dirname, 'data', 'sessions'),
    ttl: 30 * 24 * 60 * 60, // 30 days in seconds
    reapInterval: 3600, // Clean up expired sessions every hour
    retries: 0
});

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'supreme-bot-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days for trusted IPs
    }
}));

console.log('📦 [SESSION] File-based session store initialized (30-day persistence)');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for correct IP detection (required for Koyeb)
app.set('trust proxy', 1);

// Store client in app locals for API routes
app.locals.client = client;

// Dashboard API routes
app.use('/api/dashboard', dashboardApi);

// Serve static files for the React dashboard
const dashboardDistPath = path.join(__dirname, 'dashboard', 'dist');
if (fs.existsSync(dashboardDistPath)) {
    // Serve static assets with a trailing slash redirect
    app.use('/dashboard', express.static(dashboardDistPath, { index: false }));
    
    // Handle the dashboard root specifically
    app.get('/dashboard', (req, res) => {
        res.sendFile(path.join(dashboardDistPath, 'index.html'));
    });

    // SPA fallback: for any route under /dashboard, serve the dashboard's index.html
    app.get('/dashboard/*', (req, res) => {
        // If it's a request for a file that doesn't exist, still serve index.html for React Router
        const filePath = path.join(dashboardDistPath, req.params[0]);
        if (fs.existsSync(filePath) && !req.path.endsWith('/')) {
            res.sendFile(filePath);
        } else {
            res.sendFile(path.join(dashboardDistPath, 'index.html'));
        }
    });
}

// Redirect root to dashboard
app.get('/', (req, res) => {
    if (fs.existsSync(dashboardDistPath)) {
        res.redirect('/dashboard');
    } else {
        const isDiscordReady = client.isReady();
        res.status(isDiscordReady ? 200 : 503).json({
            status: isDiscordReady ? 'online' : 'starting',
            discord: isDiscordReady ? 'connected' : 'disconnected',
            bot: client.user ? client.user.tag : 'Starting...',
            uptime: Math.floor(process.uptime()),
            memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
            timestamp: new Date().toISOString(),
            message: 'Dashboard not built yet. Run: cd dashboard && npm run build'
        });
    }
});

app.get('/health', (req, res) => {
    const isDiscordReady = client.isReady();
    res.status(isDiscordReady ? 200 : 503).json({ 
        status: isDiscordReady ? 'healthy' : 'degraded', 
        discord: isDiscordReady ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString() 
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [SERVER] Running on port ${PORT}`);
    
    const PUBLIC_URL = process.env.KOYEB_PUBLIC_URL || process.env.PUBLIC_URL;
    if (PUBLIC_URL) {
        console.log(`🔗 [KEEP-ALIVE] Self-ping enabled for: ${PUBLIC_URL}`);
        setInterval(async () => {
            try {
                const response = await axios.get(PUBLIC_URL, { timeout: 10000 });
                console.log(`💓 [KEEP-ALIVE] Heartbeat: ${response.status} OK`);
            } catch (err) {
                console.error('💔 [KEEP-ALIVE] Heartbeat failed:', err.message);
            }
        }, 300000); // Every 5 minutes
    } else {
        console.log('⚠️ [KEEP-ALIVE] KOYEB_PUBLIC_URL not set. Self-ping disabled.');
    }
});
