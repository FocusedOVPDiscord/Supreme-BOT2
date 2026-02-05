require('dotenv').config();
const http = require('http');
const { Client, GatewayIntentBits, Collection, REST, Routes, Events } = require('discord.js');
const db = require('./utils/database');

// --- KOYEB HEALTH CHECK SERVER ---
const PORT = process.env.PORT || 8000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'online', timestamp: new Date().toISOString() }));
}).listen(PORT, () => {
    console.log(`🚀 [HEALTH CHECK] Server listening on port ${PORT}`);
});
// ---------------------------------
const ai = require('./utils/ai');
const commandsList = require('./commands');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();
const commandsData = [];

console.log(`[DEBUG] Loading ${commandsList.length} commands...`);
for (const command of commandsList) {
    client.commands.set(command.data.name, command);
    commandsData.push(command.data.toJSON());
    console.log(`[DEBUG] Loaded command: ${command.data.name}`);
}

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ [ERROR] DISCORD_TOKEN is not defined in environment variables!');
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
    try {
        console.log('🔄 Registering slash commands...');
        if (process.env.DISCORD_GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
                { body: commandsData }
            );
            console.log(`✅ Synced commands to guild ${process.env.DISCORD_GUILD_ID}`);
        } else {
            await rest.put(
                Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
                { body: commandsData }
            );
            console.log('✅ Synced commands globally');
        }
    } catch (error) {
        console.error('❌ Command registration error:', error);
    }
}

client.once(Events.ClientReady, async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    await registerCommands();
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: '❌ Error executing command!', ephemeral: true });
    }
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;
    const ticketPattern = /^ticket-(\d{4})$/i;
    if (!ticketPattern.test(message.channel.name)) return;
    const ticketId = message.channel.name.toLowerCase();
    db.addConversation(ticketId, message.author.id, message.content);
    try {
        await message.channel.sendTyping();
        const match = db.searchSimilar(message.content);
        let response;
        if (match) {
            response = match.response;
            db.incrementUsage(match.id);
        } else {
            response = await ai.generateResponse(message.content);
        }
        if (response) {
            await message.reply({ content: response, allowedMentions: { repliedUser: false } });
            db.addConversation(ticketId, client.user.id, response, 1);
        }
    } catch (error) {
        console.error('Ticket Listener Error:', error);
    }
});

console.log('[DEBUG] Attempting Discord login...');
client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log('🚀 [DEBUG] client.login() successful'))
    .catch(err => {
        console.error('❌ [ERROR] Discord login failed:');
        console.error(err);
    });
