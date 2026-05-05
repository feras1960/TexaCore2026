# ════════════════════════════════════════════════════════════════
# 🐳 TexaCore Self-Hosted — Multi-Stage Dockerfile
# ════════════════════════════════════════════════════════════════
# Stage 1: Build React + Vite
# Stage 2: OpenResty (Nginx + Lua) with License Guard
# ════════════════════════════════════════════════════════════════

# ─── Stage 1: Build ───────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (better caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --production=false

# Copy source code
COPY . .

# Build arguments for Vite
ARG VITE_SUPABASE_URL=""
ARG VITE_TEXACORE_MODE="selfhosted"
ARG VITE_APP_VERSION="1.0.0"
ARG VITE_IS_DESKTOP="true"

# Increase Node.js heap for large build (9700+ modules)
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Create .env.production explicitly to ensure Vite picks it up
RUN echo "VITE_IS_DESKTOP=true" > .env.production
RUN echo "VITE_TEXACORE_MODE=selfhosted" >> .env.production

# Build the app
RUN npm run build


# ─── Stage 2: OpenResty (Nginx + Lua) ────────────────────────
FROM openresty/openresty:1.25.3.2-alpine AS production

# Install required packages
RUN apk add --no-cache \
    curl \
    jq \
    openssl \
    lua5.1-cjson

# Remove default config
RUN rm -f /etc/openresty/nginx.conf /usr/local/openresty/nginx/conf/nginx.conf

# Copy custom Nginx config
COPY docker/nginx/nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY docker/nginx/license-guard.lua /usr/local/openresty/nginx/conf/license-guard.lua

# Copy built app from builder
COPY --from=builder /app/dist /usr/local/openresty/nginx/html

# Copy RSA public key for signature verification
COPY keys/public.pem /etc/texacore/public.pem

# Copy startup script
COPY docker/scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -sf http://localhost:80/health || exit 1

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]
