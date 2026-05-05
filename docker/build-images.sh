#!/bin/bash
# ═══════════════════════════════════════════════════════════
# TexaCore ERP — Build & Push Docker Images
# ═══════════════════════════════════════════════════════════
#
# Usage:
#   ./build-images.sh              # Build only
#   ./build-images.sh --push       # Build + push to registry
#   ./build-images.sh --tag 1.2.0  # Build with specific version
#
# Registry: GitHub Container Registry (ghcr.io)
# ═══════════════════════════════════════════════════════════

set -e

# ─── Configuration ─────────────────────────────────────────
REGISTRY="${REGISTRY:-ghcr.io/feras1960}"
VERSION="${VERSION:-latest}"
PUSH=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --push) PUSH=true; shift;;
    --tag)  VERSION="$2"; shift 2;;
    *)      echo "Unknown option: $1"; exit 1;;
  esac
done

echo "═══════════════════════════════════════════"
echo "  TexaCore Docker Image Builder"
echo "  Registry: $REGISTRY"
echo "  Version:  $VERSION"
echo "  Push:     $PUSH"
echo "═══════════════════════════════════════════"

DOCKER_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$DOCKER_DIR")"

# ─── 1. Build custom DB image ─────────────────────────────
echo ""
echo "📦 [1/2] Building texacore-db..."

# We need a build context that includes both docker/ and supabase/migrations
# Use a temporary Dockerfile with correct paths
cat > "$DOCKER_DIR/.Dockerfile.db.tmp" << 'DEOF'
FROM supabase/postgres:17.6.1.110
COPY docker/volumes/db/roles.sql      /docker-entrypoint-initdb.d/migrations/99-roles.sql
COPY docker/volumes/db/jwt.sql        /docker-entrypoint-initdb.d/init-scripts/98-jwt.sql
COPY docker/volumes/db/realtime.sql   /docker-entrypoint-initdb.d/migrations/99-realtime.sql
COPY docker/volumes/db/webhooks.sql   /docker-entrypoint-initdb.d/migrations/99-webhooks.sql
COPY supabase/migrations /app-migrations
COPY docker/migrations-init.sh /docker-entrypoint-initdb.d/init-scripts/99-app-migrations.sh
RUN chmod +x /docker-entrypoint-initdb.d/init-scripts/99-app-migrations.sh
LABEL maintainer="TexaCore Team"
LABEL description="TexaCore ERP Database"
LABEL version="1.0.0"
DEOF

docker build \
  -f "$DOCKER_DIR/.Dockerfile.db.tmp" \
  -t "$REGISTRY/texacore-db:$VERSION" \
  -t "$REGISTRY/texacore-db:latest" \
  "$PROJECT_ROOT"

rm -f "$DOCKER_DIR/.Dockerfile.db.tmp"
echo "✅ texacore-db built successfully"

# ─── 2. Build frontend image (Vite → Nginx) ───────────────
echo ""
echo "📦 [2/2] Building texacore-app..."

cat > "$DOCKER_DIR/.Dockerfile.app.tmp" << 'AEOF'
# Stage 1: Build the Vite app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN echo "VITE_IS_DESKTOP=true" > .env.production
RUN echo "VITE_TEXACORE_MODE=selfhosted" >> .env.production
RUN echo "VITE_APP_VERSION=1.2.0" >> .env.production
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config for SPA routing
RUN cat > /etc/nginx/conf.d/default.conf << 'NGINX'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Healthcheck
    location /health {
        add_header Content-Type text/plain;
        return 200 'healthy';
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Config injection point (desktop mode)
    location /config.js {
        add_header Cache-Control "no-cache";
        try_files /config.js =404;
    }
}
NGINX

# Create entrypoint to inject config
RUN cat > /entrypoint.sh << 'EOF'
#!/bin/sh
cat > /usr/share/nginx/html/config.js << CONFIG
window.__TEXACORE_CONFIG__ = {
  supabaseUrl: '${SUPABASE_URL:-http://localhost:8888}',
  supabaseKey: '${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WO_eo0y4lHl1pBdvVu_mkwMvO1s22qwpM3C0}',
  mode: 'selfhosted',
  licensingUrl: '${LICENSING_SERVER_URL}'
};
CONFIG
exec nginx -g "daemon off;"
EOF
RUN chmod +x /entrypoint.sh

EXPOSE 80
CMD ["/entrypoint.sh"]
AEOF

docker build \
  -f "$DOCKER_DIR/.Dockerfile.app.tmp" \
  -t "$REGISTRY/texacore-app:$VERSION" \
  -t "$REGISTRY/texacore-app:latest" \
  "$PROJECT_ROOT"

rm -f "$DOCKER_DIR/.Dockerfile.app.tmp"
echo "✅ texacore-app built successfully"

# ─── 3. Push if requested ─────────────────────────────────
if [ "$PUSH" = true ]; then
  echo ""
  echo "🚀 Pushing images to $REGISTRY..."
  docker push "$REGISTRY/texacore-db:$VERSION"
  docker push "$REGISTRY/texacore-db:latest"
  docker push "$REGISTRY/texacore-app:$VERSION"
  docker push "$REGISTRY/texacore-app:latest"
  echo "✅ All images pushed!"
fi

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ Build Complete!"
echo ""
echo "  Images:"
echo "    $REGISTRY/texacore-db:$VERSION"
echo "    $REGISTRY/texacore-app:$VERSION"
echo ""
echo "  Run locally:"
echo "    cd docker && docker compose up -d"
echo "═══════════════════════════════════════════"
