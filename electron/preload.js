// ════════════════════════════════════════════════════════════
// Electron Preload Script — Exposes IPC to renderer
// ════════════════════════════════════════════════════════════
// This runs in the preload context (has access to Node.js APIs)
// and exposes a safe electronAPI object to the renderer process.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ─── Docker Management ────────────────────────────
  startDocker: () => ipcRenderer.invoke('docker:start'),
  stopDocker: () => ipcRenderer.invoke('docker:stop'),
  getDockerStatus: () => ipcRenderer.invoke('docker:status'),

  // ─── Company File Management ──────────────────────
  saveCompanyFile: (params) => ipcRenderer.invoke('company:save', params),
  readCompanyFile: (path) => ipcRenderer.invoke('company:read', path),
  deleteCompanyFile: (params) => ipcRenderer.invoke('company:delete', params),
  openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),

  // ─── Company Config ───────────────────────────────
  saveCompanyConfig: (config) => ipcRenderer.invoke('config:save', config),
  loadCompanyConfig: () => ipcRenderer.invoke('config:load'),

  // ─── Backup Operations ────────────────────────────
  createBackup: (params) => ipcRenderer.invoke('backup:create', params),
  restoreBackup: (params) => ipcRenderer.invoke('backup:restore', params),
  readBackupFile: (path) => ipcRenderer.invoke('backup:readFile', path),

  // ─── Google OAuth ─────────────────────────────────
  googleAuth: () => ipcRenderer.invoke('google:auth'),

  // ─── System Info ──────────────────────────────────
  getSystemLocale: () => ipcRenderer.invoke('system:locale'),
  getPlatform: () => process.platform,
  getVersion: () => ipcRenderer.invoke('app:version'),

  // ─── Window Controls ──────────────────────────────
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // ─── Misc ─────────────────────────────────────────
  openDockerDocs: () => ipcRenderer.invoke('misc:openDockerDocs'),
  openExternal: (url) => ipcRenderer.invoke('misc:openExternal', url),
});

// Inject desktop config before app loads
window.addEventListener('DOMContentLoaded', () => {
  window.__TEXACORE_CONFIG__ = {
    supabaseUrl: 'http://localhost:54321',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WO_eo0y4lHl1pBdvVu_mkwMvO1s22qwpM3C0',
    mode: 'selfhosted',
    version: '1.0.0',
  };
});
