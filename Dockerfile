# ==========================================
# Stage 1: Build Frontend Assets
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies for building
COPY package.json package-lock.json ./
RUN npm ci

# Copy project files and build Vite React PWA bundle
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Production Server & Static Delivery
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Default environment configuration
ENV NODE_ENV=production \
    PORT=3001 \
    CART_SYNC_DB_PATH=/app/data/cartsync.db

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy server code and built frontend dist from builder
COPY server/ ./server/
COPY --from=builder /app/dist ./dist

# Create persistent data directory for SQLite database
RUN mkdir -p /app/data

# Expose application port
EXPOSE 3001

# Container health check against backend API endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start CartSync Express & WebSocket server
CMD ["node", "server/index.js"]
