import { useState, useEffect, useCallback, useRef } from 'react';
import { HardDrive, Check, AlertTriangle, Loader2, Database, Cloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';

const LOCAL_API = 'http://127.0.0.1:1960';

type BackupState = 'idle' | 'syncing' | 'success' | 'error' | 'unavailable';

interface BackupStatus {
  initialized: boolean;
  syncing?: boolean;
  running?: boolean;
  lastBackup?: string;
  backupCount?: number;
  backupPath?: string;
  lastDriveUpload?: string;
}

export function BackupIndicator() {
  const { direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const [state, setState] = useState<BackupState>('idle');
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastBackupAgo, setLastBackupAgo] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if we're in local mode
  const isLocalMode = !!localStorage.getItem('texacore_active_company');

  // Fetch backup status
  const fetchStatus = useCallback(async () => {
    if (!isLocalMode) return;
    try {
      const res = await fetch(`${LOCAL_API}/api/backup-status`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data: BackupStatus = await res.json();
        setStatus(data);
        if (data.initialized) {
          setState(data.running ? 'syncing' : 'idle');
        } else {
          setState('unavailable');
        }
      }
    } catch {
      setState('unavailable');
    }
  }, [isLocalMode]);

  // Calculate "time ago" for last backup
  useEffect(() => {
    if (!status?.lastBackup) {
      setLastBackupAgo('');
      return;
    }
    const update = () => {
      const diff = Date.now() - new Date(status.lastBackup!).getTime();
      const secs = Math.floor(diff / 1000);
      if (secs < 60) setLastBackupAgo(isRTL ? 'الآن' : 'just now');
      else if (secs < 3600) setLastBackupAgo(isRTL ? `منذ ${Math.floor(secs / 60)} د` : `${Math.floor(secs / 60)}m ago`);
      else setLastBackupAgo(isRTL ? `منذ ${Math.floor(secs / 3600)} س` : `${Math.floor(secs / 3600)}h ago`);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [status?.lastBackup, isRTL]);

  // Poll every 30s
  useEffect(() => {
    if (!isLocalMode) return;
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchStatus, isLocalMode]);

  // Trigger manual backup
  const triggerBackup = useCallback(async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    setState('syncing');
    try {
      const res = await fetch(`${LOCAL_API}/api/backup`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        setState('success');
        setShowSuccess(true);
        setTimeout(() => { setShowSuccess(false); setState('idle'); }, 3000);
        fetchStatus();
      } else {
        setState('error');
        setTimeout(() => setState('idle'), 3000);
      }
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    } finally {
      setIsBackingUp(false);
    }
  }, [isBackingUp, fetchStatus]);

  // Don't render if not in local mode
  if (!isLocalMode) return null;

  const stateConfig = {
    idle: {
      icon: HardDrive,
      color: 'text-gray-400 dark:text-gray-500',
      bgHover: 'hover:bg-gray-100 dark:hover:bg-gray-800',
      dot: 'bg-emerald-400',
    },
    syncing: {
      icon: Loader2,
      color: 'text-blue-500',
      bgHover: 'hover:bg-blue-50 dark:hover:bg-blue-950',
      dot: 'bg-blue-400 animate-pulse',
    },
    success: {
      icon: Check,
      color: 'text-emerald-500',
      bgHover: 'hover:bg-emerald-50 dark:hover:bg-emerald-950',
      dot: 'bg-emerald-400',
    },
    error: {
      icon: AlertTriangle,
      color: 'text-red-500',
      bgHover: 'hover:bg-red-50 dark:hover:bg-red-950',
      dot: 'bg-red-400',
    },
    unavailable: {
      icon: Database,
      color: 'text-gray-300 dark:text-gray-600',
      bgHover: '',
      dot: 'bg-gray-300',
    },
  };

  const cfg = stateConfig[state];
  const Icon = cfg.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-10 w-10 relative transition-all duration-300',
            cfg.bgHover,
            isBackingUp && 'pointer-events-none',
          )}
          onClick={triggerBackup}
          disabled={state === 'unavailable'}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, rotate: state === 'syncing' ? 360 : 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ 
                duration: 0.3,
                rotate: { duration: 1, repeat: state === 'syncing' ? Infinity : 0, ease: 'linear' },
              }}
            >
              <Icon className={cn('h-[18px] w-[18px]', cfg.color)} />
            </motion.div>
          </AnimatePresence>

          {/* Status dot */}
          {status?.initialized && (
            <span className={cn(
              'absolute top-1.5 end-1.5 w-2 h-2 rounded-full border border-white dark:border-gray-900',
              cfg.dot,
            )} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent 
        side="bottom" 
        className="max-w-[220px]"
      >
        <div className="space-y-1">
          <p className="font-medium text-xs">
            {isRTL ? '💾 النسخة الاحتياطية' : '💾 Database Backup'}
          </p>
          {status?.initialized ? (
            <>
              {lastBackupAgo && (
                <p className="text-[11px] text-gray-400">
                  {isRTL ? `آخر نسخة: ${lastBackupAgo}` : `Last: ${lastBackupAgo}`}
                </p>
              )}
              {status.lastDriveUpload && (
                <p className="text-[11px] text-blue-400 flex items-center gap-1">
                  <Cloud className="w-2.5 h-2.5" />
                  {isRTL ? 'مرفوع لـ Drive ✓' : 'Synced to Drive ✓'}
                </p>
              )}
              {status.backupCount != null && (
                <p className="text-[11px] text-gray-400">
                  {isRTL ? `النسخ: ${status.backupCount}` : `Backups: ${status.backupCount}`}
                </p>
              )}
              <p className="text-[10px] text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
                {isRTL ? 'اضغط لعمل نسخة الآن' : 'Click to backup now'}
              </p>
            </>
          ) : (
            <p className="text-[11px] text-gray-400">
              {isRTL ? 'غير مهيأ — استورد ملف أولاً' : 'Not initialized — import a file first'}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
