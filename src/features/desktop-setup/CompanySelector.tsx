// ════════════════════════════════════════════════════════════
// 🏢 Company Selector — Startup screen for Desktop Edition
// ════════════════════════════════════════════════════════════
// Shows when: app starts and no active company, or user closes company
// Features: recent companies list, create new, open from file

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Building2, Plus, FolderOpen, Clock, Trash2,
  ChevronRight, HardDrive, Sparkles, AlertTriangle,
} from 'lucide-react';
import {
  getRecentCompanies, openCompanyFile, deleteCompanyFile,
  getCompanyDisplayInfo, type CompanyFile,
} from './services/companyFileManager';

interface Props {
  onCompanySelected: (company: CompanyFile) => void;
  onCreateNew: () => void;
  lang?: string;
}

export default function CompanySelector({ onCompanySelected, onCreateNew, lang = 'en' }: Props) {
  const isAr = lang === 'ar';
  const isRTL = lang === 'ar';
  const [recent, setRecent] = useState<CompanyFile[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setRecent(getRecentCompanies());
  }, []);

  const handleOpen = async (company: CompanyFile) => {
    setLoading(company.id);
    const result = await openCompanyFile(company.path);
    if (result.success && result.company) {
      onCompanySelected(result.company);
    }
    setLoading(null);
  };

  const handleBrowse = async () => {
    setLoading('browse');
    const result = await openCompanyFile();
    if (result.success && result.company) {
      onCompanySelected(result.company);
    }
    setLoading(null);
  };

  const handleDelete = async (company: CompanyFile) => {
    await deleteCompanyFile(company);
    setRecent(getRecentCompanies());
    setConfirmDelete(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(isAr ? 'ar' : 'en', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return dateStr; }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-teal-950/20 flex items-center justify-center p-6"
      dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1 mb-3">
            <span className="text-3xl font-black text-teal-700">Texa</span>
            <span className="text-3xl font-black text-amber-500">Core</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isAr ? 'نظام إدارة موارد المؤسسات — نسخة سطح المكتب' : 'Enterprise Resource Planning — Desktop Edition'}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-white" />
              <h1 className="text-lg font-bold text-white">
                {isAr ? 'اختيار الشركة' : 'Select Company'}
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={onCreateNew}
                className="h-16 bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex flex-col gap-1 font-semibold">
                <Plus className="w-5 h-5" />
                <span className="text-xs">{isAr ? 'شركة جديدة' : 'New Company'}</span>
              </Button>
              <Button onClick={handleBrowse} variant="outline" disabled={loading === 'browse'}
                className="h-16 rounded-xl flex flex-col gap-1 border-2">
                <FolderOpen className="w-5 h-5 text-teal-600" />
                <span className="text-xs">{isAr ? 'فتح ملف' : 'Open File'}</span>
              </Button>
            </div>
          </div>

          {/* Recent Companies */}
          <div className="p-4">
            {recent.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">
                  {isAr ? 'لا توجد شركات سابقة — أنشئ شركة جديدة للبدء' : 'No recent companies — create a new one to get started'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <h3 className="text-xs font-bold text-gray-400 uppercase">
                    {isAr ? 'الشركات الأخيرة' : 'Recent Companies'}
                  </h3>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {recent.map((company) => {
                      const info = getCompanyDisplayInfo(company);
                      const isLoading = loading === company.id;
                      const isDeleting = confirmDelete === company.id;

                      return (
                        <motion.div key={company.id}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}
                          className={cn(
                            'group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer',
                            isDeleting
                              ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                              : 'border-gray-100 dark:border-gray-800 hover:border-teal-300 hover:bg-teal-50/50 dark:hover:bg-teal-900/10'
                          )}
                          onClick={() => !isDeleting && handleOpen(company)}>

                          {/* Company Initial */}
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            {info.initial}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">
                              {company.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <HardDrive className="w-3 h-3" />
                              <span className="truncate">{company.currency}</span>
                              <span>·</span>
                              <span>{formatDate(company.lastOpenedAt)}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          {isDeleting ? (
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(company)}
                                className="h-7 text-xs px-2">
                                {isAr ? 'حذف' : 'Delete'}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}
                                className="h-7 text-xs px-2">
                                {isAr ? 'إلغاء' : 'Cancel'}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(company.id); }}
                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all">
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                              {isLoading ? (
                                <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <ChevronRight className={cn('w-4 h-4 text-gray-300', isRTL && 'rotate-180')} />
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 text-center">
            <p className="text-[10px] text-gray-400">
              TexaCore Desktop v1.0 — {isAr ? 'ملفات الشركة بصيغة' : 'Company files in'} .texacore
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
