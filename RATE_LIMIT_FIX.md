# Discord API Rate Limit Fixes

## Issues Identified
1. **Aggressive Member Fetching**: The bot was fetching all members of every guild on startup (`guild.members.fetch()`), which is a heavy operation and can quickly trigger global rate limits, especially for larger servers.
2. **Dashboard Member Fetching**: The dashboard API was also attempting to fetch all members if the cache was less than 80% full, leading to repeated heavy API calls.
3. **Lack of Rate Limit Handling**: The OAuth callback didn't specifically handle 429 (Rate Limit) errors from Discord, making it hard to diagnose the issue from the UI.

## Fixes Implemented
1. **Optimized Startup**: Removed the `guild.members.fetch()` call from the `ready` event in `index.js`. The bot now relies on lazy loading and gateway events to populate the member cache.
2. **Smarter Member Loading**: 
   - Updated `/api/dashboard/users` to use a "chunked" loading strategy. Instead of downloading all members at once, it fetches small groups (200 members) only when the cache is empty or too small.
   - This ensures the user list still loads in your dashboard without triggering Discord's "Global Rate Limit" block.
   - Added cache-first check in the OAuth callback for role verification to speed up login.
3. **Improved Error Handling**: Added specific handling for HTTP 429 errors in the OAuth callback to provide better feedback to the user.
4. **Cache-First Verification**: The OAuth process now checks the local member cache first before making an API call to fetch member roles.

## Recommendations
- Ensure the bot has the `GUILD_MEMBERS` privileged intent enabled in the Discord Developer Portal (which you've mentioned is done).
- If the rate limit persists, wait for the temporary block to expire (usually 1-2 hours) before trying again.
