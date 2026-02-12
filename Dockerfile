FROM node:20-slim

# Install build dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install root dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the dashboard
RUN cd dashboard && npm install && npm run build

# Prune root dependencies to production only
RUN npm prune --production

# Create data directory for any remaining local storage/backups
RUN mkdir -p data

# Environment variables
ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

# Start script that runs migration then the bot
CMD ["sh", "-c", "node migrateToTiDB.js && node index.js"]
