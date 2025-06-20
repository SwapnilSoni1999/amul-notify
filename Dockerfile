# Use official Node.js 22 LTS image
FROM node:22-slim

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy .env.prod file if it exists
COPY .env.prod .env.prod

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Expose the app port (change if your app uses a different port)
EXPOSE 5000

# Run the app
CMD ["npm", "start"]
