# TexaCore Softphone — Premium Upgrade Instructions

## 📍 Project Location
```
/Users/macbook/TexaCore-Backups-2026-03-25/erpsystem supabase/texacore-softphone/
```

## 📍 Current State
The softphone is a working Electron + React + TypeScript app with:
- SIP.js engine (`src/renderer/hooks/useSipEngine.ts`) — working registration & calls
- Supabase Realtime sync (`src/renderer/hooks/useSupabase.ts`) — receives config from ERP
- Basic UI: Dialpad, Settings, Call Screen
- System Tray support in `src/main/index.ts`

## 🎯 Goal
Transform the basic softphone into a **premium, professional desktop softphone** comparable to 3CX, Zoiper, or Bria. The app window is **380×650px** (phone-sized, non-resizable).

---

## Phase 1: Premium UI Overhaul + Bug Fixes

### 1.1 Fix: Clear number after call ends
In `src/renderer/App.tsx`, when `callState` returns to `'idle'`, clear `target`:
```tsx
useEffect(() => {
  if (callState === 'idle') setTarget('');
}, [callState]);
```

### 1.2 Redesign `app.css` — Premium Dark Theme
Replace the entire CSS with a premium design:
- **Background**: Deep gradient `linear-gradient(180deg, #0a0e1a 0%, #111827 100%)`
- **Accent color**: Emerald `#10b981` for active states, Red `#ef4444` for hangup
- **Cards**: Use `backdrop-filter: blur(12px)` glassmorphism with `rgba(255,255,255,0.05)` backgrounds
- **Dialpad keys**: Rounded squares (not circles), with subtle hover glow `box-shadow: 0 0 15px rgba(16,185,129,0.3)`
- **Fonts**: Keep Tajawal, use `font-weight: 300` for numbers, `500` for labels
- **Transitions**: All interactive elements need `transition: all 0.2s ease`
- **Status bar**: Full-width gradient bar at top showing connection status with animated pulse dot
- **Bottom nav**: 4 tabs with icons (لوحة المفاتيح, السجل, جهات الاتصال, الإعدادات) — use SVG icons or emoji

### 1.3 Redesign `App.tsx` — Tab Navigation
Replace `activeTab` with 4 tabs: `'dialpad' | 'history' | 'contacts' | 'settings'`

Add a **user status indicator** at the top showing:
- Extension number (e.g., "Ext. 100")
- Status dot (green=available, yellow=away, red=busy, gray=offline)
- Status text

### 1.4 Enhanced Call Screen
When a call is active (`callState !== 'idle'`), show:
- Large caller number centered
- **Call timer** (MM:SS format, counting up from call start)
- Action buttons row: Mute 🎤, Hold ⏸️, Keypad #️⃣, Transfer ↗️
- Large red "End Call" button at bottom
- Animated ring pulse effect when `callState === 'ringing'`

Add to `useSipEngine.ts`:
```tsx
const [isMuted, setIsMuted] = useState(false);
const [isOnHold, setIsOnHold] = useState(false);

const toggleMute = () => {
  const session = sessionRef.current;
  if (session?.sessionDescriptionHandler) {
    const pc = session.sessionDescriptionHandler.peerConnection;
    pc?.getSenders().forEach(sender => {
      if (sender.track?.kind === 'audio') {
        sender.track.enabled = !sender.track.enabled;
        setIsMuted(!sender.track.enabled);
      }
    });
  }
};

const toggleHold = async () => {
  const session = sessionRef.current;
  if (!session) return;
  if (isOnHold) {
    await session.invite({ sessionDescriptionHandlerModifiers: [] }); // unhold
  } else {
    await session.invite({
      sessionDescriptionHandlerModifiers: [
        (desc) => { /* set sendonly */ }
      ]
    });
  }
  setIsOnHold(!isOnHold);
};
```

Return `isMuted, isOnHold, toggleMute, toggleHold` from the hook.

### 1.5 New Component: `UserStatusBar.tsx`
A compact header showing:
```
[●] Ext. 100 | متصل بالسنترال    [⚙️]
```
Clicking the dot opens a dropdown: متاح، مشغول، عدم الإزعاج، غائب

---

## Phase 2: Call History

### 2.1 New file: `src/renderer/hooks/useCallHistory.ts`
Store call history in `localStorage` as JSON array:
```ts
interface CallRecord {
  id: string;        // uuid
  number: string;
  direction: 'inbound' | 'outbound' | 'missed';
  timestamp: string; // ISO
  duration: number;  // seconds
}
```
- Max 200 records, FIFO
- Export `addCallRecord`, `getCallHistory`, `clearHistory`
- Hook into `useSipEngine`: when call ends, save record with duration

### 2.2 New component: `src/renderer/components/CallHistory.tsx`
- 3 filter tabs: الكل | صادرة | واردة | فائتة
- Each row shows: direction icon (↗️/↙️/❌), number, time ago, duration
- Tap on a row → call that number
- Swipe/long-press to delete
- "مسح السجل" button at bottom

---

## Phase 3: Contacts (ERP Integration)

### 3.1 New file: `src/renderer/hooks/useContacts.ts`
Fetch contacts from Supabase Cloud:
```ts
const supabaseUrl = 'https://wzkklenfsaepegymfxfz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2tsZW5mc2FlcGVneW1meGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTIxNzcsImV4cCI6MjA4NDMyODE3N30.ATYSK_WvOfbqEaInbg5nKau-wgixF0lIGaue3m8AJtI';
```
Query `parties` table:
```sql
SELECT id, name, phone, mobile, party_type FROM parties 
WHERE (phone IS NOT NULL OR mobile IS NOT NULL)
AND company_id = (stored_company_id)
ORDER BY name
```
- Cache in localStorage, refresh on app start
- Search by name or number

### 3.2 New component: `src/renderer/components/Contacts.tsx`
- Search bar at top (بحث في جهات الاتصال...)
- Two sections: العملاء 👤, الموردون 🏭
- Each row: Name, phone/mobile, type badge
- Click → call
- Alphabetical index on right side

---

## Phase 4: Advanced Call Features

### 4.1 Call Transfer
In `useSipEngine.ts`, add blind transfer:
```ts
const transferCall = async (target: string) => {
  if (sessionRef.current) {
    const domain = localStorage.getItem('pbx_domain');
    const targetURI = UserAgent.makeURI(`sip:${target}@${domain}`);
    if (targetURI) {
      await sessionRef.current.refer(targetURI);
      setCallState('idle');
    }
  }
};
```

### 4.2 DTMF (In-call keypad)
```ts
const sendDTMF = (digit: string) => {
  const session = sessionRef.current;
  if (session?.sessionDescriptionHandler) {
    session.sessionDescriptionHandler.sendDtmf(digit);
  }
};
```

### 4.3 Speed Dial
In Settings tab, add "الاتصال السريع" section:
- 9 speed dial slots (1-9)
- Store in localStorage as `speed_dial_X`
- On dialpad, long-press a digit (1-9) → call speed dial
- Show small label under digit keys if speed dial is set

---

## Phase 5: Settings Upgrade

### 5.1 Redesign `Settings.tsx`
Organized sections with toggle switches:
1. **الحساب**: Extension, Domain, Status (read-only display)
2. **الصوت**: Microphone select dropdown, Speaker select dropdown, Ringtone select, Volume slider
3. **الاتصال السريع**: 9 configurable slots
4. **الإخطارات**: Toggle notifications, Toggle sounds
5. **حول البرنامج**: Version 1.0.0, Logo

### 5.2 Audio Device Selection
```ts
const devices = await navigator.mediaDevices.enumerateDevices();
const microphones = devices.filter(d => d.kind === 'audioinput');
const speakers = devices.filter(d => d.kind === 'audiooutput');
```

---

## 🔨 Build & Test
After all changes:
```bash
cd "/Users/macbook/TexaCore-Backups-2026-03-25/erpsystem supabase/texacore-softphone"
rm -rf dist release
npx vite build
npx tsc -p tsconfig.main.json
npx tsc -p tsconfig.preload.json
npx electron-builder --mac
```

Install:
```bash
osascript -e 'quit app "TexaCore Softphone"'
sleep 1
rm -rf "/Applications/TexaCore Softphone.app"
cp -R "release/mac-arm64/TexaCore Softphone.app" /Applications/
open "/Applications/TexaCore Softphone.app"
```

## ⚠️ Important Notes
- Window size is fixed at **380×650** — design must fit this
- RTL layout (Arabic) — use `direction: rtl` and `text-align: right`
- Font: Tajawal from Google Fonts (loaded in `index.html`)
- Do NOT modify `useSupabase.ts` — the Realtime sync is working perfectly
- Do NOT modify `src/main/index.ts` — System Tray is working
- PBX credentials are in localStorage: `pbx_domain`, `pbx_ext`, `pbx_pass`
- The Supabase anon key above is the CLOUD key (not local)
