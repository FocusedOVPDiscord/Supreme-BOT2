const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    Collection, 
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const axios = require('axios');
const { initializeDataDirectory } = require('./dataInit');
const { query } = require('./utils/db');
const { fixDatabase } = require('./fix_db');
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
console.log('🔑 [TOKEN] Token loaded, length:', TOKEN.length, 'chars');
if (TOKEN.length < 50) {
    console.error('❌ [ERROR] Token is too short - likely invalid or truncated');
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
                    has_left BOOLEAN DEFAULT 0,
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
            await query(`
                CREATE TABLE IF NOT EXISTS applications (
                    user_id VARCHAR(255) PRIMARY KEY,
                    status VARCHAR(50) DEFAULT 'pending',
                    submitted_at BIGINT,
                    answers JSON
                )
            `);
            // Note: ai_config and ai_memory tables are created by migrateToTiDB.js
            // This ensures correct schema (VARCHAR not ENUM for TiDB compatibility)
            console.log('✅ [STARTUP] TiDB Schema ready (AI tables handled by migration).');
            
            // Run migration to add missing columns if table already existed
            await fixDatabase();
            
            // Run staff info migration
            const { migrateStaffInfo } = require('./migrations/add_staff_info');
            await migrateStaffInfo();
            
            // Run email verification migration
            const migrateEmailVerification = require('./migrations/add_email_verification');
            await migrateEmailVerification();
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
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates
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
    
    // CRITICAL FIX: Cache invites BEFORE the bot is fully ready
    // This prevents race conditions where members join before cache is loaded
    console.log('[CACHE] Starting invite cache initialization...');
    try {
        for (const guild of client.guilds.cache.values()) {
            try {
                // Fetch invites
                const invites = await guild.invites.fetch();
                const inviteMap = new Map(invites.map(inv => [inv.code, inv.uses]));
                
                // Fetch vanity data if available
                if (guild.features.includes('VANITY_URL')) {
                    const vanityData = await guild.fetchVanityData().catch(() => null);
                    if (vanityData) {
                        inviteMap.set('VANITY', vanityData.uses);
                        console.log(`📦 [CACHE] Loaded Vanity URL uses (${vanityData.uses}) for ${guild.name}`);
                    }
                }
                
                client.invites.set(guild.id, inviteMap);
                console.log(`📦 [CACHE] Loaded ${invites.size} invites for ${guild.name}`);

                // Optimization: Don't fetch all members on startup to avoid rate limits
                // The dashboard will handle fetching if the cache is empty
                console.log(`👥 [CACHE] Skip full member fetch for ${guild.name} to avoid rate limits. Cache size: ${guild.members.cache.size}`);
            } catch (err) {
                console.warn(`⚠️ [CACHE] Could not fetch data for ${guild.name}: ${err.message}`);
                // Initialize empty cache for this guild to prevent undefined errors
                client.invites.set(guild.id, new Map());
            }
        }
        console.log('[CACHE] ✅ Invite cache initialization complete!');
    } catch (err) {
        console.error('[CACHE] ❌ Fatal error during cache initialization:', err);
    }

    // --- STICKY NOTES FEATURE ---
    const STICKY_CHANNEL_ID = '1451917967540355189';
    const STICKY_INTERVAL = 10 * 60 * 1000; // 10 minutes
    
    console.log(`[STICKY] Initializing sticky notes for channel ${STICKY_CHANNEL_ID} every 10 minutes.`);
    
    setInterval(async () => {
        try {
            const channel = await client.channels.fetch(STICKY_CHANNEL_ID).catch(() => null);
            if (!channel) {
                console.warn(`[STICKY] Could not find channel ${STICKY_CHANNEL_ID}`);
                return;
            }

            // Translation of the requested message:
            // "Never hand over your items first! Always use a server middleman. 
            // There are always tools like (DDoS - Lag - Crash), always use a middleman to guarantee your rights."
            const stickyMessage = "🚨 **Never hand over your items first! Always use a server middleman.**\n-# There are always tools like (DDoS - Lag - Crash), always use a middleman\n**Always to guarantee your rights!** 🚨";

            // Optional: Delete previous sticky message to keep it at the bottom
            const messages = await channel.messages.fetch({ limit: 10 });
            const lastSticky = messages.find(m => m.author.id === client.user.id && m.content.includes("Never hand over your items first"));
            
            if (lastSticky) {
                await lastSticky.delete().catch(() => null);
            }

            await channel.send(stickyMessage);
            console.log(`[STICKY] Sent sticky message to ${channel.name}`);
        } catch (err) {
            console.error('[STICKY] Error sending sticky message:', err);
        }
    }, STICKY_INTERVAL);

    // --- AUTOMATED PERSISTENT CONTROL ROOM SETUP ---
    const CONTROL_CHANNEL_ID = '1470577900540661925';
    console.log(`[VOICE] Checking for persistent control room in channel ${CONTROL_CHANNEL_ID}...`);
    
    try {
        const controlChannel = await client.channels.fetch(CONTROL_CHANNEL_ID).catch(() => null);
        if (controlChannel) {
            const messages = await controlChannel.messages.fetch({ limit: 50 });
            const existingPanel = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title === '🔊 Supreme Voice Control Room');
            
            if (!existingPanel) {
                console.log('[VOICE] No persistent control panel found. Sending new one...');
                
                const controlEmbed = new EmbedBuilder()
                    .setTitle('🔊 Supreme Voice Control Room')
                    .setDescription('Use the buttons below to manage your temporary voice channel.\n\n' +
                        '**How it works:**\n' +
                        '1. Join the **Join to Create** channel to get your own room.\n' +
                        '2. Use these buttons while you are in **your own** room.\n\n' +
                        '**Controls:**\n' +
                        '📝 **Rename**: Change your room name\n' +
                        '👥 **Limit**: Set user limit (0-99)\n' +
                        '🔒 **Lock**: Prevent others from joining\n' +
                        '🔓 **Unlock**: Allow everyone to join\n' +
                        '👻 **Hide**: Hide channel from everyone\n' +
                        '👁️ **Show**: Make channel visible\n' +
                        '✅ **Permit**: Allow specific user to join\n' +
                        '❌ **Reject**: Block/Kick specific user\n' +
                        '👞 **Kick**: Remove user from channel\n' +
                        '🔇 **Mute**: Mute a user (via @mention)\n' +
                        '🔊 **Unmute**: Unmute a user (via @mention)\n' +
                        '👑 **Claim**: Claim an empty room')
                    .setColor('#2F3136')
                    .setFooter({ text: 'Supreme Voice Control • Persistent Room' })
                    .setTimestamp();

                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`vc_rename_persistent`).setLabel('Rename').setEmoji('<:rename:1470701630180950056>').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`vc_limit_persistent`).setLabel('Limit').setEmoji('<:limit:1470701632148082718>').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`vc_lock_persistent`).setLabel('Lock').setEmoji('<:lock:1470701634140373002>').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`vc_unlock_persistent`).setLabel('Unlock').setEmoji('<:unlock:1470701636111826954>').setStyle(ButtonStyle.Secondary)
                );

                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`vc_hide_persistent`).setLabel('Hide').setEmoji('<:hide:1470701638104121364>').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`vc_show_persistent`).setLabel('Show').setEmoji('<:show:1470701640100614154>').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`vc_permit_persistent`).setLabel('Permit').setEmoji('<:permit:1470701642101194772>').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`vc_reject_persistent`).setLabel('Reject').setEmoji('<:reject:1470701644101885972>').setStyle(ButtonStyle.Danger)
                );

                const row3 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`vc_kick_persistent`).setLabel('Kick').setEmoji('<:kick:1470701646102560828>').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId(`vc_mute_persistent`).setLabel('Mute').setEmoji('<:mute:1470701648103215104>').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`vc_unmute_persistent`).setLabel('Unmute').setEmoji('<:unmute:1470701650103894026>').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`vc_claim_persistent`).setLabel('Claim').setEmoji('<:claim:1470701652104544266>').setStyle(ButtonStyle.Primary)
                );

                await controlChannel.send({
                    embeds: [controlEmbed],
                    components: [row1, row2, row3]
                });
                console.log('[VOICE] ✅ Persistent control panel sent successfully!');
            } else {
                console.log('[VOICE] ✅ Persistent control panel already exists.');
            }
        } else {
            console.warn(`[VOICE] ⚠️ Could not find control channel ${CONTROL_CHANNEL_ID}`);
        }
    } catch (err) {
        console.error('[VOICE] ❌ Error setting up persistent control room:', err);
    }
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
console.log('🔑 [LOGIN] Attempting to login to Discord...');

// Add timeout to detect hanging login
const loginTimeout = setTimeout(() => {
    console.error('⏰ [TIMEOUT] Discord login is taking too long (30s). This usually means:');
    console.error('   1. Token is invalid or bot is disabled in Discord Developer Portal');
    console.error('   2. Network/firewall blocking Discord gateway connection');
    console.error('   3. Discord API is down');
    console.error('🔍 [DEBUG] Token starts with:', TOKEN.substring(0, 20) + '...');
    console.error('🔍 [DEBUG] Token ends with:', '...' + TOKEN.substring(TOKEN.length - 10));
    process.exit(1);
}, 30000);

client.login(TOKEN)
    .then(() => {
        clearTimeout(loginTimeout);
        console.log('✅ [LOGIN] Successfully authenticated with Discord');
    })
    .catch(err => {
        clearTimeout(loginTimeout);
        console.error('❌ [FATAL] Discord login failed:', err.message);
        console.error('🔍 [DEBUG] Token starts with:', TOKEN.substring(0, 20) + '...');
        console.error('🔍 [DEBUG] Token ends with:', '...' + TOKEN.substring(TOKEN.length - 10));
        console.error('🔍 [DEBUG] Full error:', err);
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

// AI API routes
const aiApi = require('./routes/aiApi');
app.use('/api/ai', aiApi);

// Staff Verification API routes
app.set('client', client); // Make Discord client available to routes
const staffApi = require('./routes/staffApi');
app.use('/api/staff', staffApi);

// Email Authentication API routes
const emailAuthApi = require('./routes/emailAuthApi');
app.use('/api/email-auth', emailAuthApi);

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

// Startup timestamp for grace period
const startupTime = Date.now();
const STARTUP_GRACE_PERIOD = 60000; // 60 seconds

app.get('/health', (req, res) => {
    const isDiscordReady = client.isReady();
    const isInGracePeriod = (Date.now() - startupTime) < STARTUP_GRACE_PERIOD;
    
    // Return 200 OK during grace period or when Discord is ready
    // This prevents Koyeb from restarting the service during startup
    const statusCode = (isDiscordReady || isInGracePeriod) ? 200 : 503;
    const status = isDiscordReady ? 'healthy' : (isInGracePeriod ? 'starting' : 'degraded');
    
    res.status(statusCode).json({ 
        status: status,
        discord: isDiscordReady ? 'connected' : 'disconnected',
        uptime: Math.floor(process.uptime()),
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
