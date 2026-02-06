# Testing & Deployment Guide

## Overview

This guide covers testing the new features and deploying them to production.

---

## New Features to Test

### 1. IP-Based Persistent Login
### 2. Server Selection in Dashboard

---

## Pre-Deployment Checklist

### 1. Install Dependencies

```bash
cd /home/ubuntu/Supreme-BOT2
npm install
```

This will install the new `session-file-store` package.

### 2. Build Dashboard

```bash
cd dashboard
npm install
npm run build
```

This creates the production build in `dashboard/dist/`.

### 3. Environment Variables

Ensure these are set in your `.env` file or Koyeb environment:

```env
TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=1459183931005075701
DISCORD_CLIENT_SECRET=your_client_secret
REDIRECT_URI=https://your-app-url.koyeb.app/dashboard/login
SESSION_SECRET=your_strong_random_secret_key
NODE_ENV=production
```

**Important:** Update `REDIRECT_URI` to match your actual deployment URL.

---

## Testing Locally

### 1. Start the Bot

```bash
cd /home/ubuntu/Supreme-BOT2
npm start
```

Expected output:
```
📦 [SESSION] File-based session store initialized (30-day persistence)
✅ [BOT] Online as Supreme Bot#1234
🚀 [SERVER] Running on port 8000
```

### 2. Access Dashboard

Open browser to: `http://localhost:8000/dashboard`

---

## Feature Testing

### Test 1: IP-Based Auto-Login

**Steps:**

1. **First Login:**
   - Visit `http://localhost:8000/dashboard`
   - Click "Continue with Discord"
   - Complete Discord OAuth
   - Should be logged in and see dashboard

2. **Verify IP Saved:**
   ```bash
   cat data/trusted-ips.json
   ```
   Should see your IP address with user info.

3. **Test Auto-Login:**
   - Close browser completely
   - Reopen browser
   - Visit `http://localhost:8000/dashboard`
   - **Expected:** Automatically logged in without clicking "Login"

4. **Test Session Persistence:**
   - While logged in, restart the bot server
   - Refresh dashboard
   - **Expected:** Still logged in (session restored from disk)

5. **Test Logout:**
   - Click logout button in sidebar
   - **Expected:** Logged out, redirected to login page
   - Refresh page
   - **Expected:** Auto-login happens again (IP still trusted)

6. **Test Remove Trusted IP:**
   - Modify logout to send `removeTrustedIP: true`
   - Logout
   - Check `data/trusted-ips.json` - IP should be removed
   - Refresh page
   - **Expected:** Must login manually again

**Success Criteria:**
- ✅ IP saved on first login
- ✅ Auto-login works from trusted IP
- ✅ Sessions persist across server restarts
- ✅ Logout works correctly
- ✅ IP removal works

---

### Test 2: Server Selection

**Prerequisites:** Bot must be in multiple Discord servers.

**Steps:**

1. **Login to Dashboard:**
   - Complete login process
   - Should see dashboard

2. **Check Server Selector:**
   - Look in sidebar (when expanded)
   - Should see "Server" section with dropdown
   - **Expected:** Shows current server with icon and member count

3. **View Available Servers:**
   - Click on server selector dropdown
   - **Expected:** List of all servers where you have staff role
   - Each server shows icon, name, and member count

4. **Switch Servers:**
   - Select a different server from dropdown
   - **Expected:** Page refreshes
   - Dashboard data updates to show new server's data

5. **Verify Data Updates:**
   - Check "Total Members" stat - should match new server
   - Check "Active Tickets" - should show new server's tickets
   - Navigate to Users page - should show new server's users

6. **Test Persistence:**
   - Select a server
   - Refresh page
   - **Expected:** Selected server persists (stored in session)

7. **Test Single Server:**
   - If bot is only in one server
   - **Expected:** Server selector doesn't show (auto-selected)

**Success Criteria:**
- ✅ Server selector appears in sidebar
- ✅ Shows all servers with staff access
- ✅ Can switch between servers
- ✅ Data updates correctly for each server
- ✅ Selection persists in session
- ✅ Auto-hides if only one server

---

### Test 3: API Endpoints

**Test with curl or Postman:**

1. **Get Available Guilds:**
   ```bash
   curl -X GET http://localhost:8000/api/dashboard/guilds \
     -H "Cookie: connect.sid=your_session_cookie" \
     --cookie-jar cookies.txt
   ```
   **Expected:** JSON array of guilds

2. **Select Guild:**
   ```bash
   curl -X POST http://localhost:8000/api/dashboard/select-guild \
     -H "Content-Type: application/json" \
     -H "Cookie: connect.sid=your_session_cookie" \
     -d '{"guildId": "your_guild_id"}' \
     --cookie cookies.txt
   ```
   **Expected:** `{"success": true, "guild": {...}}`

3. **Get Stats for Selected Guild:**
   ```bash
   curl -X GET http://localhost:8000/api/dashboard/stats \
     -H "Cookie: connect.sid=your_session_cookie" \
     --cookie cookies.txt
   ```
   **Expected:** Stats for selected guild

**Success Criteria:**
- ✅ All endpoints return correct data
- ✅ Guild selection persists in session
- ✅ Data reflects selected guild

---

## Deployment to Koyeb

### Step 1: Update Environment Variables

In Koyeb dashboard:

1. Go to your app settings
2. Update environment variables:
   ```
   SESSION_SECRET=generate_a_strong_random_key_here
   NODE_ENV=production
   REDIRECT_URI=https://your-app-url.koyeb.app/dashboard/login
   ```

### Step 2: Build Dashboard

Before deploying, build the dashboard:

```bash
cd dashboard
npm install
npm run build
```

Commit the `dashboard/dist/` folder:

```bash
git add dashboard/dist/
git commit -m "build: Add production dashboard build"
git push origin main
```

### Step 3: Deploy

Koyeb will auto-deploy from GitHub. Monitor the deployment:

1. Check Koyeb logs for:
   - `📦 [SESSION] File-based session store initialized`
   - `✅ [BOT] Online as ...`
   - `🚀 [SERVER] Running on port 8000`

2. Verify no errors in logs

### Step 4: Test Production

1. Visit `https://your-app-url.koyeb.app/dashboard`
2. Complete login
3. Test auto-login (close/reopen browser)
4. Test server selection
5. Verify all dashboard pages work

---

## Troubleshooting

### Issue: Auto-login not working

**Possible Causes:**
1. IP address changing (VPN, dynamic IP)
2. Proxy headers not configured
3. Session store not initialized

**Solutions:**
- Check `data/trusted-ips.json` exists
- Verify `trust proxy` is set in `index.js`
- Check Koyeb logs for IP detection
- Ensure `x-forwarded-for` header is present

### Issue: Server selector not showing

**Possible Causes:**
1. Bot only in one server
2. User doesn't have staff role in multiple servers
3. API endpoint failing

**Solutions:**
- Check browser console for errors
- Verify `/api/dashboard/guilds` returns data
- Ensure user has staff role in multiple servers
- Check network tab in DevTools

### Issue: Sessions not persisting

**Possible Causes:**
1. `data/sessions/` directory not writable
2. File store not initialized
3. Koyeb ephemeral storage

**Solutions:**
- Check directory permissions
- Verify `session-file-store` is installed
- Consider using Redis for production (Koyeb limitation)

### Issue: Data not updating when switching servers

**Possible Causes:**
1. Session not saving selected guild
2. API endpoints still using `first()` instead of `getSelectedGuild()`
3. Frontend not refreshing

**Solutions:**
- Check `req.session.selectedGuildId` in logs
- Verify all endpoints use `getSelectedGuild(req)`
- Ensure page refresh happens after selection

---

## Performance Considerations

### Session File Store

**Pros:**
- ✅ Simple setup
- ✅ No external dependencies
- ✅ Works for small-scale deployments

**Cons:**
- ❌ Not suitable for multi-instance deployments
- ❌ Slower than Redis
- ❌ May not persist on Koyeb (ephemeral storage)

### Recommended for Production: Redis

If you experience issues with file-based sessions on Koyeb, consider Redis:

```bash
npm install connect-redis redis
```

Update `index.js`:

```javascript
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.connect().catch(console.error);

const sessionStore = new RedisStore({
  client: redisClient,
  prefix: 'supreme-bot:',
  ttl: 30 * 24 * 60 * 60 // 30 days
});
```

---

## Monitoring

### Check Trusted IPs

```bash
cat data/trusted-ips.json
```

### Check Active Sessions

```bash
ls -la data/sessions/
```

### Check Logs

```bash
# Koyeb logs
koyeb logs <app-name>

# Local logs
npm start | tee bot.log
```

---

## Security Best Practices

1. **Set Strong SESSION_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

2. **Use HTTPS in Production:**
   - Koyeb provides HTTPS by default
   - Ensures `secure: true` cookies work

3. **Regularly Clean Trusted IPs:**
   - Remove inactive users
   - Audit IP list monthly

4. **Monitor Login Attempts:**
   - Check logs for suspicious activity
   - Implement rate limiting if needed

5. **Backup Data:**
   - Regularly backup `data/trusted-ips.json`
   - Backup session data if critical

---

## Rollback Plan

If issues occur in production:

1. **Revert Git Commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Or Checkout Previous Version:**
   ```bash
   git checkout <previous-commit-hash>
   git push origin main --force
   ```

3. **Koyeb will auto-deploy the reverted version**

---

## Next Steps After Deployment

1. ✅ Monitor logs for errors
2. ✅ Test all features in production
3. ✅ Gather user feedback
4. ✅ Consider Redis migration if needed
5. ✅ Implement additional security features
6. ✅ Add IP management UI
7. ✅ Add session management UI

---

## Support

If you encounter issues:

1. Check this guide first
2. Review `IMPLEMENTATION_CHANGELOG.md`
3. Check GitHub Issues
4. Review Koyeb logs
5. Test locally to isolate issue

---

**Last Updated:** February 6, 2026  
**Version:** 1.0.0  
**Status:** Ready for Production Testing
