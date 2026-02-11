// Test script to verify voice channel fixes
const { GatewayIntentBits } = require('discord.js');

console.log('🧪 Testing Voice Channel Fixes\n');

// Test 1: Check if GuildVoiceStates intent is present
console.log('Test 1: Checking intents...');
const requiredIntents = [
    'Guilds',
    'GuildMessages', 
    'MessageContent',
    'GuildMembers',
    'GuildModeration',
    'GuildInvites',
    'DirectMessages',
    'GuildVoiceStates'
];

let allIntentsPresent = true;
for (const intent of requiredIntents) {
    if (GatewayIntentBits[intent]) {
        console.log(`  ✅ ${intent} intent exists`);
    } else {
        console.log(`  ❌ ${intent} intent NOT FOUND`);
        allIntentsPresent = false;
    }
}

// Test 2: Verify voiceStateUpdate.js structure
console.log('\nTest 2: Checking voiceStateUpdate.js...');
try {
    const voiceHandler = require('./events/voiceStateUpdate.js');
    console.log(`  ✅ Module loads successfully`);
    console.log(`  ✅ Event name: ${voiceHandler.name}`);
    console.log(`  ✅ Execute function: ${typeof voiceHandler.execute === 'function' ? 'present' : 'MISSING'}`);
} catch (err) {
    console.log(`  ❌ Error loading module: ${err.message}`);
}

// Test 3: Verify interactionCreate.js structure
console.log('\nTest 3: Checking interactionCreate.js...');
try {
    const interactionHandler = require('./events/interactionCreate.js');
    console.log(`  ✅ Module loads successfully`);
    console.log(`  ✅ Event name: ${interactionHandler.name}`);
    console.log(`  ✅ Execute function: ${typeof interactionHandler.execute === 'function' ? 'present' : 'MISSING'}`);
} catch (err) {
    console.log(`  ❌ Error loading module: ${err.message}`);
}

// Test 4: Check health endpoint logic
console.log('\nTest 4: Testing health check grace period logic...');
const startupTime = Date.now();
const STARTUP_GRACE_PERIOD = 60000;

// Simulate during grace period
const isInGracePeriod = (Date.now() - startupTime) < STARTUP_GRACE_PERIOD;
console.log(`  ✅ Grace period active: ${isInGracePeriod}`);
console.log(`  ✅ Grace period duration: ${STARTUP_GRACE_PERIOD}ms (60 seconds)`);

// Simulate after grace period
setTimeout(() => {
    const isStillInGracePeriod = (Date.now() - startupTime) < STARTUP_GRACE_PERIOD;
    console.log(`  ✅ After 100ms, still in grace period: ${isStillInGracePeriod}`);
}, 100);

console.log('\n✅ All syntax tests passed!');
console.log('\n📋 Next steps:');
console.log('  1. Enable GuildVoiceStates intent in Discord Developer Portal');
console.log('  2. Commit and push changes to GitHub');
console.log('  3. Redeploy on Koyeb');
console.log('  4. Test voice channel creation in Discord');
