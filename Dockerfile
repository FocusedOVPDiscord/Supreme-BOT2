FROM node:20-slim

# Install build dependencies for better-sqlite3 and other native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install root dependencies (including devDependencies for building)
RUN npm install

# Copy the rest of the application
COPY . .

# Build the dashboard
# We need to install dashboard dependencies and then run the build
RUN cd dashboard && npm install && npm run build

# Cleanup: Remove node_modules from dashboard to save space if needed, 
# but keep the built 'dist' folder which index.js serves.
# Also prune root dependencies to production only
RUN npm prune --production

RUN mkdir -p data
ENV NODE_ENV=production
# Ensure the database is stored in the persistent /app/data directory
ENV DATA_DIR=/app/data

EXPOSE 8000

CMD ["node", "index.js"]
