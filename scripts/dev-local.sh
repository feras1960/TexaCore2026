#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║  TexaCore Local Development — Single Source of Truth         ║
# ║  Starts backend (Electron) + frontend (Vite dev server)      ║
# ║  Use: http://localhost:5173 for development (hot reload)     ║
# ╚══════════════════════════════════════════════════════════════╝

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INSTALLER_DIR="$SCRIPT_DIR/texacore-installer"

echo "🚀 TexaCore Local Development Mode"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Kill any conflicting servers ──────────────────────────
echo "🔄 Cleaning up old processes..."

# Kill Vite preview (port 4173)
lsof -ti:4173 2>/dev/null | xargs kill -9 2>/dev/null || true
# Kill old Vite dev (port 5173)  
lsof -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null || true
# Kill old Electron (port 1960)
lsof -ti:1960 2>/dev/null | xargs kill -9 2>/dev/null || true

sleep 1

# ── 2. Start Electron backend (PostgreSQL + PostgREST + GoTrue + API) ──
echo "⚡ Starting backend services (Electron)..."
cd "$INSTALLER_DIR"
npx electron . > /dev/null 2>&1 &
ELECTRON_PID=$!

# Wait for API server to be ready
echo -n "   Waiting for API (port 1960)..."
for i in $(seq 1 30); do
    if curl -s http://127.0.0.1:1960/api/ping > /dev/null 2>&1; then
        echo " ✅"
        break
    fi
    echo -n "."
    sleep 1
done

# ── 3. Start Vite dev server (frontend with hot reload) ────
echo "🌐 Starting Vite dev server..."
cd "$SCRIPT_DIR"
npx vite --host --port 5173 &
VITE_PID=$!

sleep 2

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TexaCore Development Ready!"
echo ""
echo "   🌐 Frontend (dev):  http://localhost:5173"
echo "   🔌 Backend API:     http://localhost:1960"  
echo "   🗄️  Database:       localhost:54322"
echo ""
echo "   ⚠️  Do NOT use localhost:4173 or localhost:8080"
echo "   📦 To build:  npm run build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop all services"

# ── 4. Cleanup on exit ───────────────────────────────────────
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $VITE_PID 2>/dev/null || true
    kill $ELECTRON_PID 2>/dev/null || true
    # Also kill child processes
    lsof -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null || true
    lsof -ti:1960 2>/dev/null | xargs kill -9 2>/dev/null || true
    echo "✅ All services stopped"
}
trap cleanup EXIT INT TERM

# Wait for either process to exit
wait
