#!/bin/sh
# ════════════════════════════════════════════════════════════════
# 🚀 TexaCore Self-Hosted — Entrypoint Script
# ════════════════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════════════"
echo "🏭 TexaCore Self-Hosted v${APP_VERSION:-1.0.0}"
echo "═══════════════════════════════════════════════"

# ─── 1. Generate Hardware ID ──────────────────────────────────
CPU_HASH=$(cat /proc/cpuinfo 2>/dev/null | grep -m1 "model name" | md5sum | cut -d' ' -f1 || echo "unknown")
MAC_ADDR=$(cat /sys/class/net/eth0/address 2>/dev/null | tr -d ':' || echo "000000000000")
DISK_HASH=$(cat /proc/diskstats 2>/dev/null | head -1 | md5sum | cut -d' ' -f1 || echo "unknown")
HARDWARE_ID="CPU-${CPU_HASH%${CPU_HASH#????????}}-MAC-${MAC_ADDR}-DISK-${DISK_HASH%${DISK_HASH#????????}}"

mkdir -p /etc/texacore
echo "$HARDWARE_ID" > /etc/texacore/hardware_id
echo "🔑 Hardware ID: $HARDWARE_ID"

# ─── 2. Inject Config into index.html ─────────────────────────
INDEX_FILE="/usr/local/openresty/nginx/html/index.html"

if [ -f "$INDEX_FILE" ]; then
    # Use Python-style injection to avoid sed special char issues
    SUPABASE_URL_VAL="${SUPABASE_URL:-}"
    SUPABASE_KEY_VAL="${SUPABASE_ANON_KEY:-}"
    LICENSING_URL_VAL="${LICENSING_SERVER_URL:-https://wzkklenfsaepegymfxfz.supabase.co/functions/v1}"
    APP_VERSION_VAL="${APP_VERSION:-1.0.0}"

    # Create config file separately
    cat > /tmp/texacore_config.js <<CONFIGEOF
<script>window.__TEXACORE_CONFIG__={"supabaseUrl":"${SUPABASE_URL_VAL}","supabaseKey":"${SUPABASE_KEY_VAL}","mode":"selfhosted","licensingUrl":"${LICENSING_URL_VAL}","version":"${APP_VERSION_VAL}"};</script>
CONFIGEOF

    CONFIG_CONTENT=$(cat /tmp/texacore_config.js)
    
    # Use awk instead of sed to avoid special character issues
    awk -v config="$CONFIG_CONTENT" '{gsub(/<\/head>/, config"</head>"); print}' "$INDEX_FILE" > "${INDEX_FILE}.tmp"
    mv "${INDEX_FILE}.tmp" "$INDEX_FILE"
    rm -f /tmp/texacore_config.js
    
    echo "✅ Config injected into index.html"
fi

# ─── 3. Replace placeholders in nginx.conf ────────────────────
NGINX_CONF="/usr/local/openresty/nginx/conf/nginx.conf"
sed -i "s|__APP_VERSION__|${APP_VERSION:-1.0.0}|g" "$NGINX_CONF"

# ─── 4. License Activation ────────────────────────────────────
LICENSE_FILE="/etc/texacore/license.json"
LICENSING_URL="${LICENSING_SERVER_URL:-https://wzkklenfsaepegymfxfz.supabase.co/functions/v1}"

if [ ! -f "$LICENSE_FILE" ] && [ -n "$LICENSE_KEY" ]; then
    OS_INFO=$(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d '"' || echo "Docker Alpine")
    HOSTNAME_VAL=$(hostname)

    # Check if this is a Trial key (TRL-) — use trial endpoint
    if echo "$LICENSE_KEY" | grep -q "^TRL-"; then
        echo "🆓 Trial key detected, activating via trial endpoint..."
        ACTIVATION_RESULT=$(curl -sf --max-time 15 -X POST "${LICENSING_URL}/license-trial" \
            -H "Content-Type: application/json" \
            -d "{\"hardware_id\":\"${HARDWARE_ID}\",\"os_info\":\"${OS_INFO}\",\"hostname\":\"${HOSTNAME_VAL}\"}" \
            2>/dev/null || echo "")

        if [ -n "$ACTIVATION_RESULT" ]; then
            SUCCESS=$(echo "$ACTIVATION_RESULT" | jq -r '.success // false' 2>/dev/null)
            # trial_already_exists also means we have a license
            HAS_LICENSE=$(echo "$ACTIVATION_RESULT" | jq -r '.license // empty' 2>/dev/null)
            if [ "$SUCCESS" = "true" ] || [ -n "$HAS_LICENSE" ]; then
                echo "$ACTIVATION_RESULT" | jq '.license' > "$LICENSE_FILE"
                echo "✅ Trial license activated!"
            else
                ERROR=$(echo "$ACTIVATION_RESULT" | jq -r '.error // "Unknown"' 2>/dev/null)
                echo "⚠️  Trial activation: $ERROR"
            fi
        fi
    else
        # Regular license key — use activate endpoint
        echo "🔐 Activating license..."
        ACTIVATION_RESULT=$(curl -sf --max-time 15 -X POST "${LICENSING_URL}/license-activate" \
            -H "Content-Type: application/json" \
            -d "{\"license_key\":\"${LICENSE_KEY}\",\"hardware_id\":\"${HARDWARE_ID}\",\"os_info\":\"${OS_INFO}\",\"hostname\":\"${HOSTNAME_VAL}\"}" \
            2>/dev/null || echo "")

        if [ -n "$ACTIVATION_RESULT" ]; then
            SUCCESS=$(echo "$ACTIVATION_RESULT" | jq -r '.success // false' 2>/dev/null)
            if [ "$SUCCESS" = "true" ]; then
                echo "$ACTIVATION_RESULT" | jq '.license' > "$LICENSE_FILE"
                TIER=$(echo "$ACTIVATION_RESULT" | jq -r '.license.tier' 2>/dev/null)
                EXPIRES=$(echo "$ACTIVATION_RESULT" | jq -r '.license.expires_at' 2>/dev/null)
                echo "✅ License activated!"
                echo "   Tier: $TIER"
                echo "   Expires: $EXPIRES"
            else
                ERROR=$(echo "$ACTIVATION_RESULT" | jq -r '.error // "Unknown error"' 2>/dev/null)
                echo "❌ Activation failed: $ERROR"
            fi
        else
            echo "⚠️  Cannot reach licensing server"
        fi
    fi
elif [ -f "$LICENSE_FILE" ]; then
    echo "✅ License file found (cached)"
fi

# ─── 5. Heartbeat Background Process ─────────────────────────
(
    sleep 60  # Wait 1 minute before first heartbeat
    while true; do
        if [ -f "$LICENSE_FILE" ]; then
            LIC_KEY=$(jq -r '.license_key' "$LICENSE_FILE" 2>/dev/null)
            if [ -n "$LIC_KEY" ] && [ "$LIC_KEY" != "null" ]; then
                curl -sf --max-time 10 -X POST "${LICENSING_URL}/license-heartbeat" \
                    -H "Content-Type: application/json" \
                    -d "{\"license_key\":\"${LIC_KEY}\",\"hardware_id\":\"${HARDWARE_ID}\",\"app_version\":\"${APP_VERSION:-1.0.0}\"}" \
                    > /dev/null 2>&1 && echo "[$(date '+%Y-%m-%d %H:%M')] 💓 Heartbeat OK" \
                    || echo "[$(date '+%Y-%m-%d %H:%M')] ⚠️ Heartbeat failed"
            fi
        fi
        sleep 86400  # Every 24 hours
    done
) &
echo "💓 Heartbeat service started"

# ─── 6. Create log directory ──────────────────────────────────
mkdir -p /var/log/openresty

echo "═══════════════════════════════════════════════"
echo "🚀 TexaCore is ready! → http://localhost:${APP_PORT:-80}"
echo "═══════════════════════════════════════════════"

# ─── 7. Start OpenResty ───────────────────────────────────────
exec "$@"
