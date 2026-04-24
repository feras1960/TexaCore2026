// ════════════════════════════════════════════════════════════
// Electron Main Process — IPC Handlers
// ════════════════════════════════════════════════════════════

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
const APP_DATA = path.join(os.homedir(), '.texacore');
const CONFIG_FILE = path.join(APP_DATA, 'config.json');

// Ensure app data directory exists
if (!fs.existsSync(APP_DATA)) fs.mkdirSync(APP_DATA, { recursive: true });

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'TexaCore ERP',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Register .texacore file association
  app.setAsDefaultProtocolClient('texacore');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// Handle file open (double-click .texacore file)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.webContents.send('company:openFile', filePath);
  }
});

// ═══════════════════════════════════════════════════════════
// IPC Handlers
// ═══════════════════════════════════════════════════════════

// ─── Docker Management ──────────────────────────────────
const DOCKER_COMPOSE_PATH = path.join(__dirname, '../docker/docker-compose.yml');

ipcMain.handle('docker:start', async () => {
  try {
    const cmd = `docker compose -f "${DOCKER_COMPOSE_PATH}" up -d`;
    execSync(cmd, { timeout: 60000 });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('docker:stop', async () => {
  try {
    execSync(`docker compose -f "${DOCKER_COMPOSE_PATH}" down`, { timeout: 30000 });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('docker:status', async () => {
  try {
    const output = execSync(`docker compose -f "${DOCKER_COMPOSE_PATH}" ps --format json`, { timeout: 10000 });
    return { success: true, services: output.toString() };
  } catch {
    return { success: false };
  }
});

// ─── Company File Management ────────────────────────────
ipcMain.handle('company:save', async (event, { path: filePath, content }) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('company:read', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('company:delete', async (event, { path: filePath, dbVolume, storageVolume }) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    // Remove Docker volumes
    if (dbVolume) try { execSync(`docker volume rm ${dbVolume}`, { timeout: 10000 }); } catch {}
    if (storageVolume) try { execSync(`docker volume rm ${storageVolume}`, { timeout: 10000 }); } catch {}
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── Dialogs ────────────────────────────────────────────
ipcMain.handle('dialog:openFile', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options?.filters || [{ name: 'TexaCore Company', extensions: ['texacore'] }],
  });
  if (result.canceled || !result.filePaths.length) return { path: null };
  return { path: result.filePaths[0] };
});

ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

// ─── Config ─────────────────────────────────────────────
ipcMain.handle('config:save', async (event, config) => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('config:load', async () => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch { return null; }
});

// ─── Backup Operations ──────────────────────────────────
ipcMain.handle('backup:create', async (event, { type }) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const config = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) : {};
    const backupDir = path.join(config.storagePath || path.join(os.homedir(), 'Documents/TexaCore'), 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const backupFile = path.join(backupDir, `backup-${type}-${timestamp}.sql`);

    // pg_dump from Docker container
    execSync(
      `docker exec texacore-desktop-db-1 pg_dump -U postgres -d postgres > "${backupFile}"`,
      { timeout: 120000 }
    );

    const stats = fs.statSync(backupFile);
    return {
      success: true,
      path: backupFile,
      sizeMB: Math.round(stats.size / 1024 / 1024 * 100) / 100,
      companyName: config.companyName || 'Unknown',
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('backup:restore', async (event, { path: backupPath }) => {
  try {
    if (!fs.existsSync(backupPath)) return { success: false, error: 'File not found' };
    execSync(
      `cat "${backupPath}" | docker exec -i texacore-desktop-db-1 psql -U postgres -d postgres`,
      { timeout: 120000 }
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('backup:readFile', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  } catch { return null; }
});

// ─── Google OAuth ───────────────────────────────────────
ipcMain.handle('google:auth', async () => {
  // Open OAuth window
  const authWindow = new BrowserWindow({
    width: 500, height: 700,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
  const REDIRECT_URI = 'http://localhost:54399/callback';
  const SCOPES = 'https://www.googleapis.com/auth/drive.file';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&access_type=offline&prompt=consent`;

  authWindow.loadURL(authUrl);

  return new Promise((resolve) => {
    authWindow.webContents.on('will-redirect', async (event, url) => {
      if (url.startsWith(REDIRECT_URI)) {
        const code = new URL(url).searchParams.get('code');
        authWindow.close();
        if (code) {
          // Exchange code for tokens (would need a token exchange endpoint)
          resolve({ email: 'connected@gmail.com', accessToken: code, refreshToken: '' });
        } else {
          resolve({ error: 'No authorization code' });
        }
      }
    });
    authWindow.on('closed', () => resolve({ error: 'Window closed' }));
  });
});

// ─── System Info ────────────────────────────────────────
ipcMain.handle('system:locale', () => app.getLocale());
ipcMain.handle('app:version', () => app.getVersion());

// ─── Window Controls ────────────────────────────────────
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());

// ─── Misc ───────────────────────────────────────────────
ipcMain.handle('misc:openDockerDocs', () => shell.openExternal('https://docs.docker.com/desktop/'));
ipcMain.handle('misc:openExternal', (event, url) => shell.openExternal(url));
