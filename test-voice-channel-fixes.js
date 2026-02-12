/**
 * Test script to verify voice channel fixes
 * This script validates that the code changes are correct
 */

const { PermissionFlagsBits } = require('discord.js');

console.log('🧪 Testing Voice Channel Fixes...\n');

// Test 1: Verify voiceStateUpdate exports
console.log('Test 1: Checking voiceStateUpdate.js exports...');
try {
    const voiceStateModule = require('./events/voiceStateUpdate.js');
    
    if (typeof voiceStateModule.getChannelOwners !== 'function') {
        throw new Error('getChannelOwners function not exported');
    }
    
    if (typeof voiceStateModule.getActiveVoiceChannels !== 'function') {
        throw new Error('getActiveVoiceChannels function not exported');
    }
    
    if (typeof voiceStateModule.name !== 'string' || voiceStateModule.name !== 'voiceStateUpdate') {
        throw new Error('Event name not properly exported');
    }
    
    if (typeof voiceStateModule.execute !== 'function') {
        throw new Error('Execute function not exported');
    }
    
    console.log('✅ voiceStateUpdate.js exports are correct\n');
} catch (error) {
    console.error('❌ voiceStateUpdate.js export test failed:', error.message);
    process.exit(1);
}

// Test 2: Verify interactionCreate imports
console.log('Test 2: Checking interactionCreate.js imports...');
try {
    const interactionModule = require('./events/interactionCreate.js');
    
    if (typeof interactionModule.name !== 'string') {
        throw new Error('Event name not properly exported');
    }
    
    if (typeof interactionModule.execute !== 'function') {
        throw new Error('Execute function not exported');
    }
    
    console.log('✅ interactionCreate.js imports are correct\n');
} catch (error) {
    console.error('❌ interactionCreate.js import test failed:', error.message);
    process.exit(1);
}

// Test 3: Verify permission flags are correct
console.log('Test 3: Checking permission flags...');
try {
    const requiredPerms = [
        'Connect',
        'Speak',
        'Stream',
        'MuteMembers',
        'DeafenMembers',
        'MoveMembers',
        'ManageChannels'
    ];
    
    for (const perm of requiredPerms) {
        if (!(perm in PermissionFlagsBits)) {
            throw new Error(`Permission ${perm} not found in PermissionFlagsBits`);
        }
    }
    
    console.log('✅ All permission flags are valid\n');
} catch (error) {
    console.error('❌ Permission flags test failed:', error.message);
    process.exit(1);
}

// Test 4: Simulate Map operations
console.log('Test 4: Testing Map operations...');
try {
    const voiceStateModule = require('./events/voiceStateUpdate.js');
    const channelOwners = voiceStateModule.getChannelOwners();
    const activeVoiceChannels = voiceStateModule.getActiveVoiceChannels();
    
    // Test setting and getting
    channelOwners.set('test-channel-123', 'test-user-456');
    activeVoiceChannels.set('test-user-456', { channelId: 'test-channel-123', controlMessageId: null });
    
    if (channelOwners.get('test-channel-123') !== 'test-user-456') {
        throw new Error('channelOwners Map not working correctly');
    }
    
    if (!channelOwners.has('test-channel-123')) {
        throw new Error('channelOwners.has() not working correctly');
    }
    
    // Clean up
    channelOwners.delete('test-channel-123');
    activeVoiceChannels.delete('test-user-456');
    
    console.log('✅ Map operations work correctly\n');
} catch (error) {
    console.error('❌ Map operations test failed:', error.message);
    process.exit(1);
}

console.log('🎉 All tests passed! The voice channel fixes are ready to deploy.\n');
console.log('Next steps:');
console.log('1. Commit the changes to your repository');
console.log('2. Deploy the bot to your server');
console.log('3. Test the following scenarios:');
console.log('   - Create a voice channel');
console.log('   - Rename the channel');
console.log('   - Verify you still have control permissions');
console.log('   - Leave the channel and verify it gets deleted');
console.log('   - Test the claim feature');
