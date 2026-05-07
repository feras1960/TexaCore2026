/**
 * ════════════════════════════════════════════════════════════════
 * ☁️ DriveBackupSection — Google Drive Backup Management
 * ════════════════════════════════════════════════════════════════
 * 
 * Shows under the Google Workspace integration when connected:
 * - Local backup status (last backup time)
 * - Cloud backup status (last Drive upload)
 * - Drive folder browser to select backup destination
 * - List of backup files in the selected Drive folder
 * - Manual backup + upload triggers
 * 
 * Write-only sync: uploads .tcdb to Drive automatically.
 * To restore, user downloads .tcdb from Drive manually.
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import {
  HardDrive, Cloud, CloudUpload, FolderOpen, Folder,
  ChevronRight, ChevronLeft, RefreshCw, Download, Loader2,
  CheckCircle2, AlertCircle, Clock, ArrowUpRight, Database,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { cloudSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface DriveFile {
  id: string;
  name: string;
  size: number;
  modifiedTime: string;
  webViewLink?: string;
}

interface DriveFolder {
  id: string;
  name: string;
  modifiedTime?: string;
}

interface BackupStatus {
  initialized: boolean;
  lastBackup?: string;
  backupCount?: number;
  lastDriveUpload?: string;
}

interface Props {
  companyId: string;
  cloudCompanyId?: string;
  isAr: boolean;
}

export default function DriveBackupSection({ companyId, cloudCompanyId, isAr }: Props) {
  const { toast } = useToast();
  // Use cloud company ID for Edge Function calls, fall back to local
  const edgeFnCompanyId = cloudCompanyId || companyId;

  // State
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: isAr ? 'Google Drive' : 'Google Drive' }
  ]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);

  // ─── Load backup status from local API ───
  const loadBackupStatus = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:1960/api/backup-status');
      if (res.ok) {
        const data = await res.json();
        setBackupStatus(data);
      }
    } catch {
      // Local server might not be running
    }
  }, []);

  // ─── Load Drive backup files ───
  const loadDriveFiles = useCallback(async () => {
    if (!companyId) return;
    setLoadingFiles(true);
    try {
      const { data, error } = await cloudSupabase.functions.invoke('google-integration', {
        body: { action: 'list_drive_files', company_id: edgeFnCompanyId, folder_id: currentFolderId },
      });
      if (error) throw error;
      setDriveFiles(data?.files || []);
    } catch (err: any) {
      console.warn('Failed to load Drive files:', err.message);
    } finally {
      setLoadingFiles(false);
    }
  }, [companyId, currentFolderId]);

  // ─── Browse Drive folders ───
  const loadFolders = useCallback(async (parentId = 'root') => {
    if (!companyId) return;
    setLoadingFolders(true);
    try {
      const { data, error } = await cloudSupabase.functions.invoke('google-integration', {
        body: { action: 'list_drive_folders', company_id: edgeFnCompanyId, parent_id: parentId },
      });
      if (error) throw error;
      setDriveFolders(data?.folders || []);
    } catch (err: any) {
      console.warn('Failed to load Drive folders:', err.message);
    } finally {
      setLoadingFolders(false);
    }
  }, [companyId]);

  // ─── Navigate into folder ───
  const navigateToFolder = (folder: DriveFolder) => {
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }]);
    loadFolders(folder.id);
  };

  // ─── Navigate back ───
  const navigateBack = () => {
    if (folderPath.length <= 1) return;
    const newPath = folderPath.slice(0, -1);
    setFolderPath(newPath);
    loadFolders(newPath[newPath.length - 1].id);
  };

  // ─── Navigate to breadcrumb ───
  const navigateToBreadcrumb = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    loadFolders(newPath[newPath.length - 1].id);
  };

  // ─── Select folder for backups ───
  const selectFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId === 'root' ? null : folderId);
    setShowFolderBrowser(false);
    toast({
      title: isAr ? '✅ تم تحديد المجلد' : '✅ Folder Selected',
      description: folderName,
    });
    // Reload files for this folder
    setDriveFiles([]);
  };

  // ─── Trigger local backup ───
  const triggerBackup = async () => {
    setBackingUp(true);
    try {
      const res = await fetch('http://localhost:1960/api/backup', { method: 'POST' });
      if (!res.ok) throw new Error('Backup failed');
      const data = await res.json();
      toast({
        title: isAr ? '✅ نسخة احتياطية محلية' : '✅ Local Backup Created',
        description: `${(data.size / 1024).toFixed(0)} KB`,
      });
      loadBackupStatus();
    } catch (err: any) {
      toast({ title: '❌ Error', description: err.message, variant: 'destructive' });
    } finally {
      setBackingUp(false);
    }
  };

  // ─── Trigger Drive upload ───
  const triggerDriveUpload = async () => {
    setUploading(true);
    try {
      const res = await fetch('http://localhost:1960/api/backup-to-drive', { method: 'POST' });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');
      toast({
        title: isAr ? '☁️ تم الرفع لـ Google Drive' : '☁️ Uploaded to Google Drive',
        description: data.fileName,
      });
      loadBackupStatus();
      loadDriveFiles();
    } catch (err: any) {
      toast({ title: '❌ Error', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  // ─── Init ───
  useEffect(() => {
    loadBackupStatus();
    loadDriveFiles();
    // Only poll when tab is visible, and less frequently
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadBackupStatus();
      }
    }, 120000); // Poll every 2 min (was 30s)
    return () => clearInterval(interval);
  }, [loadBackupStatus, loadDriveFiles]);

  // ─── Helpers ───
  function formatDate(iso?: string) {
    if (!iso) return isAr ? 'لم يحدث بعد' : 'Never';
    const d = new Date(iso);
    return d.toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  return (
    <Card className="border-blue-200 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/50 to-slate-50/50 dark:from-blue-950/20 dark:to-slate-950/20">
      <CardContent className="pt-4 space-y-4">
        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                {isAr ? 'النسخ الاحتياطي' : 'Backup & Sync'}
              </h4>
              <p className="text-[11px] text-blue-500 dark:text-blue-400">
                {isAr ? 'محلي + Google Drive — كتابة فقط' : 'Local + Google Drive — write-only sync'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 border-blue-200 hover:bg-blue-50"
              onClick={triggerBackup}
              disabled={backingUp}
            >
              {backingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <HardDrive className="w-3 h-3" />}
              {isAr ? 'نسخ محلي' : 'Local Backup'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 border-green-200 hover:bg-green-50 text-green-700"
              onClick={triggerDriveUpload}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
              {isAr ? 'رفع لـ Drive' : 'Upload to Drive'}
            </Button>
          </div>
        </div>

        <Separator className="bg-blue-100 dark:bg-blue-900/30" />

        {/* ═══ Status Cards ═══ */}
        <div className="grid grid-cols-2 gap-3">
          {/* Local status */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className={cn(
              "p-1.5 rounded-full",
              backupStatus?.lastBackup ? "bg-green-100 dark:bg-green-900/30" : "bg-slate-100 dark:bg-slate-800"
            )}>
              <HardDrive className={cn(
                "w-3.5 h-3.5",
                backupStatus?.lastBackup ? "text-green-600" : "text-slate-400"
              )} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">
                {isAr ? 'آخر نسخة محلية' : 'Last Local Backup'}
              </p>
              <p className="text-xs font-medium truncate">
                {formatDate(backupStatus?.lastBackup)}
              </p>
            </div>
          </div>

          {/* Cloud status */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className={cn(
              "p-1.5 rounded-full",
              backupStatus?.lastDriveUpload ? "bg-blue-100 dark:bg-blue-900/30" : "bg-slate-100 dark:bg-slate-800"
            )}>
              <Cloud className={cn(
                "w-3.5 h-3.5",
                backupStatus?.lastDriveUpload ? "text-blue-600" : "text-slate-400"
              )} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">
                {isAr ? 'آخر رفع للسحابة' : 'Last Cloud Upload'}
              </p>
              <p className="text-xs font-medium truncate">
                {formatDate(backupStatus?.lastDriveUpload)}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ Folder Selection ═══ */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-[11px] text-muted-foreground">
                {isAr ? 'مجلد الحفظ في Drive' : 'Drive Backup Folder'}
              </p>
              <p className="text-xs font-medium">
                {currentFolderId 
                  ? folderPath[folderPath.length - 1]?.name 
                  : 'TexaCore Backups'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => {
              setShowFolderBrowser(!showFolderBrowser);
              if (!showFolderBrowser) loadFolders(folderPath[folderPath.length - 1]?.id || 'root');
            }}
          >
            <Folder className="w-3 h-3" />
            {isAr ? 'تغيير' : 'Change'}
          </Button>
        </div>

        {/* ═══ Folder Browser ═══ */}
        {showFolderBrowser && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-900/30 bg-white dark:bg-slate-800 overflow-hidden">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/20 overflow-x-auto">
              {folderPath.map((item, i) => (
                <span key={item.id} className="flex items-center gap-1 shrink-0">
                  {i > 0 && <ChevronRight className="w-3 h-3 text-amber-400" />}
                  <button
                    className="text-xs text-amber-700 dark:text-amber-300 hover:underline"
                    onClick={() => navigateToBreadcrumb(i)}
                  >
                    {item.name}
                  </button>
                </span>
              ))}
            </div>

            {/* Back + Select buttons */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 dark:border-slate-700">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1"
                disabled={folderPath.length <= 1}
                onClick={navigateBack}
              >
                <ChevronLeft className="w-3 h-3" />
                {isAr ? 'رجوع' : 'Back'}
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-6 text-xs gap-1 bg-amber-500 hover:bg-amber-600"
                onClick={() => {
                  const current = folderPath[folderPath.length - 1];
                  selectFolder(current.id, current.name);
                }}
              >
                <CheckCircle2 className="w-3 h-3" />
                {isAr ? 'اختر هذا المجلد' : 'Select This Folder'}
              </Button>
            </div>

            {/* Folder list */}
            <div className="max-h-48 overflow-y-auto">
              {loadingFolders ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                </div>
              ) : driveFolders.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-6">
                  {isAr ? 'لا توجد مجلدات' : 'No subfolders'}
                </p>
              ) : (
                driveFolders.map(folder => (
                  <button
                    key={folder.id}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-amber-50 dark:hover:bg-amber-950/20 border-b border-slate-50 dark:border-slate-800 transition-colors text-start"
                    onClick={() => navigateToFolder(folder)}
                  >
                    <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                    <ChevronRight className="w-3 h-3 text-slate-300 ms-auto shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* ═══ Drive Files List ═══ */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Cloud className="w-3 h-3" />
              {isAr ? 'النسخ المحفوظة في Drive' : 'Backups in Drive'}
              {driveFiles.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{driveFiles.length}</Badge>
              )}
            </h5>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={loadDriveFiles}
              disabled={loadingFiles}
            >
              <RefreshCw className={cn("w-3 h-3", loadingFiles && "animate-spin")} />
              {isAr ? 'تحديث' : 'Refresh'}
            </Button>
          </div>

          {loadingFiles ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            </div>
          ) : driveFiles.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              <Cloud className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>{isAr ? 'لا توجد نسخ محفوظة في Drive بعد' : 'No backups in Drive yet'}</p>
              <p className="mt-1 text-[10px]">{isAr ? 'ستُرفع تلقائياً بعد كل نسخ احتياطي محلي' : 'Will auto-upload after each local backup'}</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {driveFiles.map(file => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Database className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                        <span>{formatSize(file.size)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDate(file.modifiedTime)}
                        </span>
                      </p>
                    </div>
                  </div>
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors shrink-0"
                      title={isAr ? 'فتح في Drive' : 'Open in Drive'}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ Info note ═══ */}
        <p className="text-[10px] text-muted-foreground text-center pt-1">
          {isAr 
            ? '💡 لاستعادة نسخة: حمّلها من Google Drive ← ثم افتحها من البرنامج'
            : '💡 To restore: download .tcdb from Google Drive → then open in the app'}
        </p>
      </CardContent>
    </Card>
  );
}
