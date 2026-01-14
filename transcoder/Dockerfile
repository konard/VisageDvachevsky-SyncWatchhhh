# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root package files (exclude lock file to get platform-specific deps)
COPY package.json ./

# Copy workspace package files (exclude lock files)
COPY transcoder/package.json ./transcoder/
COPY shared/package.json ./shared/

# Install all dependencies (including devDependencies for build)
# npm install without lock file resolves platform-specific optional dependencies
# correctly (e.g., @rollup/rollup-linux-x64-musl for Alpine Linux)
RUN npm install

# Copy shared package source
COPY shared ./shared

# Build shared package
RUN npm run build --workspace=shared

# Copy transcoder source
COPY transcoder ./transcoder

# Generate Prisma client
RUN npm run db:generate --workspace=transcoder

# Build transcoder
RUN npm run build --workspace=transcoder

# Production stage
FROM node:20-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy workspace root package files (exclude lock file to get platform-specific deps)
COPY package.json ./

# Copy workspace package files (exclude lock files)
COPY transcoder/package.json ./transcoder/
COPY shared/package.json ./shared/

# Install production dependencies only
RUN npm install --omit=dev

# Copy built files from builder
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/transcoder/dist ./transcoder/dist
# Prisma client is hoisted to root node_modules in npm workspaces
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Prisma schema
COPY transcoder/prisma ./transcoder/prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create tmp directory for transcoding with proper permissions
RUN mkdir -p /tmp/transcode && chown -R nodejs:nodejs /tmp/transcode

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Health check (check if worker process is running)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD pgrep -f "node transcoder/dist/worker.js" || exit 1

CMD ["node", "transcoder/dist/worker.js"]
