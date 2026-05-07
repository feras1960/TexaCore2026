import { useMemo, useState } from 'react';
import { SectionCard } from './shared/SectionCard';
import { SkeletonBlock } from './shared/SkeletonBlock';
import { CashFlowPoint } from '../_lib/dashboard-types';
import { EmptyState } from './shared/EmptyState';
import { TrendingUp, HelpCircle, X } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/app/providers/LanguageProvider';

function CashFlowInfoTooltip() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:bg-stone-800 dark:hover:text-stone-300"
        aria-label="معلومات عن التدفق النقدي"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop للإغلاق عند النقر خارج النافذة */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="absolute start-0 top-full z-50 mt-2 w-[340px] rounded-xl border border-stone-200 bg-white p-4 shadow-lg dark:border-stone-700 dark:bg-stone-900"
              dir="rtl"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">
                  📊 ما هو مخطط التدفق النقدي؟
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="mb-3 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                يعرض هذا المخطط حركة الأموال الداخلة والخارجة من 
                <strong className="text-stone-800 dark:text-stone-200"> حسابات الصندوق والبنوك </strong>
                خلال آخر 30 يومًا، ليعطيك صورة واضحة عن سيولة الشركة.
              </p>

              <div className="space-y-2.5 rounded-lg bg-stone-50 p-3 dark:bg-stone-800/50">
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-sm bg-emerald-500" />
                  <div>
                    <p className="text-xs font-medium text-stone-800 dark:text-stone-200">الخط الأخضر — إيرادات (أموال داخلة)</p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      المبالغ التي دخلت الصندوق/البنك: تحصيلات عملاء، مبيعات نقدية، إيداعات.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-sm bg-orange-500" />
                  <div>
                    <p className="text-xs font-medium text-stone-800 dark:text-stone-200">الخط البرتقالي — مصروفات (أموال خارجة)</p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      المبالغ التي خرجت من الصندوق/البنك: دفعات موردين، مصاريف تشغيل، سحوبات.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-sm bg-stone-400" />
                  <div>
                    <p className="text-xs font-medium text-stone-800 dark:text-stone-200">الصافي = الإيرادات − المصروفات</p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      رقم موجب يعني السيولة تزداد. رقم سالب يعني مصروفات أكثر من الإيرادات.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-teal-100 bg-teal-50/50 p-2.5 dark:border-teal-900/30 dark:bg-teal-950/20">
                <p className="text-[11px] leading-relaxed text-teal-800 dark:text-teal-300">
                  <strong>مصدر البيانات:</strong> القيود المحاسبية المرحّلة (posted) على حسابات الصندوق 
                  (111x) والبنوك (112x). الأرصدة الافتتاحية والذمم والمخزون لا تظهر هنا.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CashFlowChart({ data, loading }: { data?: CashFlowPoint[]; loading: boolean }) {
  const { t, direction } = useLanguage();
  const option = useMemo(() => {
    if (!data) return {};
    return {
      grid: { top: 20, right: 20, bottom: 30, left: 50, containLabel: false },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(28,25,23,0.95)',
        borderWidth: 0,
        textStyle: { color: '#fafaf9', fontFamily: 'Tajawal, sans-serif', fontSize: 12 },
        axisPointer: { type: 'line', lineStyle: { color: '#d6d3d1' } },
      },
      legend: { show: false },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.date.slice(5)),
        axisLine: { lineStyle: { color: '#e7e5e4' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#78716c',
          fontSize: 10,
          fontFamily: 'Tajawal, sans-serif',
          interval: Math.floor(data.length / 6),
        },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f5f5f4', type: 'dashed' } },
        axisLabel: {
          color: '#78716c',
          fontSize: 10,
          formatter: (v: number) => `$${v / 1000}k`,
        },
      },
      series: [
        {
          name: t('dashboard.income'),
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          showSymbol: false,
          lineStyle: { width: 2, color: '#10B981' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16,185,129,0.18)' },
                { offset: 1, color: 'rgba(16,185,129,0.02)' },
              ],
            },
          },
          data: data.map((d) => Math.round(d.income)),
        },
        {
          name: t('dashboard.expenses'),
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          showSymbol: false,
          lineStyle: { width: 2, color: '#F97316', type: 'dashed' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(249,115,22,0.10)' },
                { offset: 1, color: 'rgba(249,115,22,0.01)' },
              ],
            },
          },
          data: data.map((d) => Math.round(d.expense)),
        },
      ],
    };
  }, [data]);

  const net = data
    ? data.reduce((a, b) => a + b.income - b.expense, 0)
    : 0;

  return (
    <SectionCard
      title={t('dashboard.cashFlow')}
      action={
        <span className="flex items-center gap-3 text-xs">
          <CashFlowInfoTooltip />
          <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400">
            <span className="h-2 w-2 rounded-sm bg-emerald-500" aria-hidden="true" />
            {t('dashboard.income')}
          </span>
          <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400">
            <span className="h-2 w-2 rounded-sm bg-orange-500" aria-hidden="true" />
            {t('dashboard.expenses')}
          </span>
          <span className="font-medium text-stone-900 dark:text-stone-100">
            ${net.toLocaleString()}
          </span>
        </span>
      }
      className="col-span-2"
    >
      <div
        role="img"
        aria-label={`مخطط التدفق النقدي لآخر 30 يوماً. صافي ${net} دولار`}
        className="h-[220px] w-full"
      >
        {loading ? (
          <SkeletonBlock className="h-full w-full" />
        ) : data && data.length > 0 ? (
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        ) : (
          <EmptyState
            icon={TrendingUp}
            title={t('dashboard.noCashFlow')}
            description={t('dashboard.noCashFlowDesc')}
          />
        )}
      </div>
    </SectionCard>
  );
}
