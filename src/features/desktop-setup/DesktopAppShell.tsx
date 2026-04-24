// ════════════════════════════════════════════════════════════
// 🖥️ Desktop App Shell — Entry point for Desktop Edition
// ════════════════════════════════════════════════════════════
// Flow:
//  1. Check Docker health → show loading/error
//  2. First run? → show Setup Wizard
//  3. No active company? → show Company Selector
//  4. Company active → load main app (same as cloud)

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isFirstRun, getActiveCompany, type CompanyFile } from './services/companyFileManager';
import { checkDockerHealth, waitForDocker, injectDesktopConfig } from './services/desktopConfig';
import { initBackupSystem } from './services/backupEngine';

type AppState = 'checking' | 'docker-starting' | 'docker-error' | 'setup-wizard' | 'company-selector' | 'ready';

interface Props {
  children: React.ReactNode; // The main app (same as cloud version)
}

export default function DesktopAppShell({ children }: Props) {
  const [state, setState] = useState<AppState>('checking');
  const [dockerRetry, setDockerRetry] = useState(0);
  const [dockerProgress, setDockerProgress] = useState('');

  // ─── Step 1: Check Docker & determine state ──────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Inject desktop config
      injectDesktopConfig();

      // Check Docker
      setState('checking');
      const { healthy } = await checkDockerHealth();

      if (!healthy) {
        setState('docker-starting');
        // Start Docker via Electron
        if ((window as any).electronAPI?.startDocker) {
          await (window as any).electronAPI.startDocker();
        }
        // Wait for it
        const ok = await waitForDocker(30, 2000, (attempt, max) => {
          if (!cancelled) setDockerProgress(`${Math.round((attempt / max) * 100)}%`);
        });
        if (!ok && !cancelled) {
          setState('docker-error');
          return;
        }
      }

      if (cancelled) return;

      // Docker is ready — what's next?
      if (isFirstRun()) {
        setState('setup-wizard');
      } else if (!getActiveCompany()) {
        setState('company-selector');
      } else {
        initBackupSystem();
        setState('ready');
      }
    }

    init();
    return () => { cancelled = true; };
  }, [dockerRetry]);

  // ─── Loading screen ─────────────────────────────
  if (state === 'checking' || state === 'docker-starting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center space-y-6">
          <div className="inline-flex items-center gap-1">
            <span className="text-4xl font-black text-teal-400">Texa</span>
            <span className="text-4xl font-black text-amber-400">Core</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
            <p className="text-gray-400 text-sm">
              {state === 'checking' ? 'Checking services...' : `Starting database... ${dockerProgress}`}
            </p>
          </div>
          <div className="w-48 h-1 bg-gray-800 rounded-full mx-auto overflow-hidden">
            <motion.div className="h-full bg-teal-500 rounded-full"
              animate={{ width: state === 'checking' ? '30%' : dockerProgress || '50%' }}
              transition={{ duration: 0.5 }} />
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Docker error ───────────────────────────────
  if (state === 'docker-error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-2xl p-8 max-w-md text-center space-y-4 border border-gray-700">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Cannot Start Services</h2>
          <p className="text-sm text-gray-400">
            Docker services failed to start. Please ensure Docker Desktop is running and try again.
          </p>
          <div className="space-y-2">
            <Button onClick={() => setDockerRetry(prev => prev + 1)}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2">
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
            <Button variant="ghost" className="w-full text-gray-400"
              onClick={() => (window as any).electronAPI?.openDockerDocs?.()}>
              Install Docker Desktop
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Setup Wizard ───────────────────────────────
  if (state === 'setup-wizard') {
    const DesktopSetupWizard = require('./DesktopSetupWizard').default;
    return <DesktopSetupWizard />;
  }

  // ─── Company Selector ───────────────────────────
  if (state === 'company-selector') {
    const CompanySelector = require('./CompanySelector').default;
    return (
      <CompanySelector
        lang={localStorage.getItem('texacore_language') || 'en'}
        onCompanySelected={(company: CompanyFile) => {
          initBackupSystem();
          setState('ready');
        }}
        onCreateNew={() => setState('setup-wizard')}
      />
    );
  }

  // ─── Ready — render main app ────────────────────
  return <>{children}</>;
}
