# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root package files
COPY package*.json ./

# Copy workspace package files
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install all dependencies (including devDependencies for build)
# Use npm install instead of npm ci to get platform-specific optional deps
# (npm ci uses lock file which may not have Alpine-specific native binaries)
RUN npm install

# Copy shared package source
COPY shared ./shared

# Build shared package
RUN npm run build --workspace=shared

# Copy backend source
COPY backend ./backend

# Generate Prisma client
RUN npm run db:generate --workspace=backend

# Build backend
RUN npm run build --workspace=backend

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy workspace root package files
COPY package*.json ./

# Copy workspace package files
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install production dependencies only
RUN npm install --omit=dev

# Copy built files from builder
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
# Prisma client is hoisted to root node_modules in npm workspaces
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Prisma schema for migrations
COPY backend/prisma ./backend/prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health/live', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "backend/dist/index.js"]
