/**
 * Design System Demo - صفحة عرض نظام التصميم
 * =============================================
 * صفحة تفاعلية لاختبار وعرض جميع مكونات Design System
 * بنمط Swiss Minimalism
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Design System imports
import {
  gradients,
  cardStyles,
  statusColors,
  sectorColors,
} from '@/lib/design-system';

// Animation imports
import {
  fadeIn,
  slideUp,
  staggerContainer,
  staggerItem,
  pageTransition,
} from '@/lib/animations';

// Icon imports
import {
  DollarSign,
  Users,
  ShoppingCart,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  Loader2,
  Mail,
  Star,
  Zap,
  Sparkles,
  Package,
  Truck,
  CreditCard,
  Wallet,
  Layers,
} from '@/lib/icons';

// Simple Mock Components for missing UI Pro Components
const AnimatedCard = ({ children, className }: any) => <div className={className}>{children}</div>;
const GlassCard = ({ children, className }: any) => <div className={className}>{children}</div>;
const AnimatedButton = ({ children, className, onClick, disabled }: any) => <button className={className} onClick={onClick} disabled={disabled}>{children}</button>;
const AnimatedList = ({ children, className }: any) => <ul className={className}>{children}</ul>;
const AnimatedListItem = ({ children }: any) => <li>{children}</li>;
const StatsCard = ({ title, value, change, icon: Icon }: any) => (
  <div className="p-4 border rounded-lg bg-white dark:bg-gray-800">
    <div className="flex items-center gap-2 mb-2"><Icon className="w-4 h-4 text-emerald-500" /> <span className="font-semibold">{title}</span></div>
    <div className="text-2xl font-bold">{value}</div><div className="text-sm text-gray-400">{change}</div>
  </div>
);

// Hooks
import { useLanguage } from '@/hooks';

// UI Components
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export default function DesignSystemDemo() {
  const { language, direction } = useLanguage();
  const [loadingBtn, setLoadingBtn] = useState(false);

  // Handle loading button demo
  const handleLoadingDemo = () => {
    setLoadingBtn(true);
    setTimeout(() => setLoadingBtn(false), 2000);
  };

  // Toast demos
  const showSuccessToast = () => {
    toast.success(
      language === 'ar' ? 'تمت العملية بنجاح!' : 'Operation completed successfully!',
      { description: language === 'ar' ? 'تم حفظ البيانات' : 'Data has been saved' }
    );
  };

  const showErrorToast = () => {
    toast.error(
      language === 'ar' ? 'حدث خطأ!' : 'An error occurred!',
      { description: language === 'ar' ? 'يرجى المحاولة مرة أخرى' : 'Please try again' }
    );
  };

  const showWarningToast = () => {
    toast.warning(
      language === 'ar' ? 'تحذير!' : 'Warning!',
      { description: language === 'ar' ? 'يرجى التحقق من البيانات' : 'Please verify the data' }
    );
  };

  const showLoadingToast = () => {
    const toastId = toast.loading(
      language === 'ar' ? 'جاري التحميل...' : 'Loading...'
    );
    setTimeout(() => {
      toast.success(
        language === 'ar' ? 'تم التحميل!' : 'Loaded!',
        { id: toastId }
      );
    }, 2000);
  };

  const showInfoToast = () => {
    toast.info(
      language === 'ar' ? 'معلومة' : 'Information',
      { description: language === 'ar' ? 'هذه معلومة مهمة' : 'This is important information' }
    );
  };

  // Section Header Component
  const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="mb-6">
      <h2 className="text-xl font-semibold font-cairo text-erp-navy dark:text-white flex items-center gap-2">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-muted-foreground font-tajawal mt-1">{subtitle}</p>
      )}
    </div>
  );

  return (
    <motion.div
      {...pageTransition}
      className="min-h-screen p-6 md:p-8 space-y-10 bg-gray-50/50 dark:bg-gray-950"
      dir={direction}
    >
      {/* Page Header */}
      <motion.div {...fadeIn} className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold font-cairo mb-3 text-erp-navy dark:text-white">
          {language === 'ar' ? 'نظام التصميم' : 'Design System'}
        </h1>
        <p className="text-base text-muted-foreground font-tajawal max-w-xl mx-auto">
          {language === 'ar'
            ? 'استعراض شامل لجميع مكونات واجهة المستخدم الاحترافية'
            : 'Comprehensive showcase of all professional UI components'}
        </p>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Section 1: Cards - قسم البطاقات */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
        <SectionHeader
          title={language === 'ar' ? 'البطاقات' : 'Cards'}
          subtitle={language === 'ar' ? 'أنواع مختلفة من البطاقات المتحركة' : 'Different types of animated cards'}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* AnimatedCard */}
          <AnimatedCard delay={0} className="bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-[#2d5a4c]/10 rounded-lg">
                <Package className="w-5 h-5 text-[#2d5a4c]" />
              </div>
              <h3 className="font-semibold font-cairo text-erp-navy dark:text-white">
                {language === 'ar' ? 'بطاقة متحركة' : 'Animated Card'}
              </h3>
            </div>
            <p className="text-muted-foreground font-tajawal text-sm leading-relaxed">
              {language === 'ar'
                ? 'بطاقة بتأثيرات حركية عند الظهور والتمرير'
                : 'Card with motion effects on appear and hover'}
            </p>
          </AnimatedCard>

          {/* GlassCard - Glassmorphism Effect */}
          <div className="relative rounded-xl overflow-hidden h-full min-h-[180px]">
            {/* Colorful background with shapes - Olive/Textile theme */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A2540] via-[#1e3d33] to-[#2d5a4c]">
              {/* Decorative circles */}
              <div className="absolute top-4 right-4 w-20 h-20 bg-[#4a8a74]/40 rounded-full blur-xl" />
              <div className="absolute bottom-4 left-4 w-16 h-16 bg-[#2d5a4c]/30 rounded-full blur-lg" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            </div>
            {/* Glass card */}
            <div className="relative p-4 h-full flex items-center justify-center">
              <GlassCard className="w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-white/20 rounded-lg">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold font-cairo text-white">
                    {language === 'ar' ? 'بطاقة زجاجية' : 'Glass Card'}
                  </h3>
                </div>
                <p className="text-white/80 font-tajawal text-sm leading-relaxed">
                  {language === 'ar'
                    ? 'تأثير الزجاج الضبابي (Glassmorphism)'
                    : 'Glassmorphism blur effect'}
                </p>
              </GlassCard>
            </div>
          </div>

          {/* Gradient Card */}
          <AnimatedCard delay={0.2} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-[#2d5a4c]/10 dark:bg-[#4a8a74]/15 rounded-lg">
                <Zap className="w-5 h-5 text-[#2d5a4c] dark:text-[#4a8a74]" />
              </div>
              <h3 className="font-semibold font-cairo text-erp-navy dark:text-white">
                {language === 'ar' ? 'بطاقة متدرجة' : 'Gradient Card'}
              </h3>
            </div>
            <p className="text-muted-foreground font-tajawal text-sm leading-relaxed">
              {language === 'ar'
                ? 'بطاقة بخلفية متدرجة الألوان'
                : 'Card with gradient background'}
            </p>
          </AnimatedCard>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Section 2: Buttons - قسم الأزرار */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
        <SectionHeader
          title={language === 'ar' ? 'الأزرار' : 'Buttons'}
          subtitle={language === 'ar' ? 'أنماط وأحجام مختلفة' : 'Different variants and sizes'}
        />

        <motion.div {...slideUp} className="space-y-6">
          {/* Button Variants */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 font-tajawal">
              {language === 'ar' ? 'الأنماط' : 'Variants'}
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <AnimatedButton variant="primary" className="!bg-[#2d5a4c] hover:!bg-[#1e3d33]">
                {language === 'ar' ? 'أساسي' : 'Primary'}
              </AnimatedButton>
              <AnimatedButton variant="secondary">
                {language === 'ar' ? 'ثانوي' : 'Secondary'}
              </AnimatedButton>
              <AnimatedButton variant="ghost">
                {language === 'ar' ? 'شفاف' : 'Ghost'}
              </AnimatedButton>
              <AnimatedButton variant="gradient" className="!bg-gradient-to-r !from-[#0A2540] !to-[#2d5a4c]">
                <Sparkles className="w-4 h-4" />
                {language === 'ar' ? 'متدرج' : 'Gradient'}
              </AnimatedButton>
            </div>
          </div>

          {/* Button Sizes */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 font-tajawal">
              {language === 'ar' ? 'الأحجام' : 'Sizes'}
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <AnimatedButton size="sm" variant="primary" className="!bg-erp-navy hover:!bg-erp-navy/90">
                {language === 'ar' ? 'صغير' : 'Small'}
              </AnimatedButton>
              <AnimatedButton size="md" variant="primary" className="!bg-erp-navy hover:!bg-erp-navy/90">
                {language === 'ar' ? 'متوسط' : 'Medium'}
              </AnimatedButton>
              <AnimatedButton size="lg" variant="primary" className="!bg-erp-navy hover:!bg-erp-navy/90">
                {language === 'ar' ? 'كبير' : 'Large'}
              </AnimatedButton>
            </div>
          </div>

          {/* Loading Button */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 font-tajawal">
              {language === 'ar' ? 'حالات خاصة' : 'Special States'}
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <AnimatedButton
                variant="gradient"
                loading={loadingBtn}
                onClick={handleLoadingDemo}
                className="!bg-gradient-to-r !from-[#0A2540] !to-[#2d5a4c]"
              >
                {language === 'ar' ? 'اختبار التحميل' : 'Test Loading'}
              </AnimatedButton>
              <AnimatedButton variant="primary" disabled className="!bg-gray-400">
                {language === 'ar' ? 'معطّل' : 'Disabled'}
              </AnimatedButton>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Section 3: Stats Cards - قسم الإحصائيات */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
        <SectionHeader
          title={language === 'ar' ? 'بطاقات الإحصائيات' : 'Stats Cards'}
          subtitle={language === 'ar' ? 'عرض الأرقام بشكل جذاب' : 'Display numbers attractively'}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title={language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}
            value="125,430"
            change="+12.5%"
            changeType="positive"
            icon={DollarSign}
            delay={0}
          />
          <StatsCard
            title={language === 'ar' ? 'الزبائن الجدد' : 'New Customers'}
            value="1,234"
            change="+8.2%"
            changeType="positive"
            icon={Users}
            delay={0.1}
          />
          <StatsCard
            title={language === 'ar' ? 'الطلبات' : 'Orders'}
            value="856"
            change="-3.1%"
            changeType="negative"
            icon={ShoppingCart}
            delay={0.2}
          />
          <StatsCard
            title={language === 'ar' ? 'معدل النمو' : 'Growth Rate'}
            value="23.5%"
            change={language === 'ar' ? 'مستقر' : 'Stable'}
            changeType="neutral"
            icon={TrendingUp}
            delay={0.3}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Section 4: Animated List - قسم القوائم */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
        <SectionHeader
          title={language === 'ar' ? 'القوائم المتحركة' : 'Animated Lists'}
          subtitle={language === 'ar' ? 'عناصر تظهر بشكل متسلسل' : 'Elements appear sequentially'}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* List 1 */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-semibold font-cairo mb-3 text-sm text-erp-navy dark:text-white">
              {language === 'ar' ? 'المهام الأخيرة' : 'Recent Tasks'}
            </h4>
            <AnimatedList className="space-y-1">
              {[
                { icon: CheckCircle, text: language === 'ar' ? 'مراجعة التقارير المالية' : 'Review financial reports', color: 'text-[#2d5a4c]' },
                { icon: Clock, text: language === 'ar' ? 'اجتماع مع فريق المبيعات' : 'Meeting with sales team', color: 'text-amber-500' },
                { icon: Mail, text: language === 'ar' ? 'الرد على رسائل الزبائن' : 'Reply to customer emails', color: 'text-sky-500' },
                { icon: Package, text: language === 'ar' ? 'تحديث المخزون' : 'Update inventory', color: 'text-slate-500' },
                { icon: Truck, text: language === 'ar' ? 'متابعة الشحنات' : 'Track shipments', color: 'text-erp-navy dark:text-gray-400' },
              ].map((item, index) => (
                <AnimatedListItem key={index}>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700/50 transition-colors">
                    <item.icon className={cn("w-4 h-4", item.color)} />
                    <span className="font-tajawal text-sm">{item.text}</span>
                  </div>
                </AnimatedListItem>
              ))}
            </AnimatedList>
          </div>

          {/* List 2 */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-semibold font-cairo mb-3 text-sm text-erp-navy dark:text-white">
              {language === 'ar' ? 'أحدث المعاملات' : 'Latest Transactions'}
            </h4>
            <AnimatedList className="space-y-1">
              {[
                { icon: CreditCard, text: language === 'ar' ? 'دفعة #12345' : 'Payment #12345', amount: '+2,500 SAR', color: 'text-[#2d5a4c]' },
                { icon: Wallet, text: language === 'ar' ? 'سحب #12346' : 'Withdrawal #12346', amount: '-1,200 SAR', color: 'text-red-500' },
                { icon: CreditCard, text: language === 'ar' ? 'دفعة #12347' : 'Payment #12347', amount: '+3,800 SAR', color: 'text-[#2d5a4c]' },
                { icon: CreditCard, text: language === 'ar' ? 'دفعة #12348' : 'Payment #12348', amount: '+950 SAR', color: 'text-[#2d5a4c]' },
                { icon: Wallet, text: language === 'ar' ? 'مصروفات #12349' : 'Expense #12349', amount: '-450 SAR', color: 'text-red-500' },
              ].map((item, index) => (
                <AnimatedListItem key={index}>
                  <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-gray-400" />
                      <span className="font-tajawal text-sm">{item.text}</span>
                    </div>
                    <span className={cn("font-mono text-sm font-medium", item.color)}>
                      {item.amount}
                    </span>
                  </div>
                </AnimatedListItem>
              ))}
            </AnimatedList>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Section 5: Status Badges - قسم الحالات */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
        <SectionHeader
          title={language === 'ar' ? 'شارات الحالات' : 'Status Badges'}
          subtitle={language === 'ar' ? 'ألوان مختلفة للحالات المختلفة' : 'Different colors for different statuses'}
        />

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-6"
        >
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {Object.entries({
              active: { label: language === 'ar' ? 'نشط' : 'Active', icon: CheckCircle },
              pending: { label: language === 'ar' ? 'معلق' : 'Pending', icon: Clock },
              success: { label: language === 'ar' ? 'ناجح' : 'Success', icon: CheckCircle },
              warning: { label: language === 'ar' ? 'تحذير' : 'Warning', icon: AlertTriangle },
              error: { label: language === 'ar' ? 'خطأ' : 'Error', icon: XCircle },
              info: { label: language === 'ar' ? 'معلومة' : 'Info', icon: Info },
              inactive: { label: language === 'ar' ? 'غير نشط' : 'Inactive', icon: XCircle },
              draft: { label: language === 'ar' ? 'مسودة' : 'Draft', icon: Clock },
              paid: { label: language === 'ar' ? 'مدفوع' : 'Paid', icon: CheckCircle },
              overdue: { label: language === 'ar' ? 'متأخر' : 'Overdue', icon: AlertTriangle },
              premium: { label: language === 'ar' ? 'مميز' : 'Premium', icon: Star },
              featured: { label: language === 'ar' ? 'مميز' : 'Featured', icon: Sparkles },
            }).map(([key, { label, icon: Icon }]) => (
              <motion.div key={key} variants={staggerItem}>
                <Badge className={cn(
                  statusColors[key as keyof typeof statusColors],
                  "px-2.5 py-1 text-xs font-tajawal flex items-center gap-1.5 rounded-md"
                )}>
                  <Icon className="w-3 h-3" />
                  {label}
                </Badge>
              </motion.div>
            ))}
          </div>

          {/* Sector Colors */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <h4 className="font-semibold font-cairo mb-3 text-sm text-erp-navy dark:text-white">
              {language === 'ar' ? 'ألوان القطاعات' : 'Sector Colors'}
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries({
                textile: language === 'ar' ? 'النسيج' : 'Textile',
                finance: language === 'ar' ? 'المالية' : 'Finance',
                medical: language === 'ar' ? 'الطبي' : 'Medical',
                fleet: language === 'ar' ? 'الأسطول' : 'Fleet',
                retail: language === 'ar' ? 'التجزئة' : 'Retail',
                manufacturing: language === 'ar' ? 'التصنيع' : 'Manufacturing',
              }).map(([key, label]) => (
                <motion.div key={key} variants={staggerItem}>
                  <Badge className={cn(
                    sectorColors[key as keyof typeof sectorColors].bg,
                    sectorColors[key as keyof typeof sectorColors].text,
                    sectorColors[key as keyof typeof sectorColors].border,
                    "px-2.5 py-1 text-xs font-tajawal border rounded-md"
                  )}>
                    {label}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Section 6: Notifications - قسم الإشعارات */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
        <SectionHeader
          title={language === 'ar' ? 'الإشعارات (Toast)' : 'Notifications (Toast)'}
          subtitle={language === 'ar' ? 'اختبر أنواع الإشعارات المختلفة' : 'Test different notification types'}
        />

        <motion.div {...slideUp} className="flex flex-wrap gap-3">
          <AnimatedButton
            variant="primary"
            size="sm"
            onClick={showSuccessToast}
            className="!bg-emerald-500 hover:!bg-emerald-600"
          >
            <CheckCircle className="w-4 h-4" />
            {language === 'ar' ? 'نجاح' : 'Success'}
          </AnimatedButton>

          <AnimatedButton
            variant="primary"
            size="sm"
            className="!bg-red-500 hover:!bg-red-600"
            onClick={showErrorToast}
          >
            <XCircle className="w-4 h-4" />
            {language === 'ar' ? 'خطأ' : 'Error'}
          </AnimatedButton>

          <AnimatedButton
            variant="primary"
            size="sm"
            className="!bg-amber-500 hover:!bg-amber-600"
            onClick={showWarningToast}
          >
            <AlertTriangle className="w-4 h-4" />
            {language === 'ar' ? 'تحذير' : 'Warning'}
          </AnimatedButton>

          <AnimatedButton
            variant="primary"
            size="sm"
            className="!bg-sky-500 hover:!bg-sky-600"
            onClick={showInfoToast}
          >
            <Info className="w-4 h-4" />
            {language === 'ar' ? 'معلومة' : 'Info'}
          </AnimatedButton>

          <AnimatedButton variant="secondary" size="sm" onClick={showLoadingToast}>
            <Loader2 className="w-4 h-4" />
            {language === 'ar' ? 'تحميل' : 'Loading'}
          </AnimatedButton>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Section 7: Gradients Preview - معاينة التدرجات */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
        <SectionHeader
          title={language === 'ar' ? 'التدرجات اللونية' : 'Color Gradients'}
          subtitle={language === 'ar' ? 'تدرجات جاهزة للاستخدام - نمط سويسري هادئ' : 'Ready-to-use gradients - Swiss minimalism style'}
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { name: language === 'ar' ? 'أساسي' : 'Primary', class: gradients.primary },
            { name: language === 'ar' ? 'ثانوي' : 'Secondary', class: gradients.secondary },
            { name: language === 'ar' ? 'مميز' : 'Accent', class: gradients.accent },
            { name: 'ERP', class: gradients.erp },
            { name: language === 'ar' ? 'هادئ' : 'Subtle', class: "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-300" },
          ].map((gradient, index) => (
            <motion.div
              key={gradient.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                gradient.class,
                "h-20 rounded-lg flex items-center justify-center text-white text-sm font-medium shadow-sm"
              )}
            >
              {gradient.name}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <motion.div
        {...fadeIn}
        className="text-center py-6 text-sm text-muted-foreground font-tajawal"
      >
        <p>
          {language === 'ar'
            ? 'تم إنشاء هذا النظام باستخدام React + Tailwind CSS + Framer Motion'
            : 'Built with React + Tailwind CSS + Framer Motion'}
        </p>
      </motion.div>
    </motion.div>
  );
}
