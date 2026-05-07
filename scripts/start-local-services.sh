#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║  TexaCore — تشغيل النسخة الهجينة المحلية (بدون Electron)        ║
# ║  يشغّل: PostgreSQL → PostgREST → GoTrue → API Proxy → Vite     ║
# ║  الاستخدام: bash scripts/start-local-services.sh                ║
# ╚══════════════════════════════════════════════════════════════════╝

set -e

# ─── Paths ────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ARCH=$(uname -m)
[[ "$ARCH" == "arm64" ]] && PLATFORM="macos-arm64" || PLATFORM="macos-x64"
BINS="$SCRIPT_DIR/texacore-installer/bin/$PLATFORM"
PGDATA="$HOME/Library/Application Support/texacore-installer/texacore-data/pgdata"
DATADIR="$HOME/Library/Application Support/texacore-installer/texacore-data"
LOGDIR="$DATADIR/logs"

# ─── Constants (must match service-manager.js) ────────────────────
PG_PORT=54322
POSTGREST_PORT=3000
GOTRUE_PORT=9999
API_PORT=54321
DB_PASS="texacore-local-super-secret"
JWT_SECRET="texacore-jwt-secret-at-least-32-characters-long"

# ─── Colors ───────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ─── Ensure directories ──────────────────────────────────────────
mkdir -p "$LOGDIR"

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║  🚀 TexaCore Hybrid Local Server              ║${NC}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ─── Verify binaries exist ────────────────────────────────────────
if [ ! -f "$BINS/pg/bin/postgres" ]; then
  echo -e "${RED}❌ PostgreSQL binary not found at: $BINS/pg/bin/postgres${NC}"
  exit 1
fi
if [ ! -f "$BINS/postgrest/postgrest" ]; then
  echo -e "${RED}❌ PostgREST binary not found at: $BINS/postgrest/postgrest${NC}"
  exit 1
fi
if [ ! -f "$BINS/gotrue/auth" ]; then
  echo -e "${RED}❌ GoTrue binary not found at: $BINS/gotrue/auth${NC}"
  exit 1
fi

# ─── Cleanup function ────────────────────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}🛑 Stopping all services...${NC}"
  
  # Kill processes by port
  lsof -ti:$PG_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti:$POSTGREST_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti:$GOTRUE_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti:$API_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti:1960 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti:5174 2>/dev/null | xargs kill -9 2>/dev/null || true
  
  # Graceful PG shutdown
  "$BINS/pg/bin/pg_ctl" -D "$PGDATA" stop -m fast 2>/dev/null || true
  
  echo -e "${GREEN}✅ All services stopped${NC}"
}
trap cleanup EXIT INT TERM

# ─── Step 1: Kill conflicting processes ───────────────────────────
echo -e "${YELLOW}🔄 Cleaning up old processes...${NC}"
lsof -ti:$PG_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:$POSTGREST_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:$GOTRUE_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:$API_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:1960 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:5174 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

# ─── Step 2: Check if database is initialized ────────────────────
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo -e "${RED}❌ Database not initialized at: $PGDATA${NC}"
  echo -e "${YELLOW}   Run Electron installer first to initialize the database.${NC}"
  exit 1
fi

# ─── Step 3: Start PostgreSQL ─────────────────────────────────────
echo -e "${CYAN}⚡ Starting PostgreSQL on port $PG_PORT...${NC}"
LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 PGDATA="$PGDATA" \
  "$BINS/pg/bin/postgres" -D "$PGDATA" -p $PG_PORT -k /tmp \
  > "$LOGDIR/postgres.log" 2>&1 &
PG_PID=$!

# Wait for PostgreSQL
echo -n "   Waiting for PostgreSQL"
for i in $(seq 1 30); do
  if "$BINS/pg/bin/pg_isready" -p $PG_PORT -h localhost > /dev/null 2>&1; then
    echo -e " ${GREEN}✅${NC}"
    break
  fi
  echo -n "."
  sleep 0.5
done

if ! "$BINS/pg/bin/pg_isready" -p $PG_PORT -h localhost > /dev/null 2>&1; then
  echo -e " ${RED}❌ PostgreSQL failed to start!${NC}"
  echo "   Check log: $LOGDIR/postgres.log"
  exit 1
fi

# ─── Step 4: Start PostgREST ─────────────────────────────────────
echo -e "${CYAN}⚡ Starting PostgREST on port $POSTGREST_PORT...${NC}"

# Write PostgREST config
cat > "$DATADIR/postgrest.conf" << EOF
db-uri = "postgres://authenticator:${DB_PASS}@127.0.0.1:${PG_PORT}/postgres"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "${JWT_SECRET}"
server-port = ${POSTGREST_PORT}
server-host = "127.0.0.1"
db-use-legacy-gucs = false
app-settings.jwt_secret = "${JWT_SECRET}"
EOF

"$BINS/postgrest/postgrest" "$DATADIR/postgrest.conf" \
  > "$LOGDIR/postgrest.log" 2>&1 &
POSTGREST_PID=$!

# Wait for PostgREST
echo -n "   Waiting for PostgREST"
for i in $(seq 1 20); do
  if curl -sf http://127.0.0.1:$POSTGREST_PORT/ > /dev/null 2>&1; then
    echo -e " ${GREEN}✅${NC}"
    break
  fi
  echo -n "."
  sleep 0.5
done

# ─── Step 5: Start GoTrue ────────────────────────────────────────
echo -e "${CYAN}⚡ Starting GoTrue on port $GOTRUE_PORT...${NC}"

GOTRUE_API_HOST=127.0.0.1 \
GOTRUE_API_PORT=$GOTRUE_PORT \
API_EXTERNAL_URL="http://localhost:$API_PORT" \
GOTRUE_DB_DRIVER=postgres \
GOTRUE_DB_DATABASE_URL="postgres://supabase_auth_admin:${DB_PASS}@127.0.0.1:${PG_PORT}/postgres?search_path=auth" \
GOTRUE_SITE_URL="http://localhost:$API_PORT" \
GOTRUE_DISABLE_SIGNUP=false \
GOTRUE_JWT_ADMIN_ROLES=service_role \
GOTRUE_JWT_AUD=authenticated \
GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated \
GOTRUE_JWT_EXP=3600 \
GOTRUE_JWT_SECRET="$JWT_SECRET" \
GOTRUE_MAILER_AUTOCONFIRM=true \
GOTRUE_SMS_AUTOCONFIRM=true \
GOTRUE_EXTERNAL_EMAIL_ENABLED=true \
GOTRUE_EXTERNAL_PHONE_ENABLED=false \
DATABASE_URL="postgres://supabase_auth_admin:${DB_PASS}@127.0.0.1:${PG_PORT}/postgres?search_path=auth" \
  "$BINS/gotrue/auth" serve \
  > "$LOGDIR/gotrue.log" 2>&1 &
GOTRUE_PID=$!

# Wait for GoTrue
echo -n "   Waiting for GoTrue"
for i in $(seq 1 20); do
  if curl -sf http://127.0.0.1:$GOTRUE_PORT/health > /dev/null 2>&1; then
    echo -e " ${GREEN}✅${NC}"
    break
  fi
  echo -n "."
  sleep 0.5
done

# ─── Step 6: Start Vite + API Proxy ──────────────────────────────
echo -e "${CYAN}🌐 Starting Vite dev server + API Proxy...${NC}"
cd "$SCRIPT_DIR"
npm run dev:local &
VITE_PID=$!

sleep 3

# ─── Summary ─────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}✅ TexaCore Hybrid Server — All Services Ready!${NC}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "   ${BOLD}🔀 Hybrid Dev:${NC}     ${CYAN}http://localhost:5174/${NC}"
echo -e "   ${BOLD}🗄️  PostgreSQL:${NC}    localhost:$PG_PORT"
echo -e "   ${BOLD}📡 PostgREST:${NC}      localhost:$POSTGREST_PORT"
echo -e "   ${BOLD}🔐 GoTrue:${NC}         localhost:$GOTRUE_PORT"
echo -e "   ${BOLD}🔌 API Proxy:${NC}      localhost:$API_PORT"
echo -e "   ${BOLD}🖥️  Local API:${NC}     localhost:1960"
echo ""
echo -e "   ${BOLD}📋 Logs:${NC} $LOGDIR/"
echo ""
echo -e "   ${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for processes
wait
