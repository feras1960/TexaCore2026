import React, { useEffect, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useTheme } from '@/app/providers/ThemeProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DevLabNav } from '@/features/componentLab/DevLabNav';
import { SafeChartContainer } from '@/components/ui/SafeChartContainer';

// 1. Recharts
import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

// 2. ECharts
import ReactECharts from 'echarts-for-react';

// 3. Lightweight Charts (TradingView)
import { createChart, ColorType, CrosshairMode, CandlestickSeries, AreaSeries } from 'lightweight-charts';

// --- البيانات المشتركة ---
const monthlyData = [
  { name: 'Jan', value: 4000, secondary: 2400 },
  { name: 'Feb', value: 3000, secondary: 1398 },
  { name: 'Mar', value: 2000, secondary: 9800 },
  { name: 'Apr', value: 2780, secondary: 3908 },
  { name: 'May', value: 1890, secondary: 4800 },
  { name: 'Jun', value: 2390, secondary: 3800 },
  { name: 'Jul', value: 3490, secondary: 4300 },
];

const pieData = [
  { name: 'منتجات قطنية', value: 400 },
  { name: 'بوليستر', value: 300 },
  { name: 'حراير', value: 300 },
  { name: 'كتان', value: 200 },
];

// ألوان للفطيرة
const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

const financialData = [
  { time: '2026-03-01', open: 120.5, high: 122.3, low: 119.8, close: 121.2 },
  { time: '2026-03-02', open: 121.5, high: 124.6, low: 120.1, close: 123.8 },
  { time: '2026-03-03', open: 123.2, high: 125.1, low: 121.0, close: 121.9 },
  { time: '2026-03-04', open: 122.0, high: 126.8, low: 121.5, close: 126.3 },
  { time: '2026-03-05', open: 125.8, high: 128.5, low: 125.2, close: 127.1 },
  { time: '2026-03-06', open: 127.5, high: 130.0, low: 126.8, close: 129.5 },
  { time: '2026-03-07', open: 129.8, high: 132.4, low: 128.5, close: 131.2 },
  { time: '2026-03-08', open: 131.0, high: 133.0, low: 129.5, close: 130.0 },
  { time: '2026-03-09', open: 130.0, high: 135.0, low: 128.0, close: 134.5 },
];

const volumeData = financialData.map((d, i) => ({
  time: d.time,
  value: (d.high - d.low) * 100 * (i % 2 === 0 ? 1 : 0.5),
}));

export default function ChartsLabPage() {
  const { t, direction } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isRTL = direction === 'rtl';

  const lwCandleRef = useRef<HTMLDivElement>(null);
  const lwAreaRef = useRef<HTMLDivElement>(null);

  // المتغيرات السيمية (Theme variables)
  const textColor = isDark ? '#9ca3af' : '#4b5563';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const tooltipBg = isDark ? '#1f2937' : '#ffffff';
  const tooltipText = isDark ? '#ffffff' : '#111827';
  
  // ==========================================
  // 3. Lightweight Charts Initialization
  // ==========================================
  useEffect(() => {
    if (!lwCandleRef.current || !lwAreaRef.current) return;

    // --- Candlestick Chart ---
    lwCandleRef.current.innerHTML = '';
    const candleChart = createChart(lwCandleRef.current, {
      width: lwCandleRef.current.clientWidth,
      height: 250,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: textColor,
      },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: gridColor },
      timeScale: { borderColor: gridColor },
    });

    const candlestickSeries = candleChart.addSeries(CandlestickSeries, {
      upColor: '#10b981', downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981', wickDownColor: '#ef4444',
    });
    candlestickSeries.setData(financialData);

    // --- Area Chart (Financial Summary) ---
    lwAreaRef.current.innerHTML = '';
    const areaChart = createChart(lwAreaRef.current, {
      width: lwAreaRef.current.clientWidth,
      height: 250,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: textColor,
      },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      rightPriceScale: { borderColor: gridColor },
      timeScale: { borderColor: gridColor },
    });

    const lwAreaSeries = areaChart.addSeries(AreaSeries, {
      lineColor: '#3b82f6', topColor: 'rgba(59, 130, 246, 0.4)', bottomColor: 'rgba(59, 130, 246, 0)',
      lineWidth: 2,
    });
    lwAreaSeries.setData(financialData.map(d => ({ time: d.time, value: d.close })));

    const handleResize = () => {
      if (lwCandleRef.current) candleChart.applyOptions({ width: lwCandleRef.current.clientWidth });
      if (lwAreaRef.current) areaChart.applyOptions({ width: lwAreaRef.current.clientWidth });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      candleChart.remove();
      areaChart.remove();
    };
  }, [isDark, textColor, gridColor]);

  // ==========================================
  // 2. ECharts Options
  // ==========================================
  const echartsSmoothLine = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: textColor }, right: isRTL ? 'auto' : 10, left: isRTL ? 10 : 'auto' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: monthlyData.map(d => d.name), axisLabel: { color: textColor } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: gridColor } }, axisLabel: { color: textColor } },
    series: [
      {
        name: 'الإيرادات', type: 'line', smooth: true,
        lineStyle: { width: 3, color: '#10b981' }, showSymbol: false,
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(16, 185, 129, 0.4)' }, { offset: 1, color: 'rgba(16, 185, 129, 0)' }]
          }
        },
        data: monthlyData.map(d => d.value)
      },
      {
        name: 'المصروفات', type: 'line', smooth: true,
        lineStyle: { width: 3, color: '#8b5cf6' }, showSymbol: false,
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(139, 92, 246, 0.4)' }, { offset: 1, color: 'rgba(139, 92, 246, 0)' }]
          }
        },
        data: monthlyData.map(d => d.secondary)
      }
    ]
  };

  const echartsBar = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: monthlyData.map(d => d.name), axisLabel: { color: textColor } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: gridColor } }, axisLabel: { color: textColor } },
    series: [
      {
        name: 'المبيعات', type: 'bar', barWidth: '30%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#1d4ed8' }]
          }
        },
        data: monthlyData.map(d => d.value)
      }
    ]
  };

  const echartsDonut = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: { top: '5%', left: 'center', textStyle: { color: textColor } },
    series: [
      {
        name: 'الأقسام', type: 'pie', radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: isDark ? '#0f111a' : '#ffffff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: '20', fontWeight: 'bold' } },
        labelLine: { show: false },
        data: pieData.map((d, i) => ({ value: d.value, name: d.name, itemStyle: { color: PIE_COLORS[i] } }))
      }
    ]
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#0f111a] text-gray-900 dark:text-gray-100 overflow-hidden" dir={direction}>
      {/* 🧭 Dev Lab Header */}
      <div className="flex-none bg-white dark:bg-[#151925] border-b border-gray-200 dark:border-white/10 shadow-sm z-10">
        <DevLabNav currentLabId="charts" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent inline-block">
              المرجع الشامل للرسوم البيانية
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-3">
              استعراض ومقارنة شاملة لجميع أنواع الرسوم البيانية المدعومة في TexaCore. 
              الأنماط متوافقة مع <span className="font-semibold text-gray-700 dark:text-gray-200">{isDark ? 'الوضع الليلي (Dark Mode) 🌙' : 'الوضع النهاري (Light Mode) ☀️'}</span>
            </p>
          </div>

          {/* ========================================================= */}
          {/* SECTION 1: ECharts (The Best All-Rounder) */}
          {/* ========================================================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2">
              <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-lg">📈</span>
              <h2 className="text-xl font-bold flex-1">1. Apache ECharts <span className="text-sm font-normal text-gray-500">(بطل اللوحات الجمالية)</span></h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* ECharts: Smooth Area */}
              <Card className="bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/5 shadow-md dark:shadow-xl lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">تدفق الإيرادات والمصروفات (Smooth Area)</CardTitle>
                  <CardDescription>المنحنيات السلسة والتدرجات اللونية الساحرة.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ReactECharts option={echartsSmoothLine} style={{ height: '300px' }} opts={{ renderer: 'canvas' }} />
                </CardContent>
              </Card>

              {/* ECharts: Donut */}
              <Card className="bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/5 shadow-md dark:shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">توزيع المنتجات (Donut Chart)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts option={echartsDonut} style={{ height: '300px' }} opts={{ renderer: 'canvas' }} />
                </CardContent>
              </Card>

              {/* ECharts: Bar */}
              <Card className="bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/5 shadow-md dark:shadow-xl lg:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">المبيعات الشهرية (Gradient Bar)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts option={echartsBar} style={{ height: '250px' }} opts={{ renderer: 'canvas' }} />
                </CardContent>
              </Card>

            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION 2: TradingView Lightweight Charts */}
          {/* ========================================================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2">
              <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 p-1.5 rounded-lg">🕯️</span>
              <h2 className="text-xl font-bold flex-1">2. Lightweight Charts <span className="text-sm font-normal text-gray-500">(أسعار الصرف والتداول الاحترافي)</span></h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Lightweight: Candlestick */}
              <Card className="bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/5 shadow-md dark:shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-amber-600 dark:text-amber-400">الشموع اليابانية (Candlestick)</CardTitle>
                  <CardDescription>محرك TradingView المذهل لأسعار الصرف.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div ref={lwCandleRef} className="h-[250px] w-full" />
                </CardContent>
              </Card>

              {/* Lightweight: Area */}
              <Card className="bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/5 shadow-md dark:shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-amber-600 dark:text-amber-400">مؤشر الإغلاق (Financial Area)</CardTitle>
                  <CardDescription>تمثيل مبسط للمساحات بأسلوب البورصة.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div ref={lwAreaRef} className="h-[250px] w-full" />
                </CardContent>
              </Card>

            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION 3: Recharts (Current Standard) */}
          {/* ========================================================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2">
              <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 p-1.5 rounded-lg">📊</span>
              <h2 className="text-xl font-bold flex-1">3. Recharts <span className="text-sm font-normal text-gray-500">(المستخدمة والمألوفة حالياً)</span></h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Recharts: Area */}
              <Card className="bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/5 shadow-md dark:shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-blue-600 dark:text-blue-400">Area Chart</CardTitle>
                </CardHeader>
                <CardContent>
                  <SafeChartContainer className="h-[250px] w-full mt-4 text-xs" fallbackHeight="250px">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsAreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="colorRechart" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                        <XAxis dataKey="name" stroke={textColor} tickLine={false} axisLine={false} />
                        <YAxis stroke={textColor} tickLine={false} axisLine={false} />
                        <RechartsTooltip contentStyle={{ backgroundColor: tooltipBg, color: tooltipText, border: `1px solid ${gridColor}`, borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRechart)" />
                      </RechartsAreaChart>
                    </ResponsiveContainer>
                  </SafeChartContainer>
                </CardContent>
              </Card>

              {/* Recharts: Bar */}
              <Card className="bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/5 shadow-md dark:shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-blue-600 dark:text-blue-400">Simple Bar Chart</CardTitle>
                </CardHeader>
                <CardContent>
                  <SafeChartContainer className="h-[250px] w-full mt-4 text-xs" fallbackHeight="250px">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                        <XAxis dataKey="name" stroke={textColor} tickLine={false} axisLine={false} />
                        <YAxis stroke={textColor} tickLine={false} axisLine={false} />
                        <RechartsTooltip cursor={{fill: gridColor}} contentStyle={{ backgroundColor: tooltipBg, color: tooltipText, border: `1px solid ${gridColor}`, borderRadius: '8px' }} />
                        <Bar dataKey="secondary" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </SafeChartContainer>
                </CardContent>
              </Card>

            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION 4: Tremor-like DIY KPI Cards (Tailwind) */}
          {/* ========================================================= */}
          <section className="space-y-4 pb-12">
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2">
              <span className="bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 p-1.5 rounded-lg">✨</span>
              <h2 className="text-xl font-bold flex-1">4. Tremor-like KPI Cards <span className="text-sm font-normal text-gray-500">(بناء محلي بـ Tailwind)</span></h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Type 1: Progress Tracker */}
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">الهدف الشهري</p>
                <div className="flex items-end justify-between mt-2">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">$34,500</p>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-1 rounded">12.5% ↗</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '70%' }} />
                  </div>
                  <span className="text-xs text-gray-500">70%</span>
                </div>
              </div>

              {/* Type 2: Multi-Color Tracker */}
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">توزيع المصروفات</p>
                <div className="flex items-end justify-between mt-2">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">4,200</p>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden flex">
                    <div className="h-full bg-rose-500 transition-all" style={{ width: '30%' }} />
                    <div className="h-full bg-amber-500 transition-all" style={{ width: '20%' }} />
                    <div className="h-full bg-blue-500 transition-all" style={{ width: '50%' }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>تشغيلية (30%)</span>
                    <span>رواتب (50%)</span>
                  </div>
                </div>
              </div>

              {/* Type 3: Simple Metric */}
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">العملاء النشيطين</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-gray-900 dark:text-white">142</p>
                  <p className="text-sm text-gray-500">من أصل 200</p>
                </div>
                <p className="text-xs text-gray-500 mt-4 bg-gray-50 dark:bg-white/5 p-2 rounded truncate">
                  آخر ظهور: محمد محمود قبل ساعتين
                </p>
              </div>

              {/* Type 4: Delta Metric */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/20 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-emerald-800 dark:text-emerald-400 font-medium">صافي الأرباح</p>
                <div className="mt-2">
                  <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-300">$18,290</p>
                </div>
                <div className="mt-4">
                  {/* Decorative mini sparkline using Recharts */}
                  <SafeChartContainer className="h-10 w-full opacity-60" fallbackHeight="40px">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsAreaChart data={monthlyData.slice(-4)}>
                        <Area type="monotone" dataKey="value" stroke={isDark ? '#10b981' : '#047857'} strokeWidth={2} fillOpacity={0.2} fill={isDark ? '#10b981' : '#047857'} />
                      </RechartsAreaChart>
                    </ResponsiveContainer>
                  </SafeChartContainer>
                </div>
              </div>

            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
