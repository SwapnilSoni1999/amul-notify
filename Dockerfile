# Use official Node.js 22 LTS image
FROM oven/bun:1 AS base

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy .env.prod file if it exists
COPY .env.prod .env.prod

# Copy source files
COPY . .

# Build TypeScript
RUN bun run build

# Run the app
CMD ["bun", "start"]
