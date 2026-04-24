// ════════════════════════════════════════════════════════════
// Google Drive Backup Service
// ════════════════════════════════════════════════════════════
// - OAuth2 via Electron (opens browser window)
// - Upload encrypted backups to Drive
// - Download/restore from Drive
// - Admin-only access

export interface GoogleDriveConfig {
  enabled: boolean;
  email: string;
  accessToken: string;
  refreshToken: string;
  folderId: string; // Drive folder for backups
}

const GDRIVE_CONFIG_KEY = 'texacore_gdrive_config';

// ─── Config Management ────────────────────────────────────
export function getGDriveConfig(): GoogleDriveConfig | null {
  try {
    const stored = localStorage.getItem(GDRIVE_CONFIG_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

export function saveGDriveConfig(config: GoogleDriveConfig) {
  localStorage.setItem(GDRIVE_CONFIG_KEY, JSON.stringify(config));
}

// ─── Google OAuth (via Electron) ──────────────────────────
export async function authenticateGoogle(): Promise<{
  success: boolean;
  email?: string;
  error?: string;
}> {
  if (!(window as any).electronAPI?.googleAuth) {
    return { success: false, error: 'Electron API not available' };
  }

  try {
    const result = await (window as any).electronAPI.googleAuth();
    if (result?.accessToken) {
      // Create or find TexaCore folder in Drive
      const folderId = await findOrCreateFolder(result.accessToken);

      saveGDriveConfig({
        enabled: true,
        email: result.email,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken || '',
        folderId: folderId || '',
      });

      return { success: true, email: result.email };
    }
    return { success: false, error: result?.error || 'Auth failed' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Drive Folder Management ──────────────────────────────
async function findOrCreateFolder(accessToken: string): Promise<string> {
  const FOLDER_NAME = 'TexaCore Backups';

  // Search for existing folder
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchRes.json();

  if (searchData.files?.length > 0) {
    return searchData.files[0].id;
  }

  // Create new folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const createData = await createRes.json();
  return createData.id || '';
}

// ─── Upload Backup to Drive ───────────────────────────────
export async function uploadBackupToDrive(
  backupPath: string,
  fileName: string,
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  const config = getGDriveConfig();
  if (!config?.enabled || !config.accessToken) {
    return { success: false, error: 'Google Drive not configured' };
  }

  // Get backup file content via Electron
  if (!(window as any).electronAPI?.readBackupFile) {
    return { success: false, error: 'Cannot read backup file' };
  }

  try {
    const fileData = await (window as any).electronAPI.readBackupFile(backupPath);
    if (!fileData) return { success: false, error: 'File not found' };

    // Upload to Drive
    const metadata = {
      name: fileName,
      parents: [config.folderId],
      description: `TexaCore ERP backup — ${new Date().toISOString()}`,
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileData]));

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.accessToken}` },
        body: form,
      }
    );

    const data = await res.json();
    if (data.id) {
      console.log('[GDrive] ✅ Backup uploaded:', data.id);
      return { success: true, fileId: data.id };
    }
    return { success: false, error: data.error?.message || 'Upload failed' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── List Backups on Drive ────────────────────────────────
export async function listDriveBackups(): Promise<Array<{
  id: string;
  name: string;
  size: string;
  modifiedTime: string;
}>> {
  const config = getGDriveConfig();
  if (!config?.enabled || !config.accessToken || !config.folderId) return [];

  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${config.folderId}' in parents and trashed=false&fields=files(id,name,size,modifiedTime)&orderBy=modifiedTime desc`,
      { headers: { Authorization: `Bearer ${config.accessToken}` } }
    );
    const data = await res.json();
    return data.files || [];
  } catch {
    return [];
  }
}

// ─── Disconnect ───────────────────────────────────────────
export function disconnectGoogleDrive() {
  localStorage.removeItem(GDRIVE_CONFIG_KEY);
}
