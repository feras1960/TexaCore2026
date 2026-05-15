import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function getAssetPath(filename: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', filename);
  }
  return path.join(__dirname, '../../assets', filename);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 650,
    resizable: false,
    alwaysOnTop: true,
    title: "TexaCore Softphone",
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // CRITICAL: Prevents Chrome from throttling SIP.js WebSocket and timers
    },
  });

  // Remove the default menu bar
  mainWindow.setMenuBarVisibility(false);

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Intercept close event to minimize to tray instead
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  try {
    const iconPath = getAssetPath('icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    // Resize for tray (16x16 on macOS)
    const trayIcon = icon.resize({ width: 16, height: 16 });
    trayIcon.setTemplateImage(true); // macOS: makes it adaptive to menu bar color
    tray = new Tray(trayIcon);
  } catch (e) {
    console.warn('Tray icon not found, tray might not be visible', e);
    return;
  }

  if (tray) {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'إظهار التطبيق', click: () => mainWindow?.show() },
      { type: 'separator' },
      { 
        label: 'خروج', 
        click: () => {
          isQuitting = true;
          app.quit();
        } 
      }
    ]);
    
    tray.setToolTip('TexaCore Softphone');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      if (mainWindow?.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow?.show();
      }
    });
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
