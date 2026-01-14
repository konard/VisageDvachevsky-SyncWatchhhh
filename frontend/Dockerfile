# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root package files (exclude lock file to get platform-specific deps)
COPY package.json ./

# Copy workspace package files (exclude lock files)
COPY frontend/package.json ./frontend/
COPY shared/package.json ./shared/

# Install all dependencies (including devDependencies for build)
# npm install without lock file resolves platform-specific optional dependencies
# correctly (e.g., @rollup/rollup-linux-x64-musl for Alpine Linux)
RUN npm install

# Copy shared package source
COPY shared ./shared

# Build shared package
RUN npm run build --workspace=shared

# Copy frontend source
COPY frontend ./frontend

# Build frontend
RUN npm run build --workspace=frontend

# Production stage with nginx
FROM nginx:alpine

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
