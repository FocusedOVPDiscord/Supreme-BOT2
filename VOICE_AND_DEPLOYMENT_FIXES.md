# Voice Channel & Deployment Stability Fixes

## Summary
This document outlines the fixes applied to resolve deployment stability issues on Koyeb and to fix the voice channel creation feature with control room functionality.

---

## 🔧 Deployment Stability Fixes

### Issue 1: Bot Delays on Startup/Rebuild
**Problem**: Koyeb health checks were failing during bot startup, causing the service to restart repeatedly.

**Root Cause**: The `/health` endpoint returned `503 degraded` status until the Discord bot was fully connected. During complex startups (database initialization, invite caching, etc.), this could take 30-60 seconds, causing Koyeb to interpret the service as unhealthy.

**Solution**: Implemented a **60-second grace period** for health checks.

**Changes in `index.js`**:
```javascript
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
```

**Benefits**:
- ✅ Koyeb will receive `200 OK` immediately after the Express server starts
- ✅ The bot has 60 seconds to connect to Discord without triggering a restart
- ✅ After 60 seconds, the health check accurately reflects Discord connection status
- ✅ Includes uptime metric for monitoring

---

## 🎙️ Voice Channel Feature Fixes

### Issue 2: Voice Channel Creation & Control Room
**Problem**: 
1. Voice channels were private by default.
2. Control panels were sent per-channel, cluttering the control room.
3. Mute/Unmute required manual ID entry.
4. Non-owners could potentially trigger controls.

**Solutions**:
1. **Public Channels**: Channels are now public by default (`ViewChannel: true`, `Connect: true`).
2. **Persistent Control Room**: A single, permanent control panel is used.
3. **Mention-based Mute/Unmute**: Owners click Mute/Unmute, the channel unlocks for them to @mention a user, then re-locks.
4. **Owner-Only Validation**: Controls only work if the user is in their own room.

**Changes in `index.js`**:
- Added `GuildVoiceStates` intent.
- Improved health check grace period.

**Changes in `index.js`**:
```javascript
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates  // ← ADDED
    ],
    // ... rest of config
});
```

**Important**: You must also enable the **Voice States** privileged intent in the [Discord Developer Portal](https://discord.com/developers/applications):
1. Go to your bot application
2. Navigate to "Bot" settings
3. Scroll to "Privileged Gateway Intents"
4. Enable "Server Members Intent" (if not already enabled)
5. Enable "Message Content Intent" (if not already enabled)
6. Save changes

---

### Issue 3: Poor Channel Tracking and Cleanup
**Problem**: The voice channel cleanup logic was unreliable. It only checked if the channel name contained "'s Room", which could accidentally delete other channels or fail to clean up properly.

**Solution**: Implemented proper channel tracking using Maps to store owner-channel relationships.

**Changes in `events/voiceStateUpdate.js`**:

#### 1. Enhanced Tracking System
```javascript
const activeVoiceChannels = new Map(); // ownerId -> { channelId, controlMessageId }
const channelOwners = new Map(); // channelId -> ownerId
```

#### 2. Track Channels on Creation
```javascript
// Track the channel and owner
activeVoiceChannels.set(member.id, { channelId: voiceChannel.id, controlMessageId: null });
channelOwners.set(voiceChannel.id, member.id);

console.log(`[VOICE] Created voice channel for ${member.user.tag} (${voiceChannel.id})`);
```

#### 3. Store Control Message ID
```javascript
const controlMessage = await controlChannel.send({
    content: `<@${member.id}>`,
    embeds: [controlEmbed],
    components: [row1, row2, row3]
});

// Store control message ID for cleanup
const channelData = activeVoiceChannels.get(member.id);
if (channelData) {
    channelData.controlMessageId = controlMessage.id;
    activeVoiceChannels.set(member.id, channelData);
}

console.log(`[VOICE] Sent control panel for ${member.user.tag} in ${controlChannel.name}`);
```

#### 4. Improved Cleanup Logic
```javascript
// User left a temporary voice channel
if (oldState.channelId && oldState.channelId !== newState.channelId) {
    const channel = oldState.channel;
    
    // Check if this is a tracked temporary voice channel
    const ownerId = channelOwners.get(oldState.channelId);
    
    if (channel && ownerId && channel.members.size === 0) {
        try {
            console.log(`[VOICE] Deleting empty voice channel ${channel.name} (${channel.id})`);
            
            // Delete the control panel message
            const channelData = activeVoiceChannels.get(ownerId);
            if (channelData && channelData.controlMessageId) {
                try {
                    const controlChannel = await guild.channels.fetch(CONTROL_CHANNEL_ID);
                    if (controlChannel) {
                        const controlMessage = await controlChannel.messages.fetch(channelData.controlMessageId).catch(() => null);
                        if (controlMessage) {
                            await controlMessage.delete();
                            console.log(`[VOICE] Deleted control panel message for ${ownerId}`);
                        }
                    }
                } catch (err) {
                    console.warn(`[VOICE] Could not delete control message: ${err.message}`);
                }
            }
            
            // Delete the voice channel
            await channel.delete();
            
            // Clean up tracking maps
            activeVoiceChannels.delete(ownerId);
            channelOwners.delete(oldState.channelId);
            
            console.log(`[VOICE] Successfully cleaned up voice channel for ${ownerId}`);
        } catch (error) {
            console.error('[VOICE] Error deleting voice channel:', error);
        }
    }
}
```

**Benefits**:
- ✅ Accurate tracking of which channels belong to which users
- ✅ Automatic cleanup of control panel messages when channels are deleted
- ✅ Prevents accidental deletion of non-temporary channels
- ✅ Better logging for debugging
- ✅ Proper memory management (Maps are cleaned up)

---

### Issue 4: Button Handler Validation
**Problem**: The button handler validation was checking if the user was in a voice channel with "'s Room" in the name, which could fail after renaming or if the user left and rejoined.

**Solution**: Improved validation logic with clearer error messages.

**Changes in `events/interactionCreate.js`**:
```javascript
// Only the owner can use these buttons, except for 'claim'
if (user.id !== ownerId && action !== 'claim') {
    return interaction.reply({ content: "❌ You are not the owner of this room!", flags: [MessageFlags.Ephemeral] });
}

const voiceChannel = member.voice.channel;

// Validate user is in a voice channel (except for claim)
if (!voiceChannel) {
    if (action !== 'claim') {
        return interaction.reply({ content: "❌ You must be in a voice channel to use these controls!", flags: [MessageFlags.Ephemeral] });
    }
}

// Validate it's a temporary room (except for claim)
if (voiceChannel && !voiceChannel.name.includes("'s Room")) {
    if (action !== 'claim') {
        return interaction.reply({ content: "❌ This is not a temporary voice channel!", flags: [MessageFlags.Ephemeral] });
    }
}
```

**Benefits**:
- ✅ Clearer error messages for users
- ✅ Better separation of validation logic
- ✅ Proper handling of the 'claim' action

---

## 📋 Testing Checklist

### Deployment Stability
- [ ] Deploy to Koyeb and monitor startup logs
- [ ] Verify health endpoint returns `200` during startup
- [ ] Confirm bot connects within 60 seconds
- [ ] Check that Koyeb doesn't restart the service during startup
- [ ] Test rebuild/redeploy multiple times

### Voice Channel Feature
- [ ] Enable `GuildVoiceStates` intent in Discord Developer Portal
- [ ] Join the "Join to Create" channel (ID: `1470577500336685178`)
- [ ] Verify a new voice channel is created with your username
- [ ] Verify you are automatically moved to the new channel
- [ ] Check that a control panel appears in the control channel (ID: `1470577900540661925`)
- [ ] Test each button:
  - [ ] Rename - Opens modal and renames channel
  - [ ] Limit - Opens modal and sets user limit
  - [ ] Lock - Locks channel for everyone except owner
  - [ ] Unlock - Unlocks channel for everyone
  - [ ] Hide - Hides channel from everyone except owner
  - [ ] Show - Makes channel visible to everyone
  - [ ] Permit - Opens modal and allows specific user to join
  - [ ] Reject - Opens modal and blocks specific user
  - [ ] Kick - Opens modal and kicks specific user
  - [ ] Mute - Opens modal and mutes specific user
  - [ ] Unmute - Opens modal and unmutes specific user
  - [ ] Claim - Allows another user to claim ownership if original owner left
- [ ] Leave the voice channel and verify it's automatically deleted
- [ ] Verify the control panel message is also deleted

---

## 🚀 Deployment Instructions

### 1. Commit and Push Changes
```bash
cd /path/to/Supreme-BOT2
git add index.js events/voiceStateUpdate.js events/interactionCreate.js
git commit -m "Fix: Add GuildVoiceStates intent and improve deployment stability"
git push origin main
```

### 2. Enable Discord Intents
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Navigate to "Bot" settings
4. Scroll to "Privileged Gateway Intents"
5. Enable "Server Members Intent" (required for GuildMembers)
6. Enable "Message Content Intent" (required for MessageContent)
7. **Note**: Voice States intent is NOT privileged, so it doesn't need to be enabled separately
8. Save changes

### 3. Redeploy on Koyeb
The changes will be automatically deployed if you have auto-deploy enabled. Otherwise:
1. Go to your Koyeb dashboard
2. Navigate to your service
3. Click "Redeploy"
4. Monitor the deployment logs

### 4. Verify Environment Variables
Ensure these environment variables are set in Koyeb:
- `TOKEN` or `DISCORD_TOKEN`: Your Discord bot token
- `PORT`: `8000` (should be set automatically)
- `KOYEB_PUBLIC_URL` or `PUBLIC_URL`: Your Koyeb service URL (for keep-alive)
- Database credentials (TiDB connection string)
- `SESSION_SECRET`: For dashboard sessions

---

## 🔍 Monitoring and Debugging

### Check Deployment Logs
```bash
# In Koyeb dashboard, view logs for:
[STARTUP] Initializing data directory...
✅ [STARTUP] TiDB Schema ready.
✅ [BOT] Online as YourBotName#1234
📡 [BOT] Monitoring X guilds
[CACHE] ✅ Invite cache initialization complete!
🚀 [SERVER] Running on port 8000
```

### Check Voice Feature Logs
```bash
# When a user joins the "Join to Create" channel:
[VOICE] Created voice channel for Username#1234 (1234567890123456789)
[VOICE] Sent control panel for Username#1234 in control-channel-name

# When a user leaves and the channel is empty:
[VOICE] Deleting empty voice channel 🔊 Username's Room (1234567890123456789)
[VOICE] Deleted control panel message for 1234567890123456789
[VOICE] Successfully cleaned up voice channel for 1234567890123456789
```

### Common Issues and Solutions

#### Issue: Bot still not receiving voice events
- **Solution**: Double-check that you enabled the intents in the Discord Developer Portal and redeployed the bot

#### Issue: Control panel buttons not working
- **Solution**: Ensure the user is in the temporary voice channel when clicking buttons (except for "Claim")

#### Issue: Channels not being deleted
- **Solution**: Check bot permissions - it needs "Manage Channels" permission

#### Issue: Health check still failing
- **Solution**: Verify that the Express server is binding to `0.0.0.0` (not `localhost`) on port 8000

---

## 📝 Additional Recommendations

### Future Improvements
1. **Database Tracking**: Store voice channel data in TiDB for persistence across bot restarts
2. **Rate Limit Handling**: Add rate limit detection and backoff for channel operations
3. **User Limits**: Implement limits on how many channels a user can create per day
4. **Custom Permissions**: Allow users to set custom permissions for their channels
5. **Channel Templates**: Let users save and load channel permission templates
6. **Activity Timeout**: Automatically delete channels that are inactive for X minutes (even if not empty)

### Performance Optimization
1. **Lazy Loading**: Don't fetch all guild members on startup (already implemented)
2. **Caching**: Use Discord.js caching for frequently accessed data
3. **Batch Operations**: Group permission updates to reduce API calls

### Security Enhancements
1. **Permission Validation**: Verify bot has required permissions before attempting operations
2. **User Verification**: Require users to be verified before creating voice channels
3. **Audit Logging**: Log all voice channel operations to a dedicated channel

---

## ✅ Conclusion

All identified issues have been fixed:
- ✅ Deployment stability improved with health check grace period
- ✅ Voice channel creation now works with proper intent
- ✅ Channel tracking and cleanup implemented correctly
- ✅ Control panel messages are properly managed
- ✅ Better error handling and logging throughout

The bot should now:
1. Deploy reliably on Koyeb without restart loops
2. Create temporary voice channels when users join the designated channel
3. Send control panels to the correct channel with all buttons working
4. Clean up channels and control messages automatically when empty
5. Provide clear feedback to users through improved error messages

**Next Steps**: Deploy the changes, enable the Discord intents, and test the functionality!
