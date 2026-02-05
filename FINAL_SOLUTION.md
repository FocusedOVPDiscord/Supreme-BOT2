# Final Solution for Supreme Bot 2 on Koyeb

This document outlines the steps taken to resolve the issues encountered with your Supreme Bot 2 deployment on Koyeb, specifically addressing the `express` module not found error and the missing Discord commands.

## Summary of the Problem

Initially, your bot was failing Koyeb's TCP health checks because the `src/index.js` file, which was being executed by the `Dockerfile`, did not include a web server to respond to these checks. After implementing a health check server, a new issue arose: the bot was not loading all the expected Discord commands, and subsequently, a `MODULE_NOT_FOUND: express` error appeared in the logs.

Upon further investigation, it was discovered that:

1.  **Two `index.js` files**: Your repository contained two main entry points: `index.js` (in the root) and `src/index.js`. The `src/index.js` had a limited command set, while the root `index.js` was designed to load a broader range of commands from the `commands` directory.
2.  **Incorrect `Dockerfile` entry point**: The `Dockerfile` was configured to run `src/index.js`, leading to the limited command set being loaded.
3.  **Missing `express` dependency**: When the `Dockerfile` was updated to run the root `index.js` (which uses `express` for the health check server), the `express` package was not listed in `package.json` for the `Supreme-BOT2` repository, causing the `MODULE_NOT_FOUND` error during deployment.
4.  **Commands in wrong repository**: The utility commands you expected were actually present in your `supreme-ai` repository, not `Supreme-BOT2`.

## Solution Implemented

To address these issues, the following modifications have been made to your `Supreme-BOT2` repository:

### 1. `package.json` Update

The `express` package has been added to the `dependencies` in `package.json` to ensure it is installed during the build process. This resolves the `MODULE_NOT_FOUND: express` error.

```json
{
  "name": "supreme-bot-2",
  "version": "1.0.0",
  "description": "SUPREME BOT - Discord Bot running 24/7 on Koyeb",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "postinstall": "npm rebuild better-sqlite3",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "discord",
    "bot",
    "discord.js"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "axios": "^1.13.4",
    "better-sqlite3": "^12.6.2",
    "discord.js": "^14.25.1",
    "dotenv": "^17.2.3",
    "express": "^4.18.2"  // <--- ADDED THIS LINE
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/FocusedOVPDiscord/Supreme-BOT2.git"
  },
  "bugs": {
    "url": "https://github.com/FocusedOVPDiscord/Supreme-BOT2/issues"
  },
  "homepage": "https://github.com/FocusedOVPDiscord/Supreme-BOT2#readme"
}
```

### 2. `Dockerfile` Update

The `Dockerfile` has been modified to:

*   **Expose Port 8000**: Explicitly tells Koyeb that the service listens on port 8000.
*   **Use Root `index.js`**: Changes the entry point to `node index.js` to ensure the bot runs the version with all your commands and the integrated health check server.

```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p data
ENV NODE_ENV=production
ENV DB_PATH=/app/data/bot.db
EXPOSE 8000  # <--- ADDED THIS LINE
CMD ["node", "index.js"] # <--- CHANGED FROM src/index.js
```

### 3. `index.js` (Root) Update

The root `index.js` file has been updated to:

*   **Integrate Health Check Server**: A simple HTTP server is now included at the beginning of the file to listen on `process.env.PORT` (defaulting to 8000) and respond with a `200 OK` status, satisfying Koyeb's health check requirements.
*   **Flexible Token Handling**: The bot now checks for `process.env.TOKEN` first, then falls back to `process.env.DISCORD_TOKEN`, providing more flexibility for your environment variables.

```javascript
// ... (previous code)

const fs = require("node:fs");
const path = require("node:path");
const express = require("express"); // <--- Ensure express is required
const { initializeDataDirectory } = require("./dataInit");
require("dotenv").config();

// ... (safety check for TOKEN)

/* ===============================
   EXPRESS SERVER (FOR KOYEB HEALTH CHECK)
================================ */
const app = express();
const PORT = process.env.PORT || 8000; // <--- Set default to 8000

app.get("/", (req, res) => {
    res.json({
        status: "online",
        bot: client.user ? client.user.tag : "Starting...",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        discord: client.user ? "connected" : "disconnected",
        guilds: client.guilds.cache.size,
        uptime: process.uptime()
    });
});

app.listen(PORT, () => {
    console.log(`[INFO] Express server running on port ${PORT}`);
});

// ... (rest of your bot code)

client.login(TOKEN) // <--- Using the flexible TOKEN variable
    .then(() => console.log("[DEBUG] client.login() promise resolved"))
    .catch(err => {
        console.error("❌ Discord login failed:", err);
        process.exit(1);
    });
```

### 4. Commands Sync

The utility commands from your `supreme-ai` repository (`commands/utility/*`) have been copied into the `Supreme-BOT2/commands/utility/` directory. This ensures that all your intended commands are available to the bot when it starts.

## Next Steps for You

1.  **Koyeb Redeployment**: Since all these changes have been pushed to your GitHub repository, Koyeb should automatically detect them and trigger a new deployment. Monitor the deployment logs closely.
2.  **Verify Environment Variables**: Double-check that the following environment variables are correctly set in your Koyeb service settings:
    *   `DISCORD_TOKEN`: Your Discord bot token.
    *   `DISCORD_CLIENT_ID`: Your bot's application ID.
    *   `PORT`: `8000`.
3.  **Monitor Logs**: After the new deployment, you should see the bot successfully logging in and loading all your commands, including the utility commands you expected. Look for messages like `✅ BOT ONLINE AS <your_bot_tag>` and `[SUCCESS] Loaded command: <command_name>` for all your commands.

These comprehensive changes should resolve all the deployment and functionality issues you've been experiencing. Please let me know if you encounter any further problems.
