# ==========================================
# Stage 1: Build Frontend Assets
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy full source and build production Vite bundle
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Production Server & Static Delivery
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Production environment defaults
ENV NODE_ENV=production \
    PORT=3001 \
    CART_SYNC_DB_PATH=/app/data/cartsync.db

# Install non-root security user & runtime essentials
RUN addgroup -S cartsync && adduser -S cartsync -G cartsync

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy backend server code and built frontend dist
COPY server/ ./server/
COPY --from=builder /app/dist ./dist

# Create persistent database folder with proper user permissions
RUN mkdir -p /app/data && chown -R cartsync:cartsync /app

# Switch to non-root user for container security
USER cartsync

# Expose HTTP & WebSocket port
EXPOSE 3001

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start CartSync Express & WebSocket server
CMD ["node", "server/index.js"]
