#!/usr/bin/env node
/**
 * Database Connection Test Script
 * Run this to verify TiDB connection and check invite data
 */

const { query } = require('./utils/db');

async function testConnection() {
    console.log('🔍 Testing TiDB Connection...\n');
    
    try {
        // Test 1: Basic connection
        console.log('Test 1: Basic Connection');
        const result = await query('SELECT 1 as test');
        console.log('✅ Connection successful:', result);
        console.log('');
        
        // Test 2: Check invites table
        console.log('Test 2: Check invites table structure');
        const tableInfo = await query('DESCRIBE invites');
        console.log('✅ Invites table structure:');
        console.table(tableInfo);
        console.log('');
        
        // Test 3: Check join_history table
        console.log('Test 3: Check join_history table structure');
        const joinHistoryInfo = await query('DESCRIBE join_history');
        console.log('✅ Join history table structure:');
        console.table(joinHistoryInfo);
        console.log('');
        
        // Test 4: Count records
        console.log('Test 4: Count records in tables');
        const inviteCount = await query('SELECT COUNT(*) as count FROM invites');
        const joinHistoryCount = await query('SELECT COUNT(*) as count FROM join_history');
        console.log(`✅ Invites table: ${inviteCount[0].count} records`);
        console.log(`✅ Join history table: ${joinHistoryCount[0].count} records`);
        console.log('');
        
        // Test 5: Show sample data from invites
        console.log('Test 5: Sample data from invites table (top 10)');
        const sampleInvites = await query('SELECT * FROM invites LIMIT 10');
        if (sampleInvites.length > 0) {
            console.table(sampleInvites);
        } else {
            console.log('⚠️  No data found in invites table');
        }
        console.log('');
        
        // Test 6: Show sample data from join_history
        console.log('Test 6: Sample data from join_history table (top 10)');
        const sampleJoinHistory = await query('SELECT * FROM join_history LIMIT 10');
        if (sampleJoinHistory.length > 0) {
            console.table(sampleJoinHistory);
        } else {
            console.log('⚠️  No data found in join_history table');
        }
        console.log('');
        
        // Test 7: Check for specific guild (if provided)
        if (process.argv[2]) {
            const guildId = process.argv[2];
            console.log(`Test 7: Check data for guild ${guildId}`);
            const guildInvites = await query('SELECT * FROM invites WHERE guild_id = ?', [guildId]);
            const guildJoinHistory = await query('SELECT * FROM join_history WHERE guild_id = ?', [guildId]);
            console.log(`✅ Guild invites: ${guildInvites.length} records`);
            console.log(`✅ Guild join history: ${guildJoinHistory.length} records`);
            
            if (guildInvites.length > 0) {
                console.log('\nGuild invite data:');
                console.table(guildInvites);
            }
            
            if (guildJoinHistory.length > 0) {
                console.log('\nGuild join history:');
                console.table(guildJoinHistory);
            }
        }
        
        console.log('\n✅ All tests passed! Database is working correctly.');
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
    
    process.exit(0);
}

// Run the test
testConnection();
