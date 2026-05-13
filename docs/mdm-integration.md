# TexaCore MDM Integration Documentation (MeshCentral)

This document outlines the architecture, configuration, and future steps for the Mobile Device Management (MDM) module within the TexaCore ERP, powered by a dedicated MeshCentral server.

## 1. Architecture Overview

The MDM integration bridges three main components:
1. **Frontend (TexaCore ERP):** Provides the UI for managing devices. The `DeviceDetailsSheet` component embeds MeshCentral interfaces using secure IFrames.
2. **Backend Proxy (Supabase Edge Function):** The `mdm-proxy` acts as a secure middleman, handling database authentication, tenant filtering (Company/Branch), and querying the MeshCentral API without exposing admin credentials to the frontend.
3. **MeshCentral Server (VPS):** A dedicated server hosted on Hostinger running the MeshCentral Docker container. It manages WebSocket connections and remote control sessions with client devices.

## 2. Server Configuration

- **IP Address:** `153.92.222.17`
- **Deployment:** Docker (`typhonragewind/meshcentral` image)
- **Volumes:** `/opt/meshcentral/meshcentral-data` & `/opt/meshcentral/meshcentral-files`
- **Security & Networking:** 
  - Hostinger Firewall strictly allows ports `22` (SSH), `80` (HTTP), and `443` (HTTPS).
  - Internal Docker mapping explicitly binds `80:80` and `443:443`.

### Critical Configurations (`config.json`)
To enable seamless IFrame embedding within the ERP, the following flags were enabled in `/opt/meshcentral/meshcentral-data/config.json`:
- `"IFRAME": true` (Allows MeshCentral to be loaded inside an HTML `<iframe>`)
- `"SessionSameSite": "none"` (Ensures authentication cookies work cross-domain between the ERP and the VPS).

## 3. Auto-Login Mechanism

To prevent users from seeing the MeshCentral login screen, an Auto-Login mechanism has been implemented:
1. The IFrame URLs in `DeviceDetailsSheet.tsx` dynamically append `&user=...&pass=...` alongside the `&hide=1` parameter.
2. MeshCentral natively processes these URL parameters (when properly configured) to authenticate the session silently in the background.
3. Once authenticated, the `xid` cookie is stored in the browser (with `SameSite=none; Secure`), maintaining the session seamlessly across the Remote Desktop, Terminal, and Files tabs.

## 4. Testing & Diagnostics

A diagnostic script has been created to test the complete bridge pipeline automatically.
**Run the diagnostic script locally:**
```bash
node scripts/test-meshcentral-bridge.mjs
```
The script verifies:
1. VPS 443 Port availability.
2. Authentication API responsiveness.
3. IFrame Auto-Login URL integrity.

## 5. Next Steps (Installer Bundling)

To transition this from a testing environment to a production-ready client deployment, the following steps must be completed before finalizing the `texacore-installer`:

### 5.1. Agent (MeshAgent) Bundling
1. Create a **Device Group** inside the MeshCentral dashboard (e.g., "TexaCore Clients").
2. Download the executable `MeshAgent.exe` for Windows.
3. Place `MeshAgent.exe` inside the `texacore-installer/bin/` folder.
4. Update the installer script (`installer.js` or InnoSetup script) to execute `MeshAgent.exe -fullinstall` silently in the background.

### 5.2. Edge Function Finalization
Currently, the `mdm-proxy` Edge Function returns mock data to test the UI. Once the Agent is deployed and devices start connecting to MeshCentral:
1. Update `mdm-proxy/index.ts` to fetch real devices using `mcApi.getDevices()`.
2. Implement Tenant Filtering logic so that each ERP customer only sees devices tagged with their specific `tenant_id` or `company_id`.

---
*Documented on: May 2026*
