FROM node:24-slim

# Install git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Copy start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start application
CMD ["sh", "/app/start.sh"]
