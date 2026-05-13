import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MonitorSmartphone,
  Info,
  FolderOpen,
  LineChart,
  Terminal,
  ExternalLink,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  X,
  Globe,
  MapPin,
  Laptop,
  Power,
  PowerOff,
  RefreshCw,
  MessageSquare,
  Activity
} from 'lucide-react';
import { SheetClose } from '@/components/ui/sheet';

interface Device {
  id: string;
  name: string;
  os: string;
  status: string;
  company: string;
  branch: string;
  user: string;
}

interface DeviceDetailsSheetProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DeviceDetailsSheet({ device, isOpen, onClose }: DeviceDetailsSheetProps) {
  const { t, language, direction } = useLanguage();
  const [activeTab, setActiveTab] = useState('details');

  if (!device) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Width set to roughly 50% of the screen as requested */}
      <SheetContent 
        side={language === 'ar' ? 'left' : 'right'} 
        className="w-full sm:max-w-[50vw] p-0 flex flex-col bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
      >
        {/* Header Section */}
        <SheetHeader className="p-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between relative">
            <SheetClose className="absolute rtl:-right-2 ltr:-right-2 -top-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </SheetClose>
            
            <div className="flex items-center gap-4 mt-2">
              <div className={`p-3 rounded-xl ${device.status === 'online' ? 'bg-erp-teal/10 text-erp-teal' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                <MonitorSmartphone className="w-8 h-8" />
              </div>
              <div>
                <SheetTitle className="text-2xl font-bold font-cairo text-erp-navy dark:text-white flex items-center gap-2">
                  {device.name}
                  <Badge variant={device.status === 'online' ? 'default' : 'secondary'} className={device.status === 'online' ? 'bg-erp-teal hover:bg-erp-teal/90' : ''}>
                    {device.status === 'online' ? (language === 'ar' ? 'متصل' : 'Online') : (language === 'ar' ? 'غير متصل' : 'Offline')}
                  </Badge>
                </SheetTitle>
                <div className="text-sm text-gray-500 font-tajawal mt-1">
                  {device.os} • {device.user} • {device.branch}
                </div>
              </div>
            </div>
            
            {/* Quick Action Button for Full Control */}
            <Button className="gap-2 bg-erp-navy hover:bg-erp-navy/90 text-white font-tajawal">
              <ExternalLink className="w-4 h-4" />
              {t('mdm.sheet.fullControl', language === 'ar' ? 'تحكم كامل (نافذة جديدة)' : 'Full Control')}
            </Button>
          </div>
        </SheetHeader>

        {/* Tabs Section */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          <Tabs dir={direction} defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
            <div className="sticky top-0 z-20 px-6 pt-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <TabsList className="bg-transparent border-b border-gray-200 dark:border-gray-800 w-full justify-start h-auto p-0 rounded-none gap-6 flex-row overflow-x-auto hide-scrollbar">
                
                <TabsTrigger 
                  value="details" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-erp-teal rounded-none px-0 pb-3 gap-2 font-tajawal font-bold text-gray-500 data-[state=active]:text-erp-navy dark:data-[state=active]:text-white whitespace-nowrap"
                >
                  <Info className="w-4 h-4" />
                  {t('mdm.tabs.details', language === 'ar' ? 'التفاصيل والمواصفات' : 'Details')}
                </TabsTrigger>

                <TabsTrigger 
                  value="remote" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-erp-teal rounded-none px-0 pb-3 gap-2 font-tajawal font-bold text-gray-500 data-[state=active]:text-erp-navy dark:data-[state=active]:text-white whitespace-nowrap"
                >
                  <MonitorSmartphone className="w-4 h-4" />
                  {t('mdm.tabs.remote', language === 'ar' ? 'التحكم والشاشة' : 'Remote Screen')}
                </TabsTrigger>

                <TabsTrigger 
                  value="files" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-erp-teal rounded-none px-0 pb-3 gap-2 font-tajawal font-bold text-gray-500 data-[state=active]:text-erp-navy dark:data-[state=active]:text-white whitespace-nowrap"
                >
                  <FolderOpen className="w-4 h-4" />
                  {t('mdm.tabs.files', language === 'ar' ? 'مدير الملفات' : 'Files')}
                </TabsTrigger>

                <TabsTrigger 
                  value="terminal" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-erp-teal rounded-none px-0 pb-3 gap-2 font-tajawal font-bold text-gray-500 data-[state=active]:text-erp-navy dark:data-[state=active]:text-white whitespace-nowrap"
                >
                  <Terminal className="w-4 h-4" />
                  {t('mdm.tabs.terminal', language === 'ar' ? 'موجه الأوامر' : 'Terminal')}
                </TabsTrigger>

                <TabsTrigger 
                  value="chat" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-erp-teal rounded-none px-0 pb-3 gap-2 font-tajawal font-bold text-gray-500 data-[state=active]:text-erp-navy dark:data-[state=active]:text-white whitespace-nowrap"
                >
                  <MessageSquare className="w-4 h-4" />
                  {t('mdm.tabs.chat', language === 'ar' ? 'المحادثة' : 'Chat')}
                </TabsTrigger>

                <TabsTrigger 
                  value="recordings" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-erp-teal rounded-none px-0 pb-3 gap-2 font-tajawal font-bold text-gray-500 data-[state=active]:text-erp-navy dark:data-[state=active]:text-white whitespace-nowrap"
                >
                  <Activity className="w-4 h-4" />
                  {language === 'ar' ? 'التسجيلات' : 'Recordings'}
                </TabsTrigger>

                <TabsTrigger 
                  value="analytics" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-erp-teal rounded-none px-0 pb-3 gap-2 font-tajawal font-bold text-gray-500 data-[state=active]:text-erp-navy dark:data-[state=active]:text-white whitespace-nowrap"
                >
                  <LineChart className="w-4 h-4" />
                  {language === 'ar' ? 'التحليلات' : 'Analytics'}
                </TabsTrigger>

              </TabsList>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* DETAILS TAB */}
              <TabsContent value="details" className="m-0 space-y-8">
                
                {/* Power Controls */}
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-tajawal">
                    <RefreshCw className="w-4 h-4" />
                    {language === 'ar' ? 'إعادة تشغيل الجهاز' : 'Restart Device'}
                  </Button>
                  <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 font-tajawal">
                    <PowerOff className="w-4 h-4" />
                    {language === 'ar' ? 'إيقاف التشغيل' : 'Power Off'}
                  </Button>
                  <Button variant="outline" className="gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 font-tajawal">
                    <Power className="w-4 h-4" />
                    {language === 'ar' ? 'وضع السكون' : 'Sleep'}
                  </Button>
                </div>

                {/* System & Hardware */}
                <div>
                  <h3 className="font-cairo font-bold text-lg text-erp-navy dark:text-white mb-4 flex items-center gap-2">
                    <Laptop className="w-5 h-5 text-gray-400" />
                    {language === 'ar' ? 'مواصفات النظام والعتاد' : 'System & Hardware'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg"><Cpu /></div>
                      <div>
                        <p className="text-xs text-gray-500 font-tajawal">{language === 'ar' ? 'المعالج (CPU)' : 'Processor'}</p>
                        <p className="font-bold text-gray-900 dark:text-white text-sm" dir="ltr">Intel Core i7-12700H @ 2.30GHz</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-lg"><MemoryStick /></div>
                      <div>
                        <p className="text-xs text-gray-500 font-tajawal">{language === 'ar' ? 'الذاكرة (RAM)' : 'Memory'}</p>
                        <p className="font-bold text-gray-900 dark:text-white text-sm" dir="ltr">16 GB DDR5 (3.2 GB Used)</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                      <div className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 rounded-lg"><HardDrive /></div>
                      <div>
                        <p className="text-xs text-gray-500 font-tajawal">{language === 'ar' ? 'التخزين الأساسي' : 'Storage'}</p>
                        <p className="font-bold text-gray-900 dark:text-white text-sm" dir="ltr">512 GB NVMe SSD (60% Free)</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"><Laptop /></div>
                      <div>
                        <p className="text-xs text-gray-500 font-tajawal">{language === 'ar' ? 'نظام التشغيل' : 'OS Version'}</p>
                        <p className="font-bold text-gray-900 dark:text-white text-sm" dir="ltr">Windows 11 Pro (Build 22631)</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Network & Location */}
                <div>
                  <h3 className="font-cairo font-bold text-lg text-erp-navy dark:text-white mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-gray-400" />
                    {language === 'ar' ? 'الشبكة والموقع' : 'Network & Location'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                      <div className="p-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 rounded-lg"><Network /></div>
                      <div>
                        <p className="text-xs text-gray-500 font-tajawal">{language === 'ar' ? 'الـ IP الداخلي (LAN)' : 'Internal IP'}</p>
                        <p className="font-bold text-gray-900 dark:text-white text-sm" dir="ltr">192.168.1.105</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                      <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 rounded-lg"><Globe /></div>
                      <div>
                        <p className="text-xs text-gray-500 font-tajawal">{language === 'ar' ? 'الـ IP الخارجي (WAN)' : 'External IP'}</p>
                        <p className="font-bold text-gray-900 dark:text-white text-sm" dir="ltr">82.114.16.99</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                      <div className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-lg"><MapPin /></div>
                      <div>
                        <p className="text-xs text-gray-500 font-tajawal">{language === 'ar' ? 'الموقع التقريبي' : 'Location'}</p>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">Riyadh, SA (STC)</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                      <div className="p-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg"><Info /></div>
                      <div>
                        <p className="text-xs text-gray-500 font-tajawal">{language === 'ar' ? 'العنوان الفيزيائي (MAC)' : 'MAC Address'}</p>
                        <p className="font-bold text-gray-900 dark:text-white text-sm" dir="ltr">00:1B:44:11:3A:B7</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* REMOTE CONTROL TAB */}
              <div className={`m-0 h-[60vh] flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 ${activeTab === 'remote' ? 'block' : 'hidden'}`}>
                <iframe 
                  src={`https://153.92.222.17/?p=1&node=${device.id}&view=1&hide=31&user=feras1960@gmail.com&pass=bF8ayJJuFw`}
                  className="w-full h-full border-0"
                  allowFullScreen
                  title="Remote Desktop"
                />
              </div>

              {/* FILES TAB */}
              <div className={`m-0 h-[60vh] flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 ${activeTab === 'files' ? 'block' : 'hidden'}`}>
                <iframe 
                  src={`https://153.92.222.17/?p=1&node=${device.id}&view=3&hide=31&user=feras1960@gmail.com&pass=bF8ayJJuFw`}
                  className="w-full h-full border-0"
                  title="File Explorer"
                />
              </div>

              {/* TERMINAL TAB */}
              <div className={`m-0 h-[60vh] flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 ${activeTab === 'terminal' ? 'block' : 'hidden'}`}>
                <iframe 
                  src={`https://153.92.222.17/?p=1&node=${device.id}&view=2&hide=31&user=feras1960@gmail.com&pass=bF8ayJJuFw`}
                  className="w-full h-full border-0"
                  title="Terminal Session"
                />
              </div>

              {/* CHAT TAB */}
              <div className={`m-0 h-[60vh] flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
                {/* MeshCentral doesn't expose a direct View= for Messenger without the agent connected. Showing dynamic UI */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <MessageSquare className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 font-cairo mb-2">
                    {language === 'ar' ? 'نظام المحادثة والمكالمات (WebRTC)' : 'Messenger & WebRTC Calls'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 font-tajawal max-w-md">
                    {language === 'ar' 
                      ? 'سيتم تفعيل نافذة المحادثة المباشرة والمكالمات الصوتية/المرئية فور اتصال جهاز العميل عبر الوكيل (Agent).' 
                      : 'The live chat and Audio/Video call interface will activate as soon as the client device connects via the Agent.'}
                  </p>
                </div>
              </div>

              {/* RECORDINGS TAB */}
              <TabsContent value="recordings" className="m-0 h-full flex flex-col">
                <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col items-center justify-center text-center">
                  <Activity className="w-16 h-16 text-erp-teal mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 font-cairo mb-2">
                    {language === 'ar' ? 'أرشيف الجلسات المسجلة' : 'Recorded Sessions Archive'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 font-tajawal max-w-lg mb-6">
                    {language === 'ar' 
                      ? 'يقوم السيرفر بتسجيل جلسات التحكم وسطر الأوامر أوتوماتيكياً ويحتفظ بها لمدة يومين لتوفير المساحة. ستظهر الفيديوهات هنا بمجرد توفرها.' 
                      : 'The server automatically records remote and terminal sessions, retaining them for 2 days to optimize space. Videos will appear here once available.'}
                  </p>
                  <Button variant="outline" className="gap-2 font-tajawal border-erp-teal text-erp-teal hover:bg-erp-teal/10">
                    {language === 'ar' ? 'تحديث قائمة التسجيلات' : 'Refresh Recordings'}
                  </Button>
                </div>
              </TabsContent>

              {/* ANALYTICS TAB */}
              <TabsContent value="analytics" className="m-0 h-full flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                  
                  {/* Smart Audio Architecture Placeholder */}
                  <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                    <LineChart className="w-12 h-12 text-indigo-500 mb-4" />
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white font-cairo mb-2">
                      {language === 'ar' ? 'التحليل الصوتي الذكي (AI)' : 'Smart AI Audio Analysis'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-tajawal mb-4">
                      {language === 'ar'
                        ? 'هذا القسم سيستقبل التسجيلات الصوتية المجزأة والمشفرة (AES-256) من العميل لتحليلها بواسطة الذكاء الاصطناعي واستخراج الأجزاء الهامة.'
                        : 'This section will receive AES-256 encrypted audio chunks from the client for AI analysis and extracting important segments.'}
                    </p>
                    <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                      {language === 'ar' ? 'قيد التطوير للمرحلة الثانية' : 'In Development (Phase 2)'}
                    </Badge>
                  </div>

                  {/* Flagged Recordings */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white font-cairo">
                        {language === 'ar' ? 'التسجيلات المحفوظة (عالية الأهمية)' : 'Flagged Recordings (Important)'}
                      </h3>
                      <Badge className="bg-red-500 hover:bg-red-600">0</Badge>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <p className="text-sm text-gray-500 font-tajawal">
                        {language === 'ar'
                          ? 'لم يتم تمييز أي تسجيلات كعالية الأهمية حتى الآن. لن يتم حذف هذه التسجيلات مطلقاً.'
                          : 'No recordings flagged as highly important yet. These recordings are kept permanently.'}
                      </p>
                    </div>
                  </div>

                </div>
              </TabsContent>

            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
