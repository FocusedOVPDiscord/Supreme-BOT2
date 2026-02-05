FROM node:20-slim
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p data
ENV NODE_ENV=production
# Ensure the database is stored in the persistent /app/data directory
ENV DATA_DIR=/app/data
EXPOSE 8000
CMD ["node", "index.js"]
