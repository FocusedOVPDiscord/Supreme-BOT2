const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];
// Use the current directory where the script is running
const commandsPath = path.join(__dirname, 'commands');

console.log(`[DEBUG] Looking for commands in: ${commandsPath}`);

if (!fs.existsSync(commandsPath)) {
    console.error(`[ERROR] Commands directory NOT FOUND at: ${commandsPath}`);
    process.exit(1);
}

// Recursive function to find all .js files in all subfolders
function findCommands(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.lstatSync(filePath);

        if (stat.isDirectory()) {
            findCommands(filePath); // Look inside subfolder
        } else if (file.endsWith('.js')) {
            try {
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                    console.log(`[SUCCESS] Loaded command: ${command.data.name} from ${file}`);
                } else {
                    console.log(`[SKIP] ${file} is missing data or execute.`);
                }
            } catch (err) {
                console.error(`[ERROR] Could not load ${file}: ${err.message}`);
            }
        }
    }
}

findCommands(commandsPath);

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`[INFO] Started refreshing ${commands.length} application (/) commands.`);

        // We deploy GLOBALLY so it works in all servers
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`[SUCCESS] Successfully reloaded ${data.length} application (/) commands.`);
        console.log("--------------------------------------------------");
        console.log("IF YOU DON'T SEE THE COMMANDS IN DISCORD:");
        console.log("1. Restart your Discord client (Ctrl+R).");
        console.log("2. Make sure the CLIENT_ID in your .env is correct.");
        console.log("--------------------------------------------------");
    } catch (error) {
        console.error(`[FATAL ERROR] ${error.message}`);
    }
})();
