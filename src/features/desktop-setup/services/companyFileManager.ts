// ════════════════════════════════════════════════════════════
// Multi-Company File Manager
// ════════════════════════════════════════════════════════════
// Each company = a .texacore file (JSON metadata + Docker volume ref)
// - Create / Open / Close / Delete companies
// - Recent companies list
// - File association support

export interface CompanyFile {
  id: string;
  name: string;
  path: string;           // Full path to .texacore file
  createdAt: string;
  lastOpenedAt: string;
  dbVolume: string;        // Docker volume name for this company's DB
  storageVolume: string;   // Docker volume name for file storage
  language: string;
  currency: string;
  country: string;
  adminEmail: string;
  backupEnabled: boolean;
  googleDriveEnabled: boolean;
  sizeMB?: number;
}

export interface CompanyFileContent {
  version: '1.0';
  company: CompanyFile;
  dockerCompose: {
    dbPort: number;
    apiPort: number;
  };
}

const RECENT_COMPANIES_KEY = 'texacore_recent_companies';
const ACTIVE_COMPANY_KEY = 'texacore_active_company';
const MAX_RECENT = 10;

// ─── Recent Companies ─────────────────────────────────────
export function getRecentCompanies(): CompanyFile[] {
  try {
    const stored = localStorage.getItem(RECENT_COMPANIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveRecentCompanies(companies: CompanyFile[]) {
  localStorage.setItem(RECENT_COMPANIES_KEY, JSON.stringify(companies.slice(0, MAX_RECENT)));
}

export function addToRecent(company: CompanyFile) {
  const recent = getRecentCompanies().filter(c => c.id !== company.id);
  recent.unshift({ ...company, lastOpenedAt: new Date().toISOString() });
  saveRecentCompanies(recent);
}

export function removeFromRecent(companyId: string) {
  const recent = getRecentCompanies().filter(c => c.id !== companyId);
  saveRecentCompanies(recent);
}

// ─── Active Company ───────────────────────────────────────
export function getActiveCompany(): CompanyFile | null {
  try {
    const stored = localStorage.getItem(ACTIVE_COMPANY_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

export function setActiveCompany(company: CompanyFile | null) {
  if (company) {
    localStorage.setItem(ACTIVE_COMPANY_KEY, JSON.stringify(company));
    addToRecent(company);
  } else {
    localStorage.removeItem(ACTIVE_COMPANY_KEY);
  }
}

// ─── Create Company File ──────────────────────────────────
export async function createCompanyFile(params: {
  name: string;
  storagePath: string;
  language: string;
  currency: string;
  country: string;
  adminEmail: string;
}): Promise<{ success: boolean; company?: CompanyFile; error?: string }> {
  const id = `company-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fileName = `${params.name.replace(/[^a-zA-Z0-9\u0600-\u06FF\s-]/g, '')}.texacore`;
  const filePath = `${params.storagePath}/${fileName}`;
  const dbVolume = `texacore-db-${id}`;
  const storageVolume = `texacore-storage-${id}`;

  const company: CompanyFile = {
    id,
    name: params.name,
    path: filePath,
    createdAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
    dbVolume,
    storageVolume,
    language: params.language,
    currency: params.currency,
    country: params.country,
    adminEmail: params.adminEmail,
    backupEnabled: true,
    googleDriveEnabled: false,
  };

  const fileContent: CompanyFileContent = {
    version: '1.0',
    company,
    dockerCompose: {
      dbPort: 54322 + Math.floor(Math.random() * 100),
      apiPort: 54321,
    },
  };

  // Save via Electron
  if ((window as any).electronAPI?.saveCompanyFile) {
    try {
      const result = await (window as any).electronAPI.saveCompanyFile({
        path: filePath,
        content: JSON.stringify(fileContent, null, 2),
      });
      if (!result?.success) return { success: false, error: result?.error || 'Failed to save file' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  setActiveCompany(company);
  return { success: true, company };
}

// ─── Open Company File ────────────────────────────────────
export async function openCompanyFile(filePath?: string): Promise<{
  success: boolean;
  company?: CompanyFile;
  error?: string;
}> {
  // If no path, open file dialog
  if (!filePath && (window as any).electronAPI?.openFileDialog) {
    const result = await (window as any).electronAPI.openFileDialog({
      filters: [{ name: 'TexaCore Company', extensions: ['texacore'] }],
    });
    if (!result?.path) return { success: false, error: 'No file selected' };
    filePath = result.path;
  }

  if (!filePath) return { success: false, error: 'No file path' };

  // Read file content
  if ((window as any).electronAPI?.readCompanyFile) {
    try {
      const result = await (window as any).electronAPI.readCompanyFile(filePath);
      if (!result?.content) return { success: false, error: 'Failed to read file' };

      const parsed: CompanyFileContent = JSON.parse(result.content);
      const company = parsed.company;
      company.path = filePath; // Update path in case file was moved
      company.lastOpenedAt = new Date().toISOString();

      setActiveCompany(company);
      return { success: true, company };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: 'Electron API not available' };
}

// ─── Close Active Company ─────────────────────────────────
export function closeActiveCompany() {
  setActiveCompany(null);
}

// ─── Delete Company ───────────────────────────────────────
export async function deleteCompanyFile(company: CompanyFile): Promise<boolean> {
  if ((window as any).electronAPI?.deleteCompanyFile) {
    try {
      await (window as any).electronAPI.deleteCompanyFile({
        path: company.path,
        dbVolume: company.dbVolume,
        storageVolume: company.storageVolume,
      });
    } catch (err) {
      console.error('[Company] Delete failed:', err);
      return false;
    }
  }

  removeFromRecent(company.id);
  const active = getActiveCompany();
  if (active?.id === company.id) closeActiveCompany();
  return true;
}

// ─── Check if first run (no companies) ────────────────────
export function isFirstRun(): boolean {
  const recent = getRecentCompanies();
  const active = getActiveCompany();
  const setupDone = localStorage.getItem('texacore_desktop_setup');
  return recent.length === 0 && !active && !setupDone;
}

// ─── Get company display info ─────────────────────────────
export function getCompanyDisplayInfo(company: CompanyFile) {
  const daysSinceLastOpen = Math.floor(
    (Date.now() - new Date(company.lastOpenedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  return {
    ...company,
    daysSinceLastOpen,
    isRecent: daysSinceLastOpen < 7,
    initial: company.name.charAt(0).toUpperCase(),
  };
}
