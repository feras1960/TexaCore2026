#!/bin/bash
# ===================================================================
# TexaCore PBX — Deploy Click-to-Call Config to Asterisk Server
# Run: bash deploy-ctc-config.sh
# You'll be prompted for SSH password
# ===================================================================

PBX_HOST="pbx.texacore.ai"
PBX_USER="root"

echo "═══════════════════════════════════════════════════"
echo "  TexaCore PBX — Click-to-Call Deployment Script"
echo "═══════════════════════════════════════════════════"
echo ""

# Step 1: Upload config files
echo "📤 Uploading pjsip_webrtc_guest.conf..."
scp -o StrictHostKeyChecking=no \
    asterisk-configs/pjsip_webrtc_guest.conf \
    ${PBX_USER}@${PBX_HOST}:/etc/asterisk/pjsip_webrtc_guest.conf

echo "📤 Uploading extensions_click_to_call.conf..."
scp -o StrictHostKeyChecking=no \
    asterisk-configs/extensions_click_to_call.conf \
    ${PBX_USER}@${PBX_HOST}:/etc/asterisk/extensions_click_to_call.conf

# Step 2: Add #include to main configs (if not already added)
echo "🔧 Adding #include directives..."
ssh -o StrictHostKeyChecking=no ${PBX_USER}@${PBX_HOST} << 'REMOTE'
    # Add include to pjsip.conf if not already present
    grep -q "pjsip_webrtc_guest.conf" /etc/asterisk/pjsip.conf || \
        echo '#include "pjsip_webrtc_guest.conf"' >> /etc/asterisk/pjsip.conf

    # Add include to extensions.conf if not already present
    grep -q "extensions_click_to_call.conf" /etc/asterisk/extensions.conf || \
        echo '#include "extensions_click_to_call.conf"' >> /etc/asterisk/extensions.conf

    # Reload Asterisk config
    echo "🔄 Reloading Asterisk..."
    asterisk -rx "module reload res_pjsip.so"
    asterisk -rx "dialplan reload"
    
    echo "✅ Verifying endpoint..."
    asterisk -rx "pjsip show endpoint webrtc-guest"
REMOTE

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ Deployment Complete!"
echo "  Test by refreshing your landing page and clicking"
echo "  the 'اتصل بنا مجاناً' button."
echo "═══════════════════════════════════════════════════"
