const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --- 🛠️ CONFIGURATION (CHANGE THESE!) ---
const CLIENT_ID = '1457608566604304506'; // Your Bot's ID
const GUILD_ID = '1354399868851978322';     // Your Server's ID
// ----------------------------------------

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        }
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`[INFO] Started refreshing ${commands.length} application (/) commands for GUILD: ${GUILD_ID}`);

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        console.log(`[SUCCESS] Successfully reloaded application (/) commands for your server!`);
    } catch (error) {
        console.error(`[ERROR] ${error}`);
    }
})();