# 📞 TexaCore Softphone — Phases 2-5 Instructions

---

## Phase 2: SIP Engine & Call Management

### Objective: Full SIP calling capability in Main Process

### Tasks:
1. **sip-engine.ts** — Complete SIP.js integration in Node.js Main Process:
   - `register()` / `unregister()` with auto-reconnect
   - `makeCall(number)` — outbound SIP INVITE
   - `answerCall()` — accept incoming INVITATION  
   - `hangupCall()` — terminate/reject
   - `toggleMute()` / `toggleHold()` / `sendDTMF(digit)`
   - `transferCall(target)` — blind transfer

2. **Audio handling** — Use Electron's built-in audio:
   - Play ringtone on incoming call (native sound)
   - Route call audio through system default devices
   - Device selection (microphone + speaker) via Settings

3. **Native Notifications** on incoming call:
   - Show OS notification with caller number
   - "Answer" and "Reject" action buttons on notification
   - Flash tray icon during ring

4. **IPC Events** (main → renderer):
   - `sip:registered` / `sip:unregistered` / `sip:error`
   - `call:incoming` / `call:connecting` / `call:connected` / `call:ended`
   - `call:muted` / `call:held`

### Test: Make a call to extension 100, verify audio works both ways.

---

## Phase 3: ERP Integration via Supabase

### Objective: Sync softphone state with ERP dashboard

### Tasks:
1. **Supabase Realtime Presence** — Track desktop softphone:
   ```typescript
   channel.track({
     type: 'desktop_softphone',
     extension: '100',
     status: 'registered', // or 'in-call', 'ringing'
     device: 'desktop',
     app_version: '1.0.0'
   });
   ```

2. **Receive commands from ERP** via broadcast:
   - Listen for `dial` event → auto-dial the number
   - Listen for `transfer` event → transfer active call
   - Respond with `call_status` updates

3. **Contacts from ERP** — Fetch from Supabase:
   - Query `parties` table for customers with phone numbers
   - Query `extensions` for internal extensions
   - Show caller name on incoming if matched

4. **CDR logging** — Log calls to Supabase:
   - Insert into `call_logs` table: caller, callee, duration, direction, timestamp

### Test: Open ERP, click "اتصال" on a contact, verify Desktop app dials automatically.

---

## Phase 4: Advanced Features

### Objective: Professional-grade softphone experience

### Tasks:
1. **URL Scheme** `texacore://call/+905xxxxxxxxx`:
   - Register protocol handler on install
   - Parse number from URL and initiate call

2. **Keyboard Shortcuts**:
   - `Ctrl+Enter` or `Cmd+Enter` = Answer
   - `Ctrl+H` = Hangup
   - `Ctrl+M` = Mute toggle

3. **Call History** tab:
   - Store locally in electron-store
   - Show: number, direction (↗️ outbound / ↙️ inbound / ❌ missed), duration, time
   - Click to redial

4. **Settings** tab:
   - PBX server configuration
   - Audio device selection (input/output)
   - Auto-launch on system startup
   - Always-on-top toggle
   - Language selection (AR/EN)

5. **Auto-launch** on system startup via `auto-launch` npm package

---

## Phase 5: Build & Distribution

### Objective: Installable packages for Windows, Mac, Linux

### Tasks:
1. **electron-builder.yml** configuration:
   ```yaml
   appId: com.texacore.softphone
   productName: TexaCore Softphone
   directories:
     output: build
   win:
     target: [nsis, portable]
     icon: assets/icon.ico
   mac:
     target: [dmg]
     icon: assets/icon.icns
     category: public.app-category.business
   linux:
     target: [AppImage]
     icon: assets/icon.png
   ```

2. **Build commands**:
   ```bash
   npm run build          # Build all platforms
   npm run build:win      # Windows only
   npm run build:mac      # Mac only
   ```

3. **Auto-updater** via `electron-updater`:
   - Check GitHub Releases for new versions
   - Download and install silently in background
   - Notify user when update ready

4. **GitHub repository** setup:
   - Create `texacore-softphone` repo
   - Push code
   - Create first release with built packages

### Test: Install on a clean machine, verify it connects and makes calls.
