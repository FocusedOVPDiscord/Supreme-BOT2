const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    
    try {
        // Read the banner image
        const bannerPath = path.join(__dirname, 'supreme_bot_banner.gif');
        const bannerBuffer = fs.readFileSync(bannerPath);
        const bannerBase64 = `data:image/gif;base64,${bannerBuffer.toString('base64')}`;
        
        console.log('📤 Uploading banner...');
        
        // Update the bot's profile with the banner
        await client.user.setBanner(bannerBase64);
        
        console.log('✅ Banner updated successfully!');
        console.log('🎉 Your bot now has an awesome animated banner!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating banner:', error);
        process.exit(1);
    }
});

const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN;
if (!TOKEN) {
    console.error('❌ TOKEN or DISCORD_TOKEN environment variable is missing');
    process.exit(1);
}

client.login(TOKEN);
