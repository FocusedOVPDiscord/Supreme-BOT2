# Fixing TCP Health Check on Koyeb for Supreme Bot 2

The "TCP health check failed on port 8000" error occurs because Koyeb's **Web Service** expects a process to listen on a specific port (defaulting to 8000 or the `PORT` environment variable) to verify the application is running. Since a Discord bot is a background worker, it doesn't naturally listen for incoming network connections.

There are two primary ways to fix this:

## Option 1: Switch to "Worker" Service Type (Recommended)

If you don't need to access a web dashboard or API for your bot, the best solution is to change the Service Type in Koyeb.

1.  Go to your Service settings in the Koyeb Control Panel.
2.  Change the **Service Type** from **Web Service** to **Worker**.
3.  **Workers** do not require health checks or open ports, which is perfect for Discord bots.

## Option 2: Add a Web Server to your Bot (If you want to keep Web Service)

If you prefer to keep it as a **Web Service** (e.g., to keep it "alive" or for future web features), you need to ensure the bot listens on the port Koyeb expects.

The repository already has an `index.js` (in the root) that uses Express, but the `Dockerfile` is currently pointing to `src/index.js`, which **does not** have the web server.

### Step 1: Update the Dockerfile
Change the last line of your `Dockerfile` to use the root `index.js` which includes the Express server:

```dockerfile
# Change this:
CMD ["node", "src/index.js"]

# To this:
CMD ["node", "index.js"]
```

### Step 2: Configure Environment Variables in Koyeb
Ensure you have the following environment variables set in your Koyeb Service settings:
- `PORT`: `8000` (This matches the port Koyeb is checking)
- `TOKEN`: Your Discord Bot Token

### Step 3: Verify the Web Server Code
The root `index.js` already contains the necessary code to pass the health check:

```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.json({ status: 'online' });
});

app.listen(PORT, () => {
    console.log(`[INFO] Express server running on port ${PORT}`);
});
```

## Summary of the Issue
Your current deployment is running `src/index.js`, which only starts the Discord bot and doesn't listen on any port. Koyeb tries to connect to port 8000, fails, and restarts the instance. Switching to the root `index.js` or changing the service type to **Worker** will resolve this.
