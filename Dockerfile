# Multi-stage build for production deployment
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root package.json and install root dependencies
COPY package*.json ./
RUN npm install

# Copy client source and build
COPY client/ ./client/
WORKDIR /app/client
RUN npm install
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy server source and package.json
COPY server/ ./server/
WORKDIR /app/server
RUN npm install --only=production

# Install PM2 globally for process management
RUN npm install -g pm2

# Copy ecosystem config for PM2
COPY ecosystem.config.js ./

# Copy built client files to server's static directory
COPY --from=builder /app/client/dist ./public

# Create logs directory
RUN mkdir -p logs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the server with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]
