# Web Dashboard Integration Guide

This guide explains how to integrate the new web dashboard into your existing Supreme-BOT2 bot on Koyeb.

## Overview

The dashboard has been created in the `/dashboard` directory as a React + Vite application. It provides a web-based interface for managing your bot, viewing statistics, and handling tickets. The dashboard communicates with your bot through REST API endpoints.

## Structure

```
Supreme-BOT2/
├── index.js                          (Main bot file - needs modification)
├── package.json                      (Root dependencies - needs update)
├── dashboard/                        (New dashboard application)
│   ├── src/
│   │   ├── pages/                   (Page components)
│   │   ├── components/              (Reusable components)
│   │   ├── App.jsx                  (Main app component)
│   │   └── main.jsx                 (Entry point)
│   ├── package.json                 (Dashboard dependencies)
│   ├── vite.config.js               (Vite configuration)
│   ├── tailwind.config.js           (Tailwind CSS config)
│   └── dist/                        (Built files - generated after build)
├── routes/
│   └── dashboardApi.js              (API endpoints for dashboard)
└── ... (existing bot files)
```

## Step 1: Update Root package.json

Add the dashboard build and start scripts to your root `package.json`:

```json
{
  "scripts": {
    "start": "node index.js",
    "build": "cd dashboard && npm run build",
    "postinstall": "npm rebuild better-sqlite3 && cd dashboard && npm install",
    "dev": "node index.js"
  }
}
```

## Step 2: Modify index.js

Update your `index.js` to serve the dashboard and API endpoints. Add the following code after your existing Express setup and before `client.login(TOKEN)`:

```javascript
// Add these imports at the top
const path = require('node:path');
const dashboardApi = require('./routes/dashboardApi');

// ... existing code ...

/* ===============================
   DASHBOARD INTEGRATION
================================ */

// Middleware for session management (optional, for authentication)
const session = require('express-session');
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true }
}));

// Parse JSON bodies
app.use(express.json());

// API routes for dashboard
app.use('/api/dashboard', dashboardApi);

// Serve static files for the React dashboard
const dashboardDistPath = path.join(__dirname, 'dashboard', 'dist');
app.use('/dashboard', express.static(dashboardDistPath));

// SPA fallback: for any route under /dashboard, serve the dashboard's index.html
app.get('/dashboard/*', (req, res) => {
  res.sendFile(path.join(dashboardDistPath, 'index.html'));
});

// Redirect root to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// ... rest of existing code ...
```

## Step 3: Install Dependencies

Install the `express-session` package for session management:

```bash
npm install express-session
```

## Step 4: Build the Dashboard

Before deploying, build the React dashboard:

```bash
cd dashboard
npm run build
cd ..
```

This creates the `dashboard/dist` folder with the compiled React application.

## Step 5: Environment Variables

Add the following environment variables to your Koyeb service:

```
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
SESSION_SECRET=your_secure_random_string
```

## Step 6: Update Dockerfile (if using Docker)

If you're using Docker on Koyeb, update your `Dockerfile` to include the dashboard build:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy root files
COPY package*.json ./

# Install root dependencies and build dashboard
RUN npm install && npm run build

# Copy application files
COPY . .

# Expose port
EXPOSE 8000

# Start the bot
CMD ["npm", "start"]
```

## Step 7: Deploy to Koyeb

1. Commit your changes to GitHub:
```bash
git add .
git commit -m "Add web dashboard integration"
git push
```

2. Koyeb will automatically detect the changes and redeploy your service.

3. Once deployed, access your dashboard at: `https://your-koyeb-url/dashboard`

## API Endpoints

The dashboard communicates with your bot through these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/auth/me` | GET | Get current user info |
| `/api/dashboard/auth/callback` | POST | Handle Discord OAuth |
| `/api/dashboard/auth/logout` | POST | Logout user |
| `/api/dashboard/stats` | GET | Get server statistics |
| `/api/dashboard/tickets` | GET | Get list of tickets |
| `/api/dashboard/tickets/:id` | GET | Get ticket details |
| `/api/dashboard/tickets/:id/close` | POST | Close a ticket |
| `/api/dashboard/users/:id` | GET | Get user profile |
| `/api/dashboard/giveaways` | GET | Get giveaways |
| `/api/dashboard/giveaways/create` | POST | Create giveaway |
| `/api/dashboard/settings` | GET/POST | Get/update settings |
| `/api/dashboard/audit-logs` | GET | Get audit logs |

## Implementing API Endpoints

The placeholder API endpoints in `/routes/dashboardApi.js` need to be connected to your bot's actual data. Here's how to implement them:

### Example: Implementing `/api/dashboard/stats`

```javascript
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const client = req.app.locals.client; // Pass client from index.js
    const guild = client.guilds.cache.first(); // Get first guild
    
    const stats = {
      totalMembers: guild.memberCount,
      activeTickets: 0, // Get from your ticket storage
      totalTrades: 0, // Get from settings.json
      uptime: process.uptime(),
      serverName: guild.name,
      channels: guild.channels.cache.size,
      roles: guild.roles.cache.size,
      botStatus: client.isReady() ? 'Online' : 'Offline',
      recentTickets: [], // Get from your ticket data
    };

    res.json(stats);
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});
```

## Passing Bot Client to API Routes

In your `index.js`, after creating the Discord client, pass it to the Express app:

```javascript
// After client creation
app.locals.client = client;

// This allows API routes to access the bot client
```

## Security Considerations

1. **Authentication**: Implement proper Discord OAuth2 authentication in `/routes/dashboardApi.js`
2. **Authorization**: Check user roles before allowing access to sensitive operations
3. **Rate Limiting**: Add rate limiting to prevent abuse
4. **HTTPS**: Ensure HTTPS is enabled on Koyeb (it is by default)
5. **CORS**: Configure CORS properly if the dashboard is on a different domain

## Development

To develop the dashboard locally:

```bash
cd dashboard
npm run dev
```

This starts the Vite dev server on `http://localhost:5173` with hot module reloading.

## Troubleshooting

**Dashboard not loading:**
- Check that the `dashboard/dist` folder exists
- Verify the static file path in `index.js`
- Check browser console for errors

**API endpoints returning 404:**
- Ensure `/routes/dashboardApi.js` is properly imported
- Verify the route prefix `/api/dashboard` is correct

**Build fails on Koyeb:**
- Check that `npm run build` is in your `package.json` scripts
- Ensure all dependencies are installed
- Check Koyeb build logs for specific errors

## Next Steps

1. Implement Discord OAuth2 authentication
2. Connect API endpoints to actual bot data
3. Add role-based access control
4. Implement real-time updates with WebSockets
5. Add more dashboard features (user management, settings, etc.)

## Support

For issues or questions, refer to:
- [Discord.js Documentation](https://discord.js.org/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Koyeb Documentation](https://www.koyeb.com/docs)
