/**
 * Test script for persistence system
 * Run this to verify that data persistence is working correctly
 */

const persistence = require('./persistenceManager');
const inviteManager = require('./inviteManager');
const storage = require('./commands/utility/storage');

console.log('🧪 Starting Persistence System Tests...\n');

// Test 1: Persistence Manager Basic Operations
console.log('Test 1: Persistence Manager Basic Operations');
console.log('─────────────────────────────────────────────');

try {
    // Test write and read
    const testData = { test: 'value', number: 123, nested: { key: 'data' } };
    persistence.write('test-file.json', testData);
    const readData = persistence.read('test-file.json');
    
    if (JSON.stringify(testData) === JSON.stringify(readData)) {
        console.log('✅ Write and read operations work correctly');
    } else {
        console.log('❌ Write/read mismatch');
    }
    
    // Test guild data operations
    persistence.setGuildData('test-file.json', 'guild123', { setting: 'value' });
    const guildData = persistence.getGuildData('test-file.json', 'guild123');
    
    if (guildData.setting === 'value') {
        console.log('✅ Guild data operations work correctly');
    } else {
        console.log('❌ Guild data operation failed');
    }
    
    // Clean up test file
    persistence.delete('test-file.json');
    console.log('✅ Test file cleaned up\n');
    
} catch (error) {
    console.log('❌ Test 1 failed:', error.message, '\n');
}

// Test 2: Invite Manager Persistence
console.log('Test 2: Invite Manager Persistence');
console.log('─────────────────────────────────────────────');

try {
    const testGuildId = 'test-guild-123';
    const testUserId = 'test-user-456';
    
    // Test user data creation
    const userData = inviteManager.getUserData(testGuildId, testUserId);
    console.log('✅ User data retrieved:', userData);
    
    // Test user data update
    inviteManager.updateUser(testGuildId, testUserId, { regular: 5, fake: 2, bonus: 1, left: 0 });
    const updatedData = inviteManager.getUserData(testGuildId, testUserId);
    
    if (updatedData.regular === 5 && updatedData.fake === 2) {
        console.log('✅ User data updates persist correctly');
    } else {
        console.log('❌ User data update failed');
    }
    
    // Test total invites calculation
    const total = inviteManager.getTotalInvites(testGuildId, testUserId);
    console.log(`✅ Total invites calculated: ${total} (should be 6)`);
    
    // Test reset functionality
    inviteManager.resetAll(testGuildId);
    const afterReset = inviteManager.getAllInvites(testGuildId);
    
    if (Object.keys(afterReset).length === 0) {
        console.log('✅ Reset functionality works correctly');
    } else {
        console.log('❌ Reset did not clear data');
    }
    
    console.log('');
    
} catch (error) {
    console.log('❌ Test 2 failed:', error.message, '\n');
}

// Test 3: Storage Utility Persistence
console.log('Test 3: Storage Utility Persistence');
console.log('─────────────────────────────────────────────');

try {
    const testGuildId = 'test-guild-789';
    
    // Test setting storage
    storage.set(testGuildId, 'test_setting', 'test_value');
    const retrieved = storage.get(testGuildId, 'test_setting');
    
    if (retrieved === 'test_value') {
        console.log('✅ Storage set/get works correctly');
    } else {
        console.log('❌ Storage set/get failed');
    }
    
    // Test multiple settings
    storage.setMultiple(testGuildId, {
        setting1: 'value1',
        setting2: 'value2',
        setting3: { nested: 'data' }
    });
    
    const allSettings = storage.getAll(testGuildId);
    
    if (allSettings.setting1 === 'value1' && allSettings.setting2 === 'value2') {
        console.log('✅ Multiple settings storage works correctly');
    } else {
        console.log('❌ Multiple settings storage failed');
    }
    
    // Test delete
    storage.delete(testGuildId, 'test_setting');
    const afterDelete = storage.get(testGuildId, 'test_setting');
    
    if (afterDelete === null) {
        console.log('✅ Storage delete works correctly');
    } else {
        console.log('❌ Storage delete failed');
    }
    
    // Clean up
    storage.clearAll(testGuildId);
    console.log('✅ Test data cleaned up\n');
    
} catch (error) {
    console.log('❌ Test 3 failed:', error.message, '\n');
}

// Test 4: Backup System
console.log('Test 4: Backup System');
console.log('─────────────────────────────────────────────');

try {
    // Create test data
    persistence.write('test-backup.json', { data: 'to backup' });
    
    // Create backup
    persistence.createBackup('test-backup.json');
    console.log('✅ Individual file backup created');
    
    // Create full backup
    const backupDir = persistence.backupAll();
    
    if (backupDir) {
        console.log(`✅ Full backup created at: ${backupDir}`);
    } else {
        console.log('❌ Full backup failed');
    }
    
    // Clean up
    persistence.delete('test-backup.json');
    console.log('✅ Test backup file cleaned up\n');
    
} catch (error) {
    console.log('❌ Test 4 failed:', error.message, '\n');
}

// Test 5: Data Persistence Across "Restarts"
console.log('Test 5: Simulated Restart Persistence');
console.log('─────────────────────────────────────────────');

try {
    const testGuildId = 'restart-test-guild';
    const testUserId = 'restart-test-user';
    
    // Write data
    inviteManager.updateUser(testGuildId, testUserId, { regular: 10, fake: 3, bonus: 2, left: 1 });
    storage.set(testGuildId, 'welcome_config', { channelId: '123', message: 'Welcome!' });
    
    console.log('✅ Data written to disk');
    
    // Simulate reading after restart (direct file read)
    const invitesData = persistence.read('invites.json');
    const settingsData = persistence.read('settings.json');
    
    if (invitesData[testGuildId] && invitesData[testGuildId][testUserId]) {
        console.log('✅ Invite data persists across restart');
        console.log('   Data:', invitesData[testGuildId][testUserId]);
    } else {
        console.log('❌ Invite data not found after restart');
    }
    
    if (settingsData[testGuildId] && settingsData[testGuildId].welcome_config) {
        console.log('✅ Settings data persists across restart');
        console.log('   Data:', settingsData[testGuildId].welcome_config);
    } else {
        console.log('❌ Settings data not found after restart');
    }
    
    // Clean up
    inviteManager.resetAll(testGuildId);
    storage.clearAll(testGuildId);
    console.log('✅ Test data cleaned up\n');
    
} catch (error) {
    console.log('❌ Test 5 failed:', error.message, '\n');
}

// Summary
console.log('═════════════════════════════════════════════');
console.log('🎉 Persistence System Tests Complete!');
console.log('═════════════════════════════════════════════');
console.log('\nIf all tests passed, your persistence system is working correctly!');
console.log('Data will survive bot restarts and /reset-invites commands.\n');
