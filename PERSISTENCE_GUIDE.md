# 🔒 Persistent Data Storage System

## Overview

Your Supreme-BOT2 now has a **comprehensive persistent data storage system** that ensures all data survives bot restarts. No more losing invites, welcome messages, or settings when the bot restarts!

## ✨ What's New

### 1. **Automatic Data Persistence**
- All invite data is automatically saved to disk
- Welcome messages and settings are preserved
- Auto-role configurations persist across restarts
- Giveaway data is maintained

### 2. **Backup System**
- Automatic backups on bot startup
- Backups created before data modifications
- Manual backup command available
- Easy data recovery

### 3. **Enhanced Commands**

#### New Commands:
- `/data-status` - Check the status of all persistent data
- `/backup-data` - Create a manual backup of all data

#### Updated Commands:
- `/reset-invites` - Now permanently clears data (with backup)
- All other commands now use persistent storage

## 📁 File Structure

```
Supreme-BOT2/
├── persistenceManager.js          # Core persistence system
├── inviteManager.js               # Enhanced invite tracking (persistent)
├── dataInit.js                    # Updated initialization
├── commands/utility/
│   ├── storage.js                 # Enhanced storage utility (persistent)
│   ├── data-status.js             # New: Check data status
│   └── backup-data.js             # New: Manual backups
└── data/
    ├── invites.json               # Invite data (auto-saved)
    ├── join-history.json          # Join history (auto-saved)
    ├── settings.json              # Server settings (auto-saved)
    ├── invite-config.json         # Invite configuration
    └── backups/                   # Automatic backups
        └── full_backup_*/         # Timestamped backups
```

## 🔧 How It Works

### Invite Tracking
When someone joins your server:
1. Bot detects the invite used
2. Updates the inviter's statistics
3. **Immediately saves to disk** (invites.json)
4. Data persists even if bot restarts

### Reset Invites
When you use `/reset-invites`:
1. Creates a backup of current data
2. Clears all invite statistics
3. **Saves the cleared state to disk**
4. After restart, invites stay cleared (won't come back)

### Welcome Messages
When you configure welcome messages:
1. Settings are saved to settings.json
2. Channel, banner, and description persist
3. Works immediately after bot restart

## 🛡️ Data Safety Features

### 1. **Atomic Writes**
- Data is written to a temporary file first
- Only moved to final location if successful
- Prevents data corruption

### 2. **Automatic Backups**
- Created on every bot startup
- Created before data modifications
- Stored in `data/backups/` directory

### 3. **Error Recovery**
- If a file is corrupted, restores from backup
- Logs all errors for debugging
- Graceful fallback to default values

## 📊 Using the New Commands

### Check Data Status
```
/data-status
```
Shows:
- Number of users tracked
- Total invites recorded
- Welcome message status
- Auto-role configuration
- Persistence status

### Create Manual Backup
```
/backup-data
```
Creates:
- Full backup of all data files
- Timestamped backup directory
- Confirmation with backup location

### Reset Invites (Enhanced)
```
/reset-invites
```
Now:
- Creates backup before clearing
- Permanently clears data
- Shows number of users affected
- Confirms persistence across restarts

## 🔍 Verifying Persistence

### Test 1: Invite Data
1. Check current invites: `/invites @user`
2. Note the numbers
3. Restart the bot
4. Check again: `/invites @user`
5. ✅ Numbers should be the same

### Test 2: Reset Invites
1. Use `/reset-invites`
2. Verify invites are cleared: `/invite-leaderboard`
3. Restart the bot
4. Check leaderboard again
5. ✅ Invites should still be cleared (not restored)

### Test 3: Welcome Messages
1. Configure welcome: `/setup-welcome`
2. Restart the bot
3. Have someone join
4. ✅ Welcome message should still work

## 🚀 Deployment on justrunmy.app

The persistence system works perfectly with justrunmy.app because:
- All data is stored in the `data/` directory
- Files persist across container restarts
- Backups are automatically created
- No database required

### Important Notes:
1. The `data/` directory must be persistent on your hosting
2. Ensure the bot has write permissions
3. Regular backups are created automatically
4. Check logs for persistence confirmations

## 📝 Logs to Watch

When the bot starts, you should see:
```
[DATA INIT] Initializing data directory with persistence manager...
[PERSISTENCE] Created data directory
[PERSISTENCE] Created backup directory
[PERSISTENCE] Initialized invites.json
[PERSISTENCE] Created startup backup
[DATA INIT] Data directory initialization complete
```

When data is saved:
```
[PERSISTENCE] Successfully saved invites.json
[INVITE MANAGER] Updated user 123456789 in guild 987654321
[STORAGE] Set welcome_config for guild 987654321
```

When invites are reset:
```
[PERSISTENCE] Created backup for invites.json
[INVITE MANAGER] Resetting all invites for guild 987654321
[INVITE MANAGER] Successfully cleared invite data for guild 987654321
[RESET INVITES] Successfully reset 15 users for guild 987654321
```

## 🐛 Troubleshooting

### Problem: Data not persisting
**Solution:** Check bot logs for persistence errors. Ensure the bot has write permissions to the `data/` directory.

### Problem: Reset invites coming back
**Solution:** This should no longer happen! The new system saves the cleared state. If it still occurs, check logs for errors during the reset operation.

### Problem: Backup files taking up space
**Solution:** Old backups can be safely deleted from `data/backups/`. Keep the most recent ones for safety.

### Problem: Corrupted data file
**Solution:** The system automatically restores from backup. Check logs for recovery messages.

## 💡 Best Practices

1. **Use `/data-status` regularly** to verify data is being saved
2. **Create manual backups** before major changes with `/backup-data`
3. **Monitor bot logs** for persistence confirmations
4. **Keep recent backups** for emergency recovery
5. **Test after deployment** to ensure persistence works on your hosting

## 🔄 Migration from Old System

Your existing data has been preserved! The new system:
- ✅ Works with existing data files
- ✅ Maintains backward compatibility
- ✅ Adds new features without breaking old ones
- ✅ Creates backups of original files

## 📞 Support

If you encounter any issues:
1. Check the bot logs for error messages
2. Use `/data-status` to verify system status
3. Try creating a manual backup with `/backup-data`
4. Review this guide for troubleshooting steps

---

**Version:** 2.0  
**Last Updated:** January 27, 2025  
**Status:** ✅ Production Ready
