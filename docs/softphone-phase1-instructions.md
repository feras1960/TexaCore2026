# 📞 TexaCore Softphone — Phase 1 Instructions for Gemini

## Goal
Create an Electron + React + TypeScript softphone app at `/Users/macbook/TexaCore-Backups-2026-03-25/texacore-softphone/`

## Step 1: Initialize Project
```bash
cd /Users/macbook/TexaCore-Backups-2026-03-25/texacore-softphone
npm init -y
npm install electron electron-builder --save-dev
npm install react react-dom sip.js @supabase/supabase-js
npm install typescript @types/react @types/react-dom ts-node --save-dev
npm install vite @vitejs/plugin-react --save-dev
```

## Step 2: Project Structure
```
texacore-softphone/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.yml
├── src/
│   ├── main/           # Electron Main Process
│   │   ├── index.ts    # App entry, window creation, tray
│   │   ├── sip-engine.ts  # SIP.js running in Node.js (NOT browser)
│   │   ├── tray.ts     # System tray icon + menu
│   │   └── ipc-handlers.ts # IPC between main<->renderer
│   ├── preload/
│   │   └── index.ts    # contextBridge for security
│   ├── renderer/       # React UI
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── app.css
│   │   └── components/
│   │       ├── Dialpad.tsx
│   │       ├── CallScreen.tsx
│   │       ├── StatusBar.tsx
│   │       └── Settings.tsx
│   └── shared/
│       └── types.ts
└── assets/
    └── icon.png
```

## Step 3: Key Configuration

### package.json scripts
```json
{
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"tsc -p tsconfig.main.json --watch\" \"electron .\"",
    "build": "vite build && tsc -p tsconfig.main.json && electron-builder"
  }
}
```

### Window Size: 380x650px, resizable: false, alwaysOnTop option

## Step 4: SIP Engine (CRITICAL — runs in Main Process)

The SIP engine MUST run in the Main Process (Node.js), NOT in the renderer. This is the whole point — Node.js never gets throttled.

### sip-engine.ts key features:
- Connect to `wss://pbx.texacore.ai:8089/ws`
- Register with extension 100, password from settings
- Handle: makeCall, answerCall, hangupCall, toggleMute, sendDTMF
- Emit events via IPC to renderer: `call-state-changed`, `registration-changed`, `incoming-call`
- Auto-reconnect on disconnect (exponential backoff)

## Step 5: UI Design Requirements

### Theme: TexaCore Green (#10b981) on dark background (#0f172a)
### Font: Tajawal (Google Fonts) for Arabic support
### Direction: RTL
### Tabs at bottom: لوحة المفاتيح | السجل | الإعدادات

### Dialpad: 3x4 grid + call button, large touch-friendly buttons
### Call Screen: caller name/number, timer, mute/hold/transfer/keypad buttons, red hangup
### Status Bar: green dot = registered, red = disconnected, yellow = connecting

## Step 6: System Tray
- Show app icon in system tray
- Right-click menu: Show/Hide, Status, Quit
- Flash/animate icon on incoming call
- Click tray icon = show/hide window
- Close window = minimize to tray (don't quit)

## PBX Config (for testing)
```
PBX Domain: pbx.texacore.ai
WSS Port: 8089
Extension: 100
Password: TexaCore2026Pbx100
```

## Supabase Config (for Realtime integration with ERP)
```
URL: https://wzkklenfsaepegymfxfz.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2tsZW5mc2FlcGVneW1meGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTIxNzcsImV4cCI6MjA4NDMyODE3N30.ATYSK_WvOfbqEaInbg5nKau-wgixF0lIGaue3m8AJtI
```

## IMPORTANT NOTES:
1. SIP.js version: use `sip.js@0.21.2` (latest stable, supports Node.js)
2. Audio in Electron: use `electron`'s native audio, not Web Audio API
3. The app should work standalone — no dependency on ERP being open
4. Arabic UI, RTL direction throughout
5. Premium dark design matching TexaCore branding
