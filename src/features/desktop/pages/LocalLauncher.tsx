import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/common/Logo';
import { cn } from '@/lib/utils';
import {
  Building2,
  Plus,
  LogIn,
  HardDrive,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Globe,
  ChevronDown,
  CheckCircle2,
  Cloud,
  Cpu,
  Loader2,
  Lock,
  Wifi,
  Trash2,
  Eye,
  EyeOff,
  FileUp,
  Download,
  Database,
  FileText,
  ClipboardList,
  X,
  Package,
  Receipt,
  Warehouse,
  Banknote,
  Users,
  BarChart3
} from 'lucide-react';

// Language Selector Component (Copied from Login.tsx to match perfectly)
const LanguageSelector = ({
  currentLanguage,
  supportedLanguages,
  onLanguageChange
}: {
  currentLanguage: string;
  supportedLanguages: Array<{ code: string; nativeName: string; flag: string }>;
  onLanguageChange: (lang: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const current = supportedLanguages.find(l => l.code === currentLanguage);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <Globe className="w-4 h-4" />
        <span>{current?.nativeName}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 end-0 w-48 py-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-64 overflow-y-auto"
            >
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    onLanguageChange(lang.code);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors",
                    currentLanguage === lang.code && "bg-[#1a2533]/10 text-[#1a2533]"
                  )}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                  {currentLanguage === lang.code && (
                    <CheckCircle2 className="w-4 h-4 ms-auto text-[#1a2533]" />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Feature Item
const FeatureItem = ({
  icon: Icon,
  title,
  description
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-4 group">
    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:bg-white/20 border border-white/5">
      <Icon className="w-5 h-5 text-white/90" />
    </div>
    <div className="flex-1 text-start">
      <h3 className="font-semibold text-white text-base mb-1">{title}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

export default function LocalLauncher() {
  const { t, direction, language, setLanguage, supportedLanguages } = useLanguage();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [localCompanies, setLocalCompanies] = useState<any[]>([]);
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [rsfImporting, setRsfImporting] = useState(false);
  const [rsfProgress, setRsfProgress] = useState<{step: string; current: number; total: number} | null>(null);
  const [importReport, setImportReport] = useState<{
    show: boolean;
    companyName: string;
    counts: Record<string, number>;
    users: any[];
    tcdbPath?: string | null;
    timestamp: string;
  } | null>(null);

  const isRTL = direction === 'rtl';
  const ArrowIcon = isRTL ? ArrowRight : ArrowLeft;

  const isCloudDomain = () => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    // Localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
    // Local network IPs (192.168.x.x, 10.x.x.x, 172.16.x.x)
    const isLocalIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
    if (isLocalIP) return false;
    
    // Everything else is considered a cloud domain (e.g. textile.texacore.ai)
    return true;
  };

  React.useEffect(() => {
    // 1. Check URL parameters for magic link
    const params = new URLSearchParams(window.location.search);
    const companyParam = params.get('c');
    
    if (companyParam) {
      // Save it
      localStorage.setItem('texacore_saved_company', companyParam);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setSelectedCompany(companyParam);
    } else {
      // If no URL param, check if we have a saved company AND we are on Cloud Domain
      const savedCompany = localStorage.getItem('texacore_saved_company');
      if (savedCompany && isCloudDomain()) {
        setSelectedCompany(savedCompany);
      }
    }

    // Clean old localStorage simulation data
    localStorage.removeItem('texacore_local_companies');

    // Load from local API (real database companies only)
    const fetchCompanies = async () => {
      try {
        const apiBase = isCloudDomain() ? '' : 'http://127.0.0.1:1960';
        const response = await fetch(`${apiBase}/api/companies`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.companies) {
            setLocalCompanies(result.companies);
            
            // Auto-select company if coming from TCDB restore
            // (texacore_active_company is set in localStorage during restore)
            try {
              const activeCompanyStr = localStorage.getItem('texacore_active_company');
              if (activeCompanyStr) {
                const activeCompany = JSON.parse(activeCompanyStr);
                if (activeCompany?.name) {
                  console.log('[Launcher] Auto-selecting restored company:', activeCompany.name);
                  setSelectedCompany(activeCompany.name);
                }
              }
            } catch {}
            
            return;
          }
        }
      } catch (err) {
        console.warn('Could not fetch companies from Local API.');
      }
      setLocalCompanies([]);
    };
    
    fetchCompanies();
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === 'admin') {
      setIsAdminAuthenticated(true);
      setShowAdminPortal(false);
    } else {
      alert(isRTL ? 'كلمة المرور غير صحيحة' : 'Incorrect password');
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    const confirmed = window.confirm(
      isRTL 
        ? `هل أنت متأكد من حذف "${companyName}"؟ سيتم حذف جميع بيانات الشركة بشكل نهائي.`
        : `Are you sure you want to delete "${companyName}"? All company data will be permanently removed.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch('http://127.0.0.1:1960/api/delete-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId })
      });
      if (response.ok) {
        setLocalCompanies(prev => prev.filter(c => c.id !== companyId));
        // 🧹 Clean localStorage to prevent stale company_id causing 406 errors
        try {
          const stored = localStorage.getItem('texacore_active_company');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.id === companyId) {
              localStorage.removeItem('texacore_active_company');
            }
          }
        } catch { /* ignore */ }
        localStorage.removeItem('texacore_cached_ids');
        localStorage.removeItem('sb-local-auth-token');
        // Clear selected company if it was the deleted one
        if (selectedCompany === companyName) {
          setSelectedCompany(null);
        }
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    try {
      // Check if we're in local mode (file was opened or company was created locally)
      const activeCompanyStr = localStorage.getItem('texacore_active_company');
      const activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;
      
      // Find selected company in local list (if any)
      const selectedLocalComp = localCompanies.find(c => c.name === selectedCompany);

      // === DEBUG: trace login flow ===
      console.log('[LOGIN DEBUG] selectedCompany:', selectedCompany);
      console.log('[LOGIN DEBUG] localCompanies:', localCompanies);
      console.log('[LOGIN DEBUG] selectedLocalComp:', selectedLocalComp);
      console.log('[LOGIN DEBUG] activeCompany:', activeCompany);
      console.log('[LOGIN DEBUG] username:', username);

      if (activeCompany?.url?.includes('localhost') || selectedLocalComp) {
        // ── LOCAL MODE (Opened via file or selected from API): sign in against local GoTrue ──────────────
        // Make sure we use the correct Supabase URL based on selection
        let LOCAL_SUPABASE_URL = (selectedLocalComp && activeCompany?.name !== selectedCompany) 
            ? 'http://localhost:54321' // Default local if it was selected from API list
            : (activeCompany?.url || import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321');
            
        const LOCAL_ANON_KEY     = activeCompany?.anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY ||
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1sb2NhbCIsInJlZiI6InRleGFjb3JlLWxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQ1MzUsImV4cCI6MjA5MjU5NDUzNX0.aEuY0oBAUi1C9XHpr_xFEtvPDVXYrIdnjJsZUgWJxSk';

        // ─── Cloud Detection: redirect localhost → proxy ─────────
        // When accessing via subdomain (e.g. textile001.texacore.ai),
        // localhost:54321 is unreachable — route through cloud proxy instead
        if (isCloudDomain() && (LOCAL_SUPABASE_URL.includes('localhost') || LOCAL_SUPABASE_URL.includes('127.0.0.1'))) {
          LOCAL_SUPABASE_URL = `${window.location.protocol}//${window.location.host}/_supabase`;
          console.log('☁️ [LocalLauncher] Cloud mode → using proxy:', LOCAL_SUPABASE_URL);
        }

        // Build email — accept both "admin" and "admin@company-id.local"
        let loginEmail = username.trim();
        const isPlainUsername = loginEmail && !loginEmail.includes('@');
        if (isPlainUsername) {
          // IMPORTANT FIX: Use selectedLocalComp.id if it exists and matches selectedCompany, 
          // otherwise fallback to activeCompany.id
          const compId = (selectedLocalComp && selectedLocalComp.name === selectedCompany) 
              ? selectedLocalComp.id 
              : activeCompany?.id;
              
          loginEmail = `${loginEmail}@${compId}.local`;
        }
        console.log('[LOGIN DEBUG] MODE: LOCAL, email:', loginEmail, 'url:', LOCAL_SUPABASE_URL);

        const { createClient } = await import('@supabase/supabase-js');
        const localClient = createClient(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY, {
          auth: {
            persistSession:   true,
            autoRefreshToken: true,
            storage:          window.localStorage,
            storageKey:       'sb-local-auth-token',
          }
        });

        let { data, error } = await localClient.auth.signInWithPassword({
          email:    loginEmail,
          password: password,
        });

        // Fallback: if plain username failed, try alternative email patterns
        if (error && isPlainUsername) {
          const plainName = username.trim();
          const fallbackEmails = [
            `${plainName}@texacore.local`,           // default pattern from RSF import
            `${plainName}@gmail.com`,                  // common pattern
          ];
          
          // Also check stored user emails from TCDB restore
          const storedUsers = activeCompany?.users || [];
          for (const email of storedUsers) {
            if (email.toLowerCase().startsWith(plainName.toLowerCase())) {
              fallbackEmails.unshift(email); // prioritize matching stored users
            }
          }
          
          for (const fallbackEmail of fallbackEmails) {
            if (fallbackEmail === loginEmail) continue; // skip already tried
            console.log('[LOGIN DEBUG] Fallback attempt:', fallbackEmail);
            const retry = await localClient.auth.signInWithPassword({
              email: fallbackEmail,
              password: password,
            });
            if (!retry.error && retry.data?.session) {
              data = retry.data;
              error = null;
              console.log('[LOGIN DEBUG] ✅ Fallback succeeded:', fallbackEmail);
              break;
            }
          }
        }

        if (error || !data.session) {
          setFormError(
            isRTL
              ? `خطأ في تسجيل الدخول: ${error?.message || 'بيانات غير صحيحة'}`
              : `Login error: ${error?.message || 'Invalid credentials'}`
          );
          setIsLoading(false);
          return;
        }

        // Store active company info for proper multi-tenant routing locally
        if (selectedLocalComp && !activeCompany) {
           localStorage.setItem('texacore_active_company', JSON.stringify({
              id: selectedLocalComp.id,
              name: selectedLocalComp.name,
              url: LOCAL_SUPABASE_URL,
              anonKey: LOCAL_ANON_KEY
           }));
        }

        // Session is already persisted by setSession — hard reload to /
        setTimeout(() => { window.location.href = '/'; }, 300);

      } else {
        // ── CLOUD MODE: use existing auth hook ────────────────────
        let loginEmail = username.trim();
        if (loginEmail && !loginEmail.includes('@')) {
          loginEmail = `${loginEmail}@texacore.local`;
        }

        const result = await login(loginEmail, password);
        if (result.error) {
          setFormError(result.error);
          setIsLoading(false);
        } else if (result.data?.success) {
          setTimeout(() => { navigate('/'); }, 100);
        }
      }
    } catch (err: any) {
      setFormError(err.message);
      setIsLoading(false);
    }
  };



  const features = [
    {
      icon: HardDrive,
      title: isRTL ? 'تخزين محلي 100%' : '100% Local Storage',
      description: isRTL ? 'بياناتك محفوظة بأمان على جهازك ولا يمكن لأحد الوصول إليها.' : 'Your data is securely stored on your device.'
    },
    {
      icon: Cloud,
      title: isRTL ? 'تقنية النفق السحابي' : 'Cloud Tunnel Tech',
      description: isRTL ? 'وصول آمن من أي مكان عبر دومين فرعي مخصص.' : 'Secure access from anywhere via custom subdomain.'
    },
    {
      icon: Cpu,
      title: isRTL ? 'ميزات الذكاء الاصطناعي' : 'AI Powered',
      description: isRTL ? 'تحليل بياناتك المحلية بأمان وسرية تامة باستخدام AI.' : 'Analyze your local data securely using advanced AI.'
    }
  ];

  return (
    <div
      className="min-h-screen flex flex-row-reverse"
      dir={direction}
    >
      {/* ========== NAVY HERO SECTION ========== */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundColor: '#111827' }}>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/20" />
        
        {/* Radial Glow Effect */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-20"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.4) 0%, transparent 70%)'
          }}
        />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px'
          }}
        />

        {/* Content Container */}
        <div className="relative z-10 flex flex-col justify-between p-10 w-full h-full">
          
          {/* Top - Logo with Animation */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <HardDrive className="text-white w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">
              TexaCore <span className="text-blue-400 font-light">Desktop</span>
            </h1>
          </div>

          {/* Middle - Hero Content */}
          <div className="space-y-8 max-w-md w-full mx-auto">
            <div>
              <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
                {isRTL ? 'النسخة الهجينة' : 'Hybrid Edition'}
              </h1>
              <p className="text-white/60 text-lg leading-relaxed">
                {isRTL ? 'اجمع بين أمان البيانات المحلية وقوة الميزات السحابية.' : 'Combine local data security with cloud features.'}
              </p>
            </div>

            <div className="space-y-5">
              {features.map((feature, index) => (
                <FeatureItem
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              ))}
            </div>
          </div>

          {/* Bottom - Trust Badges */}
          <div className="flex justify-center items-center gap-8 py-6 border-t border-white/10 text-white/50 text-sm">
             <div className="flex items-center gap-2">
               <ShieldCheck className="w-4 h-4" />
               <span>{isRTL ? 'مشفر بالكامل' : 'Fully Encrypted'}</span>
             </div>
             <div className="w-px h-4 bg-white/10" />
             <div className="flex items-center gap-2">
               <Wifi className="w-4 h-4" />
               <span>{isRTL ? 'يعمل بدون إنترنت' : 'Works Offline'}</span>
             </div>
          </div>
        </div>
      </div>

      {/* ========== WHITE FORM SECTION ========== */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white min-h-screen">
        
        {/* Top Bar */}
        <div className="flex justify-between items-center p-6">
          <div className="lg:hidden flex items-center gap-2">
            <HardDrive className="text-gray-900 w-6 h-6" />
            <span className="font-bold text-gray-900">TexaCore Desktop</span>
          </div>

          <div className="ms-auto">
            <LanguageSelector
              currentLanguage={language}
              supportedLanguages={supportedLanguages}
              onLanguageChange={(lang) => setLanguage(lang as any)}
            />
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 w-full max-w-2xl mx-auto relative">
          {/* ═══ RSF Import Loading Overlay ═══ */}
          <AnimatePresence>
            {rsfImporting && (
              <motion.div
                key="rsf-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-2xl"
              >
                <div className="flex flex-col items-center gap-6 max-w-sm mx-auto px-8">
                  {/* Animated Icon */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20">
                      <Database className="w-9 h-9 text-white" />
                    </div>
                    {/* Spinning ring */}
                    <div className="absolute -inset-2">
                      <svg className="w-24 h-24 animate-spin" style={{ animationDuration: '3s' }} viewBox="0 0 96 96">
                        <circle cx="48" cy="48" r="44" fill="none" stroke="url(#importGrad)" strokeWidth="2.5" strokeDasharray="70 200" strokeLinecap="round" />
                        <defs>
                          <linearGradient id="importGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    {/* Pulsing dot */}
                    <div className="absolute -bottom-1 -end-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-lg">
                      <div className="w-full h-full rounded-full bg-green-400 animate-ping" />
                    </div>
                  </div>

                  {/* Text */}
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {isRTL ? 'جاري تجهيز البيانات...' : 'Preparing Data...'}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {isRTL
                        ? 'يتم تحليل واستيراد بيانات الشركة. يُرجى الانتظار وعدم إغلاق النافذة.'
                        : 'Analyzing and importing company data. Please wait and do not close this window.'}
                    </p>
                  </div>

                  {/* Progress Step */}
                  {rsfProgress && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full"
                    >
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="truncate">{rsfProgress.step}</span>
                        </div>
                        {rsfProgress.total > 1 && (
                          <>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                                initial={{ width: '0%' }}
                                animate={{ width: `${Math.min(100, (rsfProgress.current / rsfProgress.total) * 100)}%` }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-gray-400" dir="ltr">
                              <span>{rsfProgress.current.toLocaleString()}</span>
                              <span>{rsfProgress.total.toLocaleString()}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {showAdminPortal ? (
              <motion.div
                key="admin-portal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm mx-auto"
              >
                <div className="mb-8">
                  <button 
                    onClick={() => setShowAdminPortal(false)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6 font-medium"
                  >
                    <ArrowIcon className="w-4 h-4" />
                    {isRTL ? 'العودة' : 'Back'}
                  </button>
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                    <ShieldCheck className="w-6 h-6 text-gray-700" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {isRTL ? 'بوابة الإدارة' : 'Admin Portal'}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {isRTL ? 'أدخل كلمة المرور الرئيسية للسيرفر لعرض كافة الشركات.' : 'Enter master server password to view all companies.'}
                  </p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      {isRTL ? 'الرقم السري الرئيسي' : 'Master Password'}
                    </Label>
                    <Input
                      type="password"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="••••••••"
                      dir="ltr"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold bg-[#111827] hover:bg-blue-700 text-white shadow-lg transition-all mt-4"
                  >
                    {isRTL ? 'دخول الإدارة' : 'Admin Login'}
                  </Button>
                </form>
              </motion.div>

            ) : !selectedCompany ? (
              <motion.div
                key="company-list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                {(!isCloudDomain() || isAdminAuthenticated) ? (
                  <>
                    <div className="text-center space-y-2 mb-8">
                      <h2 className="text-3xl font-bold text-gray-900">
                        {isRTL ? 'مرحباً بك مجدداً' : 'Welcome Back'}
                      </h2>
                      <p className="text-gray-500">
                        {isRTL ? 'اختر الشركة للبدء أو قم بإنشاء شركة جديدة' : 'Select a company to start or create a new one'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {localCompanies.map((company) => (
                        <div
                          key={company.id}
                          className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group text-start"
                        >
                          <button
                            onClick={() => setSelectedCompany(company.name)}
                            className="flex items-center gap-4 flex-1 text-start"
                          >
                            <div className="w-12 h-12 bg-gray-50 text-gray-700 rounded-lg flex items-center justify-center text-xl font-bold font-serif group-hover:scale-105 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all border border-gray-100">
                              {company.logo}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-base">{company.name}</h3>
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                {isRTL ? 'قاعدة بيانات محلية' : 'Local Database'}
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteCompany(company.id, company.name); }}
                              className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                              title={isRTL ? 'حذف الشركة' : 'Delete company'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <ChevronRight className={cn("w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors", isRTL && "rotate-180")} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {!isCloudDomain() && (
                      <>
                        <div className="relative my-8">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                          </div>
                          <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-gray-400">
                              {isRTL ? 'الخيارات الإضافية' : 'Additional Options'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => navigate('/local-setup')}
                            className="flex flex-col items-center justify-center p-5 border border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-colors group"
                          >
                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                              <Plus className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                            </div>
                            <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-700">
                              {isRTL ? 'إنشاء شركة جديدة' : 'Create New'}
                            </span>
                          </button>
                          
                          <button 
                            onClick={async () => {
                              if (rsfImporting) return;
                              
                              // Try native file dialog first (gets full path including USB)
                              try {
                                setRsfImporting(true);
                                setRsfProgress({ step: isRTL ? 'جاري اختيار الملف...' : 'Selecting file...', current: 0, total: 1 });
                                
                                console.log('[OpenFile] Calling /api/open-tcdb...');
                                const response = await fetch('http://127.0.0.1:1960/api/open-tcdb');
                                const result = await response.json();
                                console.log('[OpenFile] Response:', JSON.stringify(result));
                                
                                if (result.canceled) {
                                  console.log('[OpenFile] User canceled');
                                  setRsfImporting(false);
                                  setRsfProgress(null);
                                  return;
                                }
                                
                                if (result.success && result.type === 'tcdb') {
                                  // TCDB restored — go directly to login (like traditional programs)
                                  console.log('[OpenFile] ✅ TCDB restored:', result.companyName);
                                  console.log('[OpenFile] Company ID:', result.companyId, 'Users:', result.users);
                                  const companyName = result.companyName;
                                  const LOCAL_SUPABASE_URL = 'http://localhost:54321';
                                  const LOCAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1sb2NhbCIsInJlZiI6InRleGFjb3JlLWxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQ1MzUsImV4cCI6MjA5MjU5NDUzNX0.aEuY0oBAUi1C9XHpr_xFEtvPDVXYrIdnjJsZUgWJxSk';
                                  
                                  localStorage.setItem('texacore_active_company', JSON.stringify({
                                    id: result.companyId || 'restored',
                                    name: companyName,
                                    url: LOCAL_SUPABASE_URL,
                                    anonKey: LOCAL_ANON_KEY,
                                    tcdbPath: result.tcdbPath,
                                    users: result.users || [],
                                  }));
                                  
                                  localStorage.removeItem('texacore_cached_ids');
                                  localStorage.removeItem('sb-local-auth-token');
                                  
                                  setRsfImporting(false);
                                  setRsfProgress(null);
                                  
                                  // Reload page — login form will appear automatically
                                  // Company data is already restored in the DB
                                  window.location.reload();
                                  return;
                                }
                                
                                if (result.success && result.type === 'rsf') {
                                  // RSF file selected — trigger import via path
                                  console.log('[OpenFile] RSF file selected:', result.filePath);
                                  setRsfProgress({ step: isRTL ? 'جاري استيراد البيانات...' : 'Importing data...', current: 0, total: 1 });
                                  
                                  try {
                                    const controller = new AbortController();
                                    const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout
                                    
                                    const importRes = await fetch('http://127.0.0.1:1960/api/import-rsf-path', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ filePath: result.filePath }),
                                      signal: controller.signal,
                                    });
                                    clearTimeout(timeout);
                                    
                                    console.log('[OpenFile] Import response status:', importRes.status);
                                    
                                    if (!importRes.ok) {
                                      let errorMsg = `Error ${importRes.status}`;
                                      try {
                                        const errBody = await importRes.json();
                                        errorMsg = errBody.error || errorMsg;
                                      } catch {}
                                      console.error('[OpenFile] Import failed:', errorMsg);
                                      setRsfImporting(false);
                                      setRsfProgress(null);
                                      alert(isRTL ? `فشل الاستيراد: ${errorMsg}` : `Import failed: ${errorMsg}`);
                                      return;
                                    }
                                    
                                    const importResult = await importRes.json();
                                    console.log('[OpenFile] Import result:', JSON.stringify(importResult));
                                    setRsfImporting(false);
                                    setRsfProgress(null);
                                    
                                    if (importResult.success) {
                                      const companyName = importResult.companyName || result.filePath.split(/[/\\]/).pop()?.replace('.rsf', '') || 'Company';
                                      console.log('[OpenFile] ✅ RSF imported:', companyName);
                                      setImportReport({
                                        show: true, companyName,
                                        counts: importResult.counts || {},
                                        users: importResult.users || [],
                                        tcdbPath: importResult.tcdbPath || null,
                                        timestamp: new Date().toLocaleString(isRTL ? 'ar-SA' : 'en-US'),
                                      });
                                      
                                      // Reload companies list
                                      try {
                                        const compRes = await fetch('http://127.0.0.1:1960/api/companies');
                                        if (compRes.ok) {
                                          const compData = await compRes.json();
                                          if (compData.success && compData.companies) setLocalCompanies(compData.companies);
                                        }
                                      } catch {}
                                      
                                      setSelectedCompany(companyName);
                                    } else {
                                      console.error('[OpenFile] Import returned error:', importResult.error);
                                      alert(importResult.error || (isRTL ? 'فشل الاستيراد' : 'Import failed'));
                                    }
                                  } catch (importErr: any) {
                                    console.error('[OpenFile] Import exception:', importErr.message);
                                    setRsfImporting(false);
                                    setRsfProgress(null);
                                    alert(isRTL ? `خطأ أثناء الاستيراد: ${importErr.message}` : `Import error: ${importErr.message}`);
                                  }
                                  return;
                                }
                                
                                // Failed or unknown response — show error
                                console.warn('[OpenFile] Response:', result);
                                setRsfImporting(false);
                                setRsfProgress(null);
                                if (result.error) {
                                  alert(result.error);
                                }
                              } catch (err: any) {
                                // API not available — fallback to browser file input
                                console.error('[OpenFile] API error:', err.message);
                                setRsfImporting(false);
                                setRsfProgress(null);
                                document.getElementById('company-file-upload')?.click();
                              }
                            }}
                            disabled={rsfImporting}
                            className={cn(
                              "flex flex-col items-center justify-center p-5 border border-dashed rounded-xl transition-colors group",
                              rsfImporting
                                ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                                : "border-gray-300 hover:border-blue-500 hover:bg-blue-50/50"
                            )}
                          >
                            {/* Hidden file input — accepts .tcdb and .rsf files */}
                            <input 
                              type="file" 
                              id="company-file-upload" 
                              className="hidden" 
                              accept=".tcdb,.rsf"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                const isRsf = file.name.endsWith('.rsf');
                                const isTcdb = file.name.endsWith('.tcdb');

                                if (!isTcdb && !isRsf) {
                                  alert(isRTL ? 'يجب اختيار ملف بامتداد .tcdb أو .rsf' : 'You must select a .tcdb or .rsf file');
                                  e.target.value = '';
                                  return;
                                }

                                // ── RSF Import (Al-Rasheed) ──
                                if (isRsf) {
                                  try {
                                    setRsfImporting(true);
                                    setRsfProgress({ step: isRTL ? 'جاري التحليل...' : 'Analyzing...', current: 0, total: 1 });

                                    let result: any;
                                    const filePath = (file as any).path;

                                    if (filePath && (window as any).texacore?.importRSF) {
                                      // ── Electron IPC mode ──
                                      (window as any).texacore?.onRsfProgress?.((p: any) => setRsfProgress(p));
                                      result = await (window as any).texacore.importRSF(filePath);
                                    } else {
                                      // ── Browser mode — upload via HTTP to local API ──
                                      setRsfProgress({ step: isRTL ? 'جاري رفع الملف...' : 'Uploading file...', current: 0, total: 1 });
                                      const formData = new FormData();
                                      formData.append('file', file);
                                      
                                      const response = await fetch('http://127.0.0.1:1960/api/import-rsf', {
                                        method: 'POST',
                                        body: formData,
                                      });
                                      result = await response.json();
                                    }

                                    setRsfImporting(false);
                                    setRsfProgress(null);

                                    if (!result.success) {
                                      alert(isRTL ? `خطأ في الاستيراد: ${result.error}` : `Import error: ${result.error}`);
                                      return;
                                    }

                                    // Success — set company and show login
                                    // Use companyName from API result (which matches DB), fallback to filename
                                    const companyName = result.companyName || file.name.replace('.rsf', '');
                                    const LOCAL_SUPABASE_URL = 'http://localhost:54321';
                                    const LOCAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1sb2NhbCIsInJlZiI6InRleGFjb3JlLWxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQ1MzUsImV4cCI6MjA5MjU5NDUzNX0.aEuY0oBAUi1C9XHpr_xFEtvPDVXYrIdnjJsZUgWJxSk';

                                    localStorage.setItem('texacore_active_company', JSON.stringify({
                                      id: result.companyId || result.companyName,
                                      name: companyName,
                                      url: LOCAL_SUPABASE_URL,
                                      anonKey: LOCAL_ANON_KEY,
                                      source: 'rsf',
                                      importCounts: result.counts,
                                    }));

                                    localStorage.removeItem('texacore_cached_ids');
                                    localStorage.removeItem('sb-local-auth-token');

                                    // ═══ عرض تقرير الاستيراد الذكي بدل alert() ═══
                                    setImportReport({
                                      show: true,
                                      companyName: companyName,
                                      counts: result.counts || {},
                                      users: result.users || [],
                                      tcdbPath: result.tcdbPath || null,
                                      timestamp: new Date().toLocaleString(isRTL ? 'ar-SA' : 'en-US'),
                                    });

                                    // حفظ التقرير في localStorage لإعادة فتحه لاحقاً
                                    localStorage.setItem('texacore_last_import_report', JSON.stringify({
                                      companyName,
                                      counts: result.counts || {},
                                      users: result.users || [],
                                      timestamp: new Date().toISOString(),
                                    }));

                                    // Reload companies list
                                    try {
                                      const compRes = await fetch('http://127.0.0.1:1960/api/companies');
                                      if (compRes.ok) {
                                        const compData = await compRes.json();
                                        if (compData.success && compData.companies) {
                                          setLocalCompanies(compData.companies);
                                        }
                                      }
                                    } catch {}

                                    setSelectedCompany(companyName);
                                  } catch (err: any) {
                                    setRsfImporting(false);
                                    setRsfProgress(null);
                                    alert(isRTL ? `خطأ: ${err.message}` : `Error: ${err.message}`);
                                  }
                                  e.target.value = '';
                                  return;
                                }

                                try {
                                  // Read file as ArrayBuffer first to detect format
                                  const arrayBuffer = await file.arrayBuffer();
                                  const bytes = new Uint8Array(arrayBuffer);
                                  
                                  // Check for TCDB binary header (magic bytes: 0x54 0x43 0x44 0x42 = "TCDB")
                                  const isBinaryTcdb = bytes.length >= 4 &&
                                    bytes[0] === 0x54 && bytes[1] === 0x43 &&
                                    bytes[2] === 0x44 && bytes[3] === 0x42;

                                  if (isBinaryTcdb) {
                                    // ── Encrypted TCDB backup file ──
                                    const companyName = file.name.replace('.tcdb', '');
                                    const LOCAL_SUPABASE_URL = 'http://localhost:54321';
                                    const LOCAL_ANON_KEY =
                                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1sb2NhbCIsInJlZiI6InRleGFjb3JlLWxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQ1MzUsImV4cCI6MjA5MjU5NDUzNX0.aEuY0oBAUi1C9XHpr_xFEtvPDVXYrIdnjJsZUgWJxSk';

                                    // Restore via Electron IPC or HTTP API
                                    try {
                                      setRsfImporting(true);
                                      setRsfProgress({ step: isRTL ? 'جاري استعادة البيانات من الملف...' : 'Restoring data from file...', current: 0, total: 1 });

                                      let restoreResult: any = null;
                                      const filePath = (file as any).path;

                                      if (filePath && (window as any).texacore?.restoreBackup) {
                                        // Electron IPC mode
                                        restoreResult = await (window as any).texacore.restoreBackup(filePath);
                                      } else {
                                        // Browser HTTP mode — upload to restore endpoint
                                        const formData = new FormData();
                                        formData.append('file', file);
                                        const response = await fetch('http://127.0.0.1:1960/api/restore-tcdb', {
                                          method: 'POST',
                                          body: formData,
                                        });
                                        restoreResult = await response.json();
                                      }

                                      setRsfImporting(false);
                                      setRsfProgress(null);

                                      if (restoreResult && !restoreResult.success) {
                                        alert(isRTL ? `خطأ في الاستعادة: ${restoreResult.error}` : `Restore error: ${restoreResult.error}`);
                                        return;
                                      }
                                    } catch (restoreErr: any) {
                                      setRsfImporting(false);
                                      setRsfProgress(null);
                                      console.warn('[TCDB] Restore error:', restoreErr.message);
                                      // Continue even if restore fails — user might have existing data
                                    }

                                    localStorage.setItem('texacore_active_company', JSON.stringify({
                                      id: 'restored',
                                      name: companyName,
                                      url: LOCAL_SUPABASE_URL,
                                      anonKey: LOCAL_ANON_KEY,
                                    }));

                                    localStorage.removeItem('texacore_cached_ids');
                                    localStorage.removeItem('sb-local-auth-token');
                                    setSelectedCompany(companyName);
                                    
                                  } else {
                                    // ── Old JSON anchor file ──
                                    const text = new TextDecoder().decode(bytes);
                                    const data = JSON.parse(text);

                                    if (data.app !== 'TexaCore ERP') {
                                      alert(isRTL ? 'الملف المختار ليس ملف شركة TexaCore صحيح.' : 'The selected file is not a valid TexaCore company file.');
                                      return;
                                    }

                                    const LOCAL_SUPABASE_URL = `http://localhost:${data.supabasePort || '54321'}`;
                                    const LOCAL_ANON_KEY =
                                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1sb2NhbCIsInJlZiI6InRleGFjb3JlLWxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQ1MzUsImV4cCI6MjA5MjU5NDUzNX0.aEuY0oBAUi1C9XHpr_xFEtvPDVXYrIdnjJsZUgWJxSk';

                                    localStorage.setItem('texacore_active_company', JSON.stringify({
                                      id: data.companyId,
                                      name: data.name,
                                      url: LOCAL_SUPABASE_URL,
                                      anonKey: LOCAL_ANON_KEY,
                                    }));

                                    localStorage.removeItem('texacore_cached_ids');
                                    localStorage.removeItem('sb-local-auth-token');
                                    setSelectedCompany(data.name || file.name.replace('.tcdb', ''));
                                  }
                                } catch {
                                  alert(isRTL ? 'تعذّر قراءة الملف. تأكد أنه ملف .tcdb صحيح.' : 'Could not read file. Make sure it is a valid .tcdb file.');
                                }
                                e.target.value = '';
                              }}
                            />
                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                              <FileUp className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                            </div>
                            <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-700">
                              {isRTL ? 'فتح ملف شركة' : 'Open Company File'}
                            </span>
                            <span className="text-xs text-gray-400 mt-1">.tcdb / .rsf</span>
                          </button>

                        </div>
                      </>
                    )}
                  </>
                ) : (
                  // Empty State for Cloud Domain when no company is selected
                  <div className="text-center py-12 px-4 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                    <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {isRTL ? 'مرحباً بك في الوصول السحابي' : 'Welcome to Cloud Access'}
                    </h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
                      {isRTL 
                        ? 'يرجى استخدام الرابط المخصص للشركة المرسل لك من قبل الإدارة للدخول المباشر لشركتك.' 
                        : 'Please use the specific company link provided by your administration to log in directly.'}
                    </p>
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowAdminPortal(true)}
                      className="text-xs text-gray-400 hover:text-gray-600 gap-2"
                    >
                      <Lock className="w-3 h-3" />
                      {isRTL ? 'بوابة الإدارة السحابية' : 'Cloud Admin Portal'}
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-sm mx-auto"
              >
                <div className="mb-8">
                  {(!isCloudDomain() || isAdminAuthenticated) && (
                    <button 
                      onClick={() => {
                        setSelectedCompany(null);
                        localStorage.removeItem('texacore_saved_company');
                      }}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6 font-medium"
                    >
                      <ArrowIcon className="w-4 h-4" />
                      {isRTL ? 'العودة للقائمة' : 'Back to List'}
                    </button>
                  )}
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedCompany}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {isRTL ? 'أدخل بيانات الدخول للوصول لقاعدة البيانات المحلية.' : 'Enter credentials to access local database.'}
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      {isRTL ? 'اسم المستخدم أو البريد' : 'Username or Email'}
                    </Label>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={cn("h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20", isRTL ? "text-right" : "text-left")}
                      placeholder="admin"
                      required
                    />
                  </div>

                  <div className="space-y-2 relative">
                    <Label className="text-sm font-medium text-gray-700">
                      {isRTL ? 'كلمة المرور' : 'Password'}
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={cn("h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 pe-10", isRTL ? "text-right" : "text-left")}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors end-3"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {formError && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                      {formError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 text-base font-semibold bg-[#111827] hover:bg-blue-700 text-white shadow-lg transition-all mt-4"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {isRTL ? 'دخول النظام' : 'Access System'}
                        <LogIn className={cn("w-5 h-5 ms-2", isRTL && "rotate-180")} />
                      </>
                    )}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ Import Report Modal ═══ */}
          <AnimatePresence>
            {importReport?.show && (
              <motion.div
                key="import-report-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={() => setImportReport(prev => prev ? { ...prev, show: false } : null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden"
                  dir={direction}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 end-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">
                              {isRTL ? 'تقرير الاستيراد' : 'Import Report'}
                            </h3>
                            <p className="text-white/70 text-xs">{importReport.timestamp}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setImportReport(prev => prev ? { ...prev, show: false } : null)}
                          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-white/80">
                        {isRTL 
                          ? `✅ تم استيراد بيانات "${importReport.companyName}" بنجاح`
                          : `✅ "${importReport.companyName}" imported successfully`}
                      </p>
                      {importReport.tcdbPath && (
                        <p className="text-xs text-white/60 mt-1 flex items-center gap-1">
                          💾 {isRTL 
                            ? `ملف البيانات: ${importReport.tcdbPath} — يتم تحديثه تلقائياً كل 5 دقائق`
                            : `Data file: ${importReport.tcdbPath} — auto-synced every 5 min`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="p-5 overflow-y-auto max-h-[50vh] space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'accounts', icon: BarChart3, label: isRTL ? 'حسابات' : 'Accounts', color: 'blue' },
                        { key: 'customers', icon: Users, label: isRTL ? 'عملاء' : 'Customers', color: 'indigo' },
                        { key: 'suppliers', icon: Package, label: isRTL ? 'موردين' : 'Suppliers', color: 'purple' },
                        { key: 'materials', icon: Database, label: isRTL ? 'مواد' : 'Materials', color: 'cyan' },
                        { key: 'warehouses', icon: Warehouse, label: isRTL ? 'مستودعات' : 'Warehouses', color: 'emerald' },
                        { key: 'inventoryStock', icon: ClipboardList, label: isRTL ? 'أرصدة مخزون' : 'Stock Records', color: 'teal' },
                        { key: 'journalEntries', icon: FileText, label: isRTL ? 'قيود' : 'Entries', color: 'amber' },
                        { key: 'salesInvoices', icon: Receipt, label: isRTL ? 'فواتير مبيعات' : 'Sales Inv.', color: 'green' },
                        { key: 'purchaseInvoices', icon: Receipt, label: isRTL ? 'فواتير مشتريات' : 'Purchase Inv.', color: 'orange' },
                        { key: 'inventoryMoves', icon: Warehouse, label: isRTL ? 'حركات مستودع' : 'Inv. Moves', color: 'sky' },
                        { key: 'receipts', icon: Banknote, label: isRTL ? 'سندات قبض/دفع' : 'Receipts', color: 'rose' },
                        { key: 'costCenters', icon: Building2, label: isRTL ? 'مراكز تكلفة' : 'Cost Centers', color: 'slate' },
                      ].filter(item => (importReport.counts[item.key] || 0) > 0).map((item) => {
                        const Icon = item.icon;
                        const count = importReport.counts[item.key] || 0;
                        const colorMap: Record<string, string> = {
                          blue: 'bg-blue-50 text-blue-600', indigo: 'bg-indigo-50 text-indigo-600',
                          purple: 'bg-purple-50 text-purple-600', cyan: 'bg-cyan-50 text-cyan-600',
                          emerald: 'bg-emerald-50 text-emerald-600', teal: 'bg-teal-50 text-teal-600',
                          amber: 'bg-amber-50 text-amber-600', green: 'bg-green-50 text-green-600',
                          orange: 'bg-orange-50 text-orange-600', sky: 'bg-sky-50 text-sky-600',
                          rose: 'bg-rose-50 text-rose-600', slate: 'bg-slate-50 text-slate-600',
                        };
                        return (
                          <motion.div
                            key={item.key}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * Object.keys(importReport.counts).indexOf(item.key) }}
                            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                          >
                            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", colorMap[item.color] || 'bg-gray-50 text-gray-600')}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-500 truncate">{item.label}</p>
                              <p className="text-base font-bold text-gray-900" dir="ltr">{count.toLocaleString()}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Users Section */}
                    {importReport.users && importReport.users.length > 0 && (
                      <div className="border-t border-gray-100 pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-500" />
                          {isRTL ? 'بيانات الدخول المنشأة' : 'Created Users'}
                        </h4>
                        <div className="space-y-2">
                          {importReport.users.map((u: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">
                                {u.name?.charAt(0) || 'U'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{u.name || u.username}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500" dir="ltr">
                                  <span>{u.username}</span>
                                  <span>•</span>
                                  <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{u.password}</span>
                                  <span>•</span>
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-xs font-medium",
                                    u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'accountant' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                                  )}>
                                    {u.role === 'admin' ? (isRTL ? 'مدير' : 'Admin') : u.role === 'accountant' ? (isRTL ? 'محاسب' : 'Accountant') : (isRTL ? 'مشاهد' : 'Viewer')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                          ⚠️ {isRTL ? 'يُرجى تغيير كلمة المرور بعد أول تسجيل دخول' : 'Please change passwords after first login'}
                        </p>
                      </div>
                    )}

                    {/* Default credentials if no users */}
                    {(!importReport.users || importReport.users.length === 0) && (
                      <div className="border-t border-gray-100 pt-4">
                        <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">A</div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{isRTL ? 'بيانات الدخول الافتراضية' : 'Default Login'}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500" dir="ltr">
                              <span>admin</span> <span>•</span> <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">admin123</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                          ⚠️ {isRTL ? 'يُرجى تغيير كلمة المرور بعد أول تسجيل دخول' : 'Please change passwords after first login'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <button
                      onClick={() => setImportReport(prev => prev ? { ...prev, show: false } : null)}
                      className="w-full py-2.5 bg-[#111827] hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
                    >
                      {isRTL ? 'متابعة لتسجيل الدخول' : 'Continue to Login'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Build Version Info */}
        <div className="absolute bottom-4 end-6 text-xs text-gray-400 font-mono text-end opacity-70 pointer-events-none">
          <div>TexaCore ERP v{import.meta.env.VITE_APP_VERSION}</div>
          <div>Build: {import.meta.env.VITE_BUILD_DATE?.replace('T', ' ').substring(0, 19)} UTC</div>
        </div>
      </div>
    </div>
  );
}
