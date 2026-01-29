const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reloads commands and events without restarting the bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const client = interaction.client;
        let report = '';

        // 1. Reload Commands
        try {
            const foldersPath = path.join(__dirname, '..');
            const commandFolders = fs.readdirSync(foldersPath);

            for (const folder of commandFolders) {
                const commandsPath = path.join(foldersPath, folder);
                if (!fs.statSync(commandsPath).isDirectory()) continue;
                
                const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
                for (const file of commandFiles) {
                    const filePath = path.join(commandsPath, file);
                    
                    // Delete from cache
                    delete require.cache[require.resolve(filePath)];
                    
                    try {
                        const newCommand = require(filePath);
                        if ('data' in newCommand && 'execute' in newCommand) {
                            client.commands.set(newCommand.data.name, newCommand);
                        }
                    } catch (error) {
                        console.error(`[RELOAD] Error reloading command ${file}:`, error);
                    }
                }
            }
            report += '✅ Commands reloaded successfully.\n';
        } catch (error) {
            report += '❌ Error reloading commands.\n';
            console.error(error);
        }

        // 2. Reload Application Manager (Special case since it's used in events)
        try {
            const appManagerPath = path.resolve(__dirname, '../../applicationManager.js');
            delete require.cache[require.resolve(appManagerPath)];
            // We don't need to re-require it here, but the next time an event calls it, 
            // it will use the fresh version if the event handler is also reloaded or uses the required module.
            report += '✅ Application Manager reloaded.\n';
        } catch (error) {
            report += '❌ Error reloading Application Manager.\n';
        }

        await interaction.editReply({ content: report + '\n*Note: Event listeners attached at startup cannot be fully re-registered without a restart, but the logic inside them will update if they require reloaded modules.*' });
    },
};
