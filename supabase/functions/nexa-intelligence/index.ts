// ═══════════════════════════════════════════════════
// 🧠 NexaIntelligence — Smart Daily Reports Engine
// Uses Claude Opus for deep analysis + personalized reports
// + ElevenLabs TTS for voice reports with background music
// ═══════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// ═══ Voice Configuration ═══
const VOICE_CONFIG: Record<string, { voiceId: string; voiceName: string }> = {
  ar: { voiceId: 'rPNcQ53R703tTmtue1AT', voiceName: 'Mazen Lawand' },
  uk: { voiceId: '9Sj8ugvpK1DmcAXyvi3a', voiceName: 'Alex Nekrasov' },
  ru: { voiceId: '9Sj8ugvpK1DmcAXyvi3a', voiceName: 'Alex Nekrasov' },
  en: { voiceId: 'EiNlNiXeDU1pqqOPrYMO', voiceName: 'John Doe' },
};

// ═══ Pre-uploaded BGM tracks in Supabase Storage (ai-reports/voice-reports/bgm/) ═══
const BGM_TRACKS = {
  morning: {
    intro: 'voice-reports/bgm/grand_project-nice-day_verse-3-loop-263108.mp3',       // ☀️ Nice Day loop (464KB - short & upbeat)
    outro: 'voice-reports/bgm/music_for_video-delete-this-track-195512.mp3',          // ☀️ Energetic outro
  },
  evening: {
    intro: 'voice-reports/bgm/clavier-music-mariage-dx27amour-beautiful-ambient-piano-219962.mp3', // 🌙 Ambient piano
    outro: 'voice-reports/bgm/white_records-neon-drift-phonk-house-background-music-for-video-full-version-496499.mp3', // 🌙 Chill outro
  },
};

// ═══════════════════════════════════════════════════════════
// 🌍 Textile Market Intelligence — Ukrainian/Eastern European Market
// Lead Time: 4 months from booking to retail availability
// ═══════════════════════════════════════════════════════════

function getMarketIntelligence(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  // ═══ Ukrainian Textile Season Calendar ═══
  // Season = when the fabric actually SELLS in Ukraine
  const seasons: Record<string, { months: number[]; peak: string; fabrics: string[]; colors: string[]; patterns: string[]; buyerSegment: string }> = {
    spring: {
      months: [3, 4, 5],
      peak: 'أبريل ومايو',
      fabrics: ['قطن خفيف', 'فسكوز', 'شيفون', 'لينن', 'تريكو خفيف', 'جيرسيه'],
      colors: ['أبيض', 'أزرق فاتح', 'وردي', 'أخضر نعناعي', 'بيج', 'ليلكي فاتح'],
      patterns: ['ورود صغيرة', 'مخطط رفيع', 'سادة', 'نقوش هندسية بسيطة'],
      buyerSegment: 'النساء 25-45 سنة، محلات الملابس النسائية، محلات العرائس',
    },
    summer: {
      months: [6, 7, 8],
      peak: 'يونيو ويوليو',
      fabrics: ['لينن', 'قطن 100%', 'شيفون', 'ميو ميو', 'باتيست', 'تريكو رياضي'],
      colors: ['أبيض', 'أصفر خردل', 'برتقالي مرجاني', 'أزرق ملكي', 'أحمر', 'فيروزي'],
      patterns: ['سادة', 'شريطي واسع', 'استوائي', 'زخارف صيفية'],
      buyerSegment: 'محلات الملابس الصيفية، المصنّعون المحليون، مصممو الأزياء',
    },
    autumn: {
      months: [9, 10, 11],
      peak: 'سبتمبر وأكتوبر',
      fabrics: ['تويد', 'صوف مخلوط', 'تريكو ثقيل', 'كوردروي', 'فلنيل', 'جلد صناعي'],
      colors: ['بني داكن', 'بيج كاراميل', 'أخضر زيتوني', 'أحمر خمري', 'رمادي', 'كاكي'],
      patterns: ['هاوندزتوث', 'مربعات كبيرة', 'مخطط سكوتش', 'سادة أرضي'],
      buyerSegment: 'محلات الأزياء الرسمية، المعاطف والجاكيتات، مصنعو البدلات',
    },
    winter: {
      months: [12, 1, 2],
      peak: 'ديسمبر ويناير',
      fabrics: ['صوف ثقيل', 'كشمير مخلوط', 'ألباكا', 'قطيفة', 'فراء صناعي', 'تريكو سميك'],
      colors: ['أسود', 'رمادي داكن', 'كحلي', 'بورغندي', 'أخضر غامق', 'ذهبي فاخر'],
      patterns: ['سادة فاخر', 'نقوش هندسية', 'تويد كلاسيك', 'مربعات ويلزية'],
      buyerSegment: 'محلات الملابس الشتوية الفاخرة، المعاطف والسترات، ملابس الأطفال الشتوية',
    },
  };

  // ═══ Calculate which season to BOOK NOW (4 months ahead) ═══
  const bookingMonthTarget = month + 4;
  const targetMonthNormalized = ((bookingMonthTarget - 1) % 12) + 1;

  let targetSeason = 'spring';
  for (const [season, data] of Object.entries(seasons)) {
    if (data.months.includes(targetMonthNormalized)) {
      targetSeason = season;
      break;
    }
  }

  const seasonNameAr: Record<string, string> = {
    spring: 'الربيع', summer: 'الصيف', autumn: 'الخريف', winter: 'الشتاء',
  };

  // ═══ Current season data ═══
  let currentSeason = 'spring';
  for (const [season, data] of Object.entries(seasons)) {
    if (data.months.includes(month)) {
      currentSeason = season;
      break;
    }
  }

  const current = seasons[currentSeason];
  const target = seasons[targetSeason];
  const targetYear = targetMonthNormalized < month ? year + 1 : year;

  return `
## 🌍 ذكاء السوق الأوكراني للأقمشة (بيانات ${year})

### ⏱️ قاعدة دورة الاستيراد (مهمة جداً):
الدورة الكاملة = 4 أشهر: حجز المصنع (1 شهر) → إنتاج (1.5 شهر) → شحن وجمارك (1.5 شهر) → بيع فعلي.
**الآن في شهر ${month}/${year}، يجب التخطيط لـ ${seasonNameAr[targetSeason]} ${targetYear} الذي يبيع بعد 4 أشهر.**

### 🛒 ما يجب حجزه الآن لموسم ${seasonNameAr[targetSeason]} ${targetYear}:
- **الأقمشة المطلوبة:** ${target.fabrics.join(' | ')}
- **الألوان الرائجة:** ${target.colors.join(' | ')}
- **الرسمات والأنماط:** ${target.patterns.join(' | ')}
- **الشريحة المستهدفة:** ${target.buyerSegment}
- **ذروة البيع:** ${target.peak}

### 📊 الموسم الحالي (${seasonNameAr[currentSeason]} ${year}) — ما يُعرض الآن:
- **الأقمشة الرائجة الآن:** ${current.fabrics.slice(0, 4).join(' | ')}
- **الألوان المطلوبة حالياً:** ${current.colors.slice(0, 4).join(' | ')}

### 🔥 اتجاهات السوق الأوكراني 2025-2026 (Quiet Luxury نمط مستمر):
- البساطة الفاخرة: التغليف الأحادي اللون والأقمشة ذات الملمس الواضح
- الاستدامة: القطن العضوي واللينن المخلوط يشهد طلباً متزايداً
- المحلي أولاً: المصنعون الأوكرانيون يبحثون عن بدائل للاستيراد التركي
- الوظيفية: أقمشة تصلح لأكثر من موسم (سادة محايدة) تُباع بشكل أسرع
- الرياضي-الأنيق (Athleisure): تريكو عالي الجودة مطلوب طوال العام

### ⚠️ تنبيهات السوق الأوكراني الخاص:
- السوق الأوكراني يميل للألوان المحافظة (أسود، رمادي، بيج، كحلي) أكثر من الألوان الجريئة
- المشترون الأوكرانيون يفضلون الجودة الثابتة على التجريب بأنماط جديدة كثيراً
- الشتاء الأوكراني قاسٍ (-15 إلى -20) → الطلب على الأقمشة الثقيلة حقيقي جداً
- بعد 2022: المصنعون الأوكرانيون يعوضون الاستيراد الروسي بالأقمشة الصينية والتركية — فرصة للتميز بجودة أعلى`;
}


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { report_type = 'morning', company_id, tenant_id, trigger = 'manual' } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    console.log(`[NexaIntelligence] 🧠 Starting ${report_type} report for company: ${company_id}`);

    // ═══ Step 1: Collect ALL company data ═══
    const companyData = await collectCompanyData(adminClient, company_id);
    console.log('[NexaIntelligence] 📊 Data collected:', Object.keys(companyData).length, 'sections');

    // ═══ Step 2: Get employees with roles ═══
    const employees = await getEmployeesWithRoles(adminClient, company_id);
    console.log('[NexaIntelligence] 👥 Employees:', employees.length);

    // ═══ Step 3: Get overdue tasks ═══
    const overdueTasks = await getOverdueTasks(adminClient, company_id);
    console.log('[NexaIntelligence] ⏰ Overdue tasks:', overdueTasks.length);

    // ═══ Step 4: Call Claude Opus for analysis ═══
    const analysisResult = await callClaudeOpus(anthropicKey, {
      reportType: report_type,
      companyData,
      employees,
      overdueTasks,
      companyId: company_id,
    });
    console.log('[NexaIntelligence] 🧠 Claude analysis complete, tokens:', analysisResult.tokensUsed);

    // ═══ Step 5: Save report + create tasks ═══
    const reportId = await saveReport(adminClient, {
      company_id,
      tenant_id,
      report_type,
      analysis: analysisResult.analysis,
      tokensUsed: analysisResult.tokensUsed,
    });

    // ═══ Step 6: Create tasks from AI recommendations ═══
    const tasksCreated = await createTasksFromAnalysis(adminClient, {
      company_id,
      tenant_id,
      reportId,
      tasks: analysisResult.analysis.tasks || [],
      employees,
    });
    console.log('[NexaIntelligence] ✅ Tasks created:', tasksCreated);

    // ═══ Step 7: Update KPIs ═══
    await updateEmployeeKPIs(adminClient, company_id, employees, companyData);

    // ═══ Step 8: Save summary for Gemini agent context ═══
    await saveGeminiContext(adminClient, company_id, analysisResult.analysis.manager_summary);

    // ═══ Step 9: Track usage ═══
    await trackUsage(adminClient, company_id, analysisResult.tokensUsed);

    // ═══ Step 10: Generate Voice Report (TTS) ═══
    const elevenlabsKey = Deno.env.get('ELEVENLABS_API_KEY');
    let voiceUrl: string | null = null;
    let voiceBuffer: ArrayBuffer | null = null;
    if (elevenlabsKey) {
      try {
        // Detect language from company settings or default to 'ar'
        const { data: companyRow } = await adminClient.from('companies')
          .select('settings').eq('id', company_id).single();
        const reportLang = companyRow?.settings?.ai_report_language || companyRow?.settings?.language || 'ar';
        const langKey = reportLang.substring(0, 2); // 'ar', 'uk', 'ru', 'en'

        const voiceResult = await generateVoiceReport(elevenlabsKey, {
          text: analysisResult.analysis.manager_summary || '',
          reportType: report_type,
          language: langKey,
        });

        if (voiceResult.audioBuffer) {
          voiceBuffer = voiceResult.audioBuffer;
          // Upload to Supabase Storage
          const fileName = `voice-reports/${company_id}/${new Date().toISOString().split('T')[0]}_${report_type}.mp3`;
          const { error: uploadErr } = await adminClient.storage
            .from('ai-reports')
            .upload(fileName, voiceResult.audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });

          if (!uploadErr) {
            const { data: urlData } = adminClient.storage.from('ai-reports').getPublicUrl(fileName);
            voiceUrl = urlData?.publicUrl || null;
            // Update report with voice URL
            if (reportId) {
              await adminClient.from('ai_daily_reports')
                .update({ voice_url: voiceUrl })
                .eq('id', reportId);
            }
            console.log(`[NexaIntelligence] 🎤 Voice report generated (${(voiceResult.audioBuffer.byteLength / 1024).toFixed(0)}KB)`);
          } else {
            console.error('[NexaIntelligence] Storage upload error:', uploadErr.message);
          }
        }
      } catch (ttsErr: any) {
        console.error('[NexaIntelligence] TTS error (non-fatal):', ttsErr.message);
      }
    } else {
      console.log('[NexaIntelligence] ⚠️ ELEVENLABS_API_KEY not set — skipping voice report');
    }

    // ═══ Step 11: Send Telegram notifications ═══
    const tgSent = await sendTelegramNotifications(adminClient, company_id, {
      reportType: report_type,
      analysis: analysisResult.analysis,
      employees,
      voiceBuffer,
    });
    console.log('[NexaIntelligence] 📱 Telegram sent to:', tgSent, 'users');

    return new Response(JSON.stringify({
      success: true,
      report_id: reportId,
      report_type,
      tasks_created: tasksCreated,
      employees_count: employees.length,
      tokens_used: analysisResult.tokensUsed,
      telegram_sent: tgSent,
      voice_url: voiceUrl,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[NexaIntelligence] ❌ Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

// ═══════════════════════════════════════════
// 📊 Data Collection
// ═══════════════════════════════════════════

async function collectCompanyData(client: any, companyId: string) {
  const data: any = {};

  // Company info
  const { data: company } = await client.from('companies').select('*').eq('id', companyId).single();
  data.company = { name: company?.name_ar || company?.name, currency: company?.default_currency || 'UAH' };

  // Sales summary
  const { data: sales } = await client.from('sales_transactions')
    .select('id, total_amount, stage, invoice_no, customer_id, customer_name, paid_amount, balance, currency, created_at, invoice_date')
    .eq('company_id', companyId).order('created_at', { ascending: false }).limit(200);
  
  if (sales?.length) {
    const confirmed = sales.filter((s: any) => ['confirmed','posted','paid','partial_paid'].includes(s.stage));
    const today = new Date().toISOString().split('T')[0];
    const todaySales = confirmed.filter((s: any) => (s.invoice_date || s.created_at)?.startsWith(today));
    
    data.sales = {
      total_confirmed: confirmed.length,
      total_revenue: confirmed.reduce((s: number, t: any) => s + (t.total_amount || 0), 0),
      total_paid: confirmed.reduce((s: number, t: any) => s + (t.paid_amount || 0), 0),
      total_outstanding: confirmed.reduce((s: number, t: any) => s + (t.balance || 0), 0),
      today_count: todaySales.length,
      today_revenue: todaySales.reduce((s: number, t: any) => s + (t.total_amount || 0), 0),
      drafts: sales.filter((s: any) => s.stage === 'draft').length,
      overdue_invoices: confirmed.filter((s: any) => {
        const age = (Date.now() - new Date(s.invoice_date || s.created_at).getTime()) / (1000*60*60*24);
        return s.balance > 0 && age > 30;
      }).map((s: any) => ({
        invoice: s.invoice_no, customer: s.customer_name, customer_id: s.customer_id,
        amount: s.total_amount, balance: s.balance, days: Math.floor((Date.now() - new Date(s.invoice_date || s.created_at).getTime()) / (1000*60*60*24)),
      })),
    };
    
    // Sales by customer
    const byCustomer: Record<string, any> = {};
    for (const s of confirmed) {
      const cid = s.customer_id || 'unknown';
      if (!byCustomer[cid]) byCustomer[cid] = { name: s.customer_name || '-', total: 0, balance: 0, count: 0 };
      byCustomer[cid].total += s.total_amount || 0;
      byCustomer[cid].balance += s.balance || 0;
      byCustomer[cid].count++;
    }
    data.sales.by_customer = Object.entries(byCustomer).map(([id, d]) => ({ id, ...(d as any) })).sort((a, b) => b.total - a.total);
  }

  // Materials + stock
  const { data: materials } = await client.from('fabric_materials')
    .select('id, code, name_ar, name_en, current_stock, min_stock, purchase_price, selling_price, avg_cost_per_unit, unit, category, status')
    .eq('company_id', companyId).limit(200);
  
  if (materials?.length) {
    data.materials = materials.map((m: any) => ({
      id: m.id, code: m.code, name: m.name_ar || m.name_en,
      stock: m.current_stock || 0, min_stock: m.min_stock || 0,
      buy_price: m.purchase_price || 0, sell_price: m.selling_price || 0,
      is_low: (m.current_stock || 0) <= (m.min_stock || 0) && (m.min_stock || 0) > 0,
    }));
    data.low_stock = materials.filter((m: any) => (m.current_stock || 0) <= (m.min_stock || 0) && (m.min_stock || 0) > 0)
      .map((m: any) => ({ name: m.name_ar || m.name_en, stock: m.current_stock, min: m.min_stock }));
  }

  // Purchases + containers (include name for voice report)
  const { data: containers } = await client.from('containers')
    .select('container_number, name_ar, name_en, name, status, total_cost, arrival_date, supplier_id')
    .eq('company_id', companyId).order('created_at', { ascending: false }).limit(10);
  data.containers = (containers || []).map((c: any) => ({
    name: c.name_ar || c.name_en || c.name || '',
    status: c.status || '',
    arrival_date: c.arrival_date || '',
    total_cost: c.total_cost || 0,
  }));

  // Accounting - unposted entries
  const { data: unposted } = await client.from('journal_entries')
    .select('id, entry_number, description_ar, total_debit, status')
    .eq('company_id', companyId).eq('is_posted', false).limit(20);
  data.unposted_entries = unposted || [];

  // Customers with balances
  const { data: customers } = await client.from('customers')
    .select('id, name_ar, name_en, balance, credit_limit, currency')
    .eq('company_id', companyId).limit(100);
  data.customers = customers?.map((c: any) => {
    // Normalize balance to USD for fair comparison across currencies
    const usdRates: Record<string, number> = { UAH: 0.024, USD: 1, EUR: 1.08, GBP: 1.27, SAR: 0.267, AED: 0.272, TRY: 0.029 };
    const currency = (c.currency || 'UAH').toUpperCase();
    const balanceUSD = (c.balance || 0) * (usdRates[currency] || 0.024);
    return { id: c.id, name: c.name_ar || c.name_en, balance: c.balance || 0, currency: currency, balance_usd: Math.round(balanceUSD) };
  }).sort((a: any, b: any) => b.balance_usd - a.balance_usd) || [];

  // Suppliers
  const { data: suppliers } = await client.from('suppliers')
    .select('id, name_ar, name_en, balance')
    .eq('company_id', companyId).limit(100);
  data.suppliers = suppliers?.map((s: any) => ({ id: s.id, name: s.name_ar || s.name_en, balance: s.balance || 0 })) || [];

  // ═══ Phase 4C: Enhanced data collection ═══

  // Stock transfers (pending, shipped, in-transit)
  const { data: transfers } = await client.from('stock_transfers')
    .select('id, transfer_number, transfer_date, from_warehouse_id, to_warehouse_id, status, total_rolls, total_meters, driver_name')
    .eq('company_id', companyId)
    .in('status', ['pending', 'confirmed', 'shipped', 'in_transit'])
    .order('created_at', { ascending: false }).limit(20);
  data.pending_transfers = transfers?.map((t: any) => ({
    number: t.transfer_number, date: t.transfer_date, status: t.status,
    rolls: t.total_rolls, meters: t.total_meters, driver: t.driver_name,
  })) || [];

  // Sales by salesperson (for role-specific reports)
  if (sales?.length) {
    const bySalesperson: Record<string, any> = {};
    for (const s of sales.filter((s: any) => s.salesperson_id)) {
      const spId = s.salesperson_id;
      if (!bySalesperson[spId]) bySalesperson[spId] = { name: s.salesperson_name || '-', total: 0, count: 0, balance: 0 };
      bySalesperson[spId].total += s.total_amount || 0;
      bySalesperson[spId].balance += s.balance || 0;
      bySalesperson[spId].count++;
    }
    data.sales_by_salesperson = Object.entries(bySalesperson).map(([id, d]) => ({ id, ...(d as any) }));
  }

  // Customers exceeding credit limit
  if (customers?.length) {
    data.credit_exceeded = customers
      .filter((c: any) => c.credit_limit > 0 && (c.balance || 0) > c.credit_limit)
      .map((c: any) => ({
        name: c.name_ar || c.name_en, balance: c.balance,
        limit: c.credit_limit, exceeded_by: (c.balance || 0) - c.credit_limit,
      }));
  }

  // Accounts with abnormal balances (debit accounts with credit balance or vice versa)
  const { data: accounts } = await client.from('chart_of_accounts')
    .select('account_code, name_ar, name_en, current_balance, account_category, is_detail')
    .eq('company_id', companyId).eq('is_detail', true).eq('is_active', true)
    .neq('current_balance', 0).limit(200);
  if (accounts?.length) {
    // Debit-normal categories: assets, expenses
    // Credit-normal categories: liabilities, equity, revenue
    const debitNormal = ['assets', 'expenses', 'asset', 'expense'];
    const creditNormal = ['liabilities', 'equity', 'revenue', 'liability', 'income'];
    data.abnormal_balances = accounts.filter((a: any) => {
      const cat = (a.account_category || '').toLowerCase();
      const bal = a.current_balance || 0;
      if (debitNormal.some(d => cat.includes(d)) && bal < 0) return true;
      if (creditNormal.some(c => cat.includes(c)) && bal > 0) return true;
      return false;
    }).map((a: any) => ({
      code: a.account_code, name: a.name_ar || a.name_en,
      balance: a.current_balance, category: a.account_category,
    }));
  }

  return data;
}

// ═══════════════════════════════════════════
// 👥 Employees with Roles
// ═══════════════════════════════════════════

async function getEmployeesWithRoles(client: any, companyId: string) {
  const { data: assignments } = await client.from('user_role_assignments')
    .select('user_id, role_id, roles(code, name_ar)')
    .eq('company_id', companyId).eq('is_active', true);

  if (!assignments?.length) return [];

  const userIds = [...new Set(assignments.map((a: any) => a.user_id))];
  const { data: profiles } = await client.from('user_profiles')
    .select('id, full_name, email').in('id', userIds);

  const profileMap: Record<string, any> = {};
  profiles?.forEach((p: any) => { profileMap[p.id] = p; });

  return assignments.map((a: any) => ({
    user_id: a.user_id,
    name: profileMap[a.user_id]?.full_name || 'Unknown',
    email: profileMap[a.user_id]?.email || '',
    role_code: a.roles?.code || 'user',
    role_name: a.roles?.name_ar || a.roles?.code || '',
  }));
}

// ═══════════════════════════════════════════
// ⏰ Overdue Tasks
// ═══════════════════════════════════════════

async function getOverdueTasks(client: any, companyId: string) {
  // First mark overdue
  await client.from('ai_tasks')
    .update({ status: 'overdue' })
    .eq('company_id', companyId)
    .in('status', ['pending', 'in_progress'])
    .lt('due_date', new Date().toISOString().split('T')[0]);

  const { data } = await client.from('ai_tasks')
    .select('id, title, description, assigned_to, priority, due_date, status, category')
    .eq('company_id', companyId).eq('status', 'overdue').limit(50);

  return data || [];
}

// ═══════════════════════════════════════════
// 🧠 Claude Opus Analysis
// ═══════════════════════════════════════════

// ═══ Currency code → Arabic full name mapping ═══
function currencyToArabic(code: string): string {
  const map: Record<string, string> = {
    'UAH': 'هريفنا أوكرانية', 'uah': 'هريفنا أوكرانية',
    'USD': 'دولار أمريكي',    'usd': 'دولار أمريكي',
    'EUR': 'يورو',            'eur': 'يورو',
    'GBP': 'جنيه إسترليني',  'gbp': 'جنيه إسترليني',
    'SAR': 'ريال سعودي',     'sar': 'ريال سعودي',
    'AED': 'درهم إماراتي',   'aed': 'درهم إماراتي',
    'TRY': 'ليرة تركية',     'try': 'ليرة تركية',
  };
  return map[code] || code;
}

async function callClaudeOpus(apiKey: string, context: any) {
  const { reportType, companyData, employees, overdueTasks, companyId } = context;
  
  const isMorning = reportType === 'morning';
  const today = new Date().toISOString().split('T')[0];
  
  const employeesList = employees.map((e: any) => `- ${e.name} (${e.role_code}/${e.role_name})`).join('\n');
  const overdueList = overdueTasks.length > 0 
    ? overdueTasks.map((t: any) => `- [${t.priority}] ${t.title} (مسند لـ: ${t.assigned_to || 'غير محدد'}, مستحق: ${t.due_date})`).join('\n')
    : 'لا توجد مهام متأخرة ✅';

  // ═══ Prepare container summary (count + name only, no long codes) ═══
  const containerSummary = (companyData.containers || []).map((c: any) => {
    const name = c.name || c.container_name || '';
    const status = c.status || '';
    return name ? `${name} (${status})` : `كونتينر ${status}`;
  }).join('، ') || 'لا يوجد';
  const containerCount = (companyData.containers || []).length;

  // ═══ Replace currency codes in data with Arabic names ═══
  const currency = currencyToArabic(companyData.company?.currency || 'UAH');

  // ═══ Build distinct prompt based on report type (morning vs evening) ═══
  const summaryInstruction = isMorning
    ? `تقرير صباحي صوتي موجز وعملي — المدة 45-60 ثانية. يتضمن فقط:
1) تحية صباحية قصيرة باسم الشركة. 
2) أهم رقمين: مجموع المبيعات وإجمالي المستحقَّات بالعملة كاملة بالعربية. 
3) أكبر عميل مديونيَّة بالقيمة الحقيقيَّة (استخدم حقل balance_usd للمقارنة بين العملات المختلفة، واذكر اسمه والمبلغ بعملته الأصليَّة). 
4) الكونتينرات: اذكر اسم كل كونتينر من حقل name وحالته — بدون أرقام طويلة أبداً. 
5) أولويات الفريق اليوم: جملة واحدة لكل دور. 
6) جملة تحفيزية ختامية تذكر TexaCore NexaIntelligence. لا تكرار ولا تفاصيل ماليَّة معقَّدة.`
    : `تقرير مسائي صوتي تفصيلي — المدة 75-90 ثانية. يتضمن:
1) تحية مسائية دافئة وتقييم اليوم. 
2) نتائج اليوم: مبيعات + تحصيلات + مستحقَّات جديدة بالأرقام الكاملة والعملة بالعربية. 
3) مقارنة بأمس: هل تحسَّن أم تراجع؟ 
4) أفضل موظف أداءً باسمه وإنجازه المحدَّد. 
5) أكبر 2-3 عملاء مديونيَّة بالقيمة الحقيقيَّة (استخدم balance_usd للمقارنة) واذكر المبلغ بعملته الأصليَّة. 
6) النواقص الحرجة في المخزون إن وُجدت. 
7) الكونتينرات: اسم كل كونتينر من حقل name وحالته بدون أرقام. 
8) اقتراح أولويات الغد. 
9) رسالة تقييم ختامية تذكر TexaCore NexaIntelligence.`;

  const prompt = `أنت وكيل NexaIntelligence المتخصص في تجارة الأقمشة — مبني في TexaCore ERP.

اليوم: ${today}
نوع التقرير: ${isMorning ? 'صباحي' : 'مسائي'}
عملة الشركة: ${currency}

## بيانات الشركة:
${JSON.stringify(companyData, null, 2).substring(0, 15000)}

## الكونتينرات (${containerCount}):
${containerSummary}

## الموظفون:
${employeesList}

## المهام المتأخرة:
${overdueList}

## ذكاء السوق والموضة:
${getMarketIntelligence()}

## المطلوب:
أنشئ تقريراً بـ JSON بالهيكل التالي:

{
  "manager_summary": "${summaryInstruction}",
  "highlights": ["إنجاز 1", "إنجاز 2"],
  "alerts": [{"severity": "high", "message": "تنبيه"}],
  "tasks": [{"title": "المهمة", "description": "التفاصيل", "assigned_to_role": "salesperson", "assigned_to_name": "الاسم", "priority": "high", "category": "collection", "due_date": "${today}", "ai_reasoning": "السبب", "related_entity_type": "customer", "related_entity_id": null}],
  "employee_reports": {"role_code": {"greeting": "تحية", "summary": "ملخص", "tasks": ["مهمة"], "tip": "نصيحة 💡", "motivation": "تحفيز 🎯"}},
  "kpi_insights": "مؤشرات الأداء",
  "forecast": "التوقعات"
}

## قواعد صارمة:
1. العملات: اكتب الاسم كاملاً بالعربية — ممنوع UAH أو USD أو EUR أبداً.
2. ترتيب المديونيَّات: استخدم حقل balance_usd للمقارنة الحقيقيَّة بين العملات، ثم اذكر المبلغ الأصلي بعملته في النص.
3. الكونتينرات: اذكر اسم كل كونتينر من حقل name وحالته — لا أرقام طويلة.
4. الشدَّة: في manager_summary ضع علامة الشدَّة على المُضعَّف لصحة النطق.
5. اذكر TexaCore NexaIntelligence في الخاتمة.
6. **ذكاء السوق**: استخدم قسم "ذكاء السوق والموضة" لتقديم توصية استراتيجية واحدة في التقرير:
   - في التقرير الصباحي: أضف تنبيهاً بسيطاً "يجب حجز [نوع القماش] الآن لموسم [الموسم] القادم"
   - في التقرير المسائي: أضف تحليلاً أعمق للفرص والاتجاهات التي تتوافق مع مخزونهم الحالي
7. **دورة الاستيراد**: تذكّر دائماً أن التاجر يحتاج 4 أشهر قبل موسم البيع لحجز البضاعة — لذا قدّم توصياتك باكراً.

أجب بـ JSON فقط.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[NexaIntelligence] Claude API error:', response.status, errText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const result = await response.json();
  const text = result.content?.[0]?.text || '{}';
  const tokensUsed = (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0);

  // Parse JSON from response
  let analysis: any = {};
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('[NexaIntelligence] JSON parse error, using raw text');
    analysis = { manager_summary: text, tasks: [], employee_reports: {} };
  }

  return { analysis, tokensUsed };
}

// ═══════════════════════════════════════════
// 💾 Save Report
// ═══════════════════════════════════════════

async function saveReport(client: any, opts: any) {
  const { company_id, tenant_id, report_type, analysis, tokensUsed } = opts;
  
  const { data, error } = await client.from('ai_daily_reports').upsert({
    company_id,
    tenant_id,
    report_type,
    report_date: new Date().toISOString().split('T')[0],
    full_analysis: analysis,
    employee_reports: analysis.employee_reports || {},
    manager_summary: analysis.manager_summary || '',
    model_used: 'claude-sonnet',
    tokens_used: tokensUsed,
    cost_usd: (tokensUsed / 1000) * 0.015, // Approximate cost
  }, { onConflict: 'company_id,report_type,report_date' }).select('id').single();

  if (error) console.error('[NexaIntelligence] Save report error:', error.message);
  return data?.id;
}

// ═══════════════════════════════════════════
// ✅ Create Tasks
// ═══════════════════════════════════════════

async function createTasksFromAnalysis(client: any, opts: any) {
  const { company_id, tenant_id, reportId, tasks, employees } = opts;
  if (!tasks?.length) return 0;

  const employeeMap: Record<string, string> = {};
  employees.forEach((e: any) => {
    if (!employeeMap[e.role_code]) employeeMap[e.role_code] = e.user_id;
    if (e.name) employeeMap[e.name.toLowerCase()] = e.user_id;
  });

  const taskRows = tasks.map((t: any) => ({
    company_id,
    tenant_id,
    title: t.title,
    description: t.description || '',
    priority: t.priority || 'medium',
    category: t.category || 'general',
    due_date: t.due_date || new Date().toISOString().split('T')[0],
    assigned_to: employeeMap[t.assigned_to_name?.toLowerCase()] || employeeMap[t.assigned_to_role] || null,
    ai_reasoning: t.ai_reasoning || '',
    related_entity_type: t.related_entity_type || null,
    related_entity_id: t.related_entity_id || null,
    report_id: reportId,
    created_by_ai: true,
  }));

  const { error } = await client.from('ai_tasks').insert(taskRows);
  if (error) console.error('[NexaIntelligence] Create tasks error:', error.message);
  return taskRows.length;
}

// ═══════════════════════════════════════════
// 📊 Update KPIs
// ═══════════════════════════════════════════

async function updateEmployeeKPIs(client: any, companyId: string, employees: any[], companyData: any) {
  const today = new Date().toISOString().split('T')[0];

  for (const emp of employees) {
    // Count tasks
    const { count: tasksTotal } = await client.from('ai_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('assigned_to', emp.user_id).gte('due_date', today);
    
    const { count: tasksCompleted } = await client.from('ai_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('assigned_to', emp.user_id).eq('status', 'completed');

    await client.from('employee_kpis').upsert({
      company_id: companyId,
      user_id: emp.user_id,
      kpi_date: today,
      tasks_total: tasksTotal || 0,
      tasks_completed: tasksCompleted || 0,
    }, { onConflict: 'company_id,user_id,kpi_date' });
  }
}

// ═══════════════════════════════════════════
// 🤖 Save Summary for Gemini Agent
// ═══════════════════════════════════════════

async function saveGeminiContext(_client: any, _companyId: string, summary: string) {
  // Summary is already saved in ai_daily_reports.manager_summary
  // Gemini agent reads from there via SQL Agent when needed
  if (summary) console.log('[NexaIntelligence] 🤖 Summary saved for Gemini context (', summary.length, 'chars)');
}

// ═══════════════════════════════════════════
// 📈 Track Usage
// ═══════════════════════════════════════════

async function trackUsage(client: any, companyId: string, tokensUsed: number) {
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await client.from('ai_opus_usage')
    .select('id, reports_generated, tokens_used')
    .eq('company_id', companyId).eq('usage_date', today).single();

  if (existing) {
    await client.from('ai_opus_usage').update({
      reports_generated: (existing.reports_generated || 0) + 1,
      tokens_used: (existing.tokens_used || 0) + tokensUsed,
      cost_usd: ((existing.tokens_used || 0) + tokensUsed) / 1000 * 0.015,
    }).eq('id', existing.id);
  } else {
    await client.from('ai_opus_usage').insert({
      company_id: companyId,
      usage_date: today,
      reports_generated: 1,
      tokens_used: tokensUsed,
      cost_usd: tokensUsed / 1000 * 0.015,
    });
  }
}

// ═══════════════════════════════════════════
// 🎤 Generate Voice Report (ElevenLabs TTS)
// ═══════════════════════════════════════════

async function generateVoiceReport(apiKey: string, opts: {
  text: string;
  reportType: string;
  language: string;
}): Promise<{ audioBuffer: ArrayBuffer | null }> {
  const { text, reportType, language } = opts;
  if (!text || text.length < 20) {
    console.log('[NexaIntelligence] 🎤 Text too short for TTS, skipping');
    return { audioBuffer: null };
  }

  const langKey = VOICE_CONFIG[language] ? language : 'ar';
  const voice = VOICE_CONFIG[langKey];
  console.log(`[NexaIntelligence] 🎤 Generating TTS: voice=${voice.voiceName}, lang=${langKey}, chars=${text.length}`);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const tracks = reportType === 'morning' ? BGM_TRACKS.morning : BGM_TRACKS.evening;

  // Step 1: Fetch pre-recorded intro music from Supabase Storage (max 250KB to save memory)
  let introBuffer: ArrayBuffer | null = null;
  try {
    const introUrl = `${supabaseUrl}/storage/v1/object/public/ai-reports/${tracks.intro}`;
    console.log(`[NexaIntelligence] 🎵 Fetching intro: ${tracks.intro.split('/').pop()}`);
    const introController = new AbortController();
    const introTimeout = setTimeout(() => introController.abort(), 15000);
    const introRes = await fetch(introUrl, { signal: introController.signal });
    clearTimeout(introTimeout);
    if (introRes.ok) {
      const fullBuffer = await introRes.arrayBuffer();
      // 5 seconds of MP3 at 128kbps = 5 * 128000/8 = 80,000 bytes ≈ 78KB
      const maxBytes = 80 * 1024;
      introBuffer = fullBuffer.byteLength > maxBytes ? fullBuffer.slice(0, maxBytes) : fullBuffer;
      console.log(`[NexaIntelligence] 🎵 Intro loaded (${(introBuffer.byteLength/1024).toFixed(0)}KB ≈ 5s)`);
    } else {
      console.warn(`[NexaIntelligence] 🎵 Intro fetch failed: ${introRes.status}`);
    }
  } catch (e: any) {
    console.warn('[NexaIntelligence] 🎵 Intro error (non-fatal):', e.message);
  }

  // Step 2: Fetch pre-recorded outro music from Supabase Storage
  let outroBuffer: ArrayBuffer | null = null;
  try {
    const outroUrl = `${supabaseUrl}/storage/v1/object/public/ai-reports/${tracks.outro}`;
    console.log(`[NexaIntelligence] 🎵 Fetching outro: ${tracks.outro.split('/').pop()}`);
    const outroController = new AbortController();
    const outroTimeout = setTimeout(() => outroController.abort(), 15000);
    const outroRes = await fetch(outroUrl, { signal: outroController.signal });
    clearTimeout(outroTimeout);
    if (outroRes.ok) {
      const fullBuffer = await outroRes.arrayBuffer();
      const maxBytes = 256 * 1024;
      if (fullBuffer.byteLength > maxBytes) {
        outroBuffer = fullBuffer.slice(0, maxBytes);
        console.log(`[NexaIntelligence] 🎵 Outro trimmed: ${(fullBuffer.byteLength/1024).toFixed(0)}KB → ${(maxBytes/1024).toFixed(0)}KB`);
      } else {
        outroBuffer = fullBuffer;
      }
      console.log(`[NexaIntelligence] 🎵 Outro loaded (${(outroBuffer.byteLength/1024).toFixed(0)}KB)`);
    } else {
      console.warn(`[NexaIntelligence] 🎵 Outro fetch failed: ${outroRes.status}`);
    }
  } catch (e: any) {
    console.warn('[NexaIntelligence] 🎵 Outro error (non-fatal):', e.message);
  }

  // Step 3: Generate TTS — split into chunks at sentence boundaries to avoid ElevenLabs 5000-char cutoff
  const MAX_CHUNK = 4800; // leave 200 chars safety margin

  // Split text into chunks at sentence boundaries (. or \n)
  const splitIntoChunks = (fullText: string): string[] => {
    const chunks: string[] = [];
    let remaining = fullText;
    while (remaining.length > MAX_CHUNK) {
      // Find last sentence end (. or \n) before limit
      let cutAt = MAX_CHUNK;
      const lastDot = remaining.lastIndexOf('.', MAX_CHUNK);
      const lastNewline = remaining.lastIndexOf('\n', MAX_CHUNK);
      const splitPoint = Math.max(lastDot, lastNewline);
      if (splitPoint > MAX_CHUNK * 0.5) cutAt = splitPoint + 1; // cut after the dot
      chunks.push(remaining.substring(0, cutAt).trim());
      remaining = remaining.substring(cutAt).trim();
    }
    if (remaining.length > 0) chunks.push(remaining);
    return chunks;
  };

  const textChunks = splitIntoChunks(text);
  console.log(`[NexaIntelligence] 🎤 Splitting into ${textChunks.length} chunk(s), total chars: ${text.length}`);

  const audioChunks: ArrayBuffer[] = [];
  for (let i = 0; i < textChunks.length; i++) {
    const chunk = textChunks[i];
    if (!chunk) continue;
    try {
      const chunkController = new AbortController();
      const chunkTimeout = setTimeout(() => chunkController.abort(), 90000);
      const chunkRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.voiceId}`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: chunk,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.8,
            style: reportType === 'morning' ? 0.3 : 0.4,
            use_speaker_boost: true,
          },
        }),
        signal: chunkController.signal,
      });
      clearTimeout(chunkTimeout);
      if (chunkRes.ok) {
        const buf = await chunkRes.arrayBuffer();
        audioChunks.push(buf);
        console.log(`[NexaIntelligence] 🎤 Chunk ${i + 1}/${textChunks.length}: ${(buf.byteLength/1024).toFixed(0)}KB`);
      } else {
        const errText = await chunkRes.text();
        console.error(`[NexaIntelligence] 🎤 TTS chunk ${i+1} error ${chunkRes.status}:`, errText.substring(0, 200));
        if (i === 0) return { audioBuffer: null }; // fail only if first chunk fails
      }
    } catch (chunkErr: any) {
      console.warn(`[NexaIntelligence] 🎤 Chunk ${i+1} error (skipping):`, chunkErr.message);
      if (i === 0) return { audioBuffer: null };
    }
  }

  if (audioChunks.length === 0) return { audioBuffer: null };

  // Concatenate all voice chunks
  const totalVoiceSize = audioChunks.reduce((s, b) => s + b.byteLength, 0);
  const voiceBuffer = new Uint8Array(totalVoiceSize);
  let vOffset = 0;
  for (const chunk of audioChunks) {
    voiceBuffer.set(new Uint8Array(chunk), vOffset);
    vOffset += chunk.byteLength;
  }
  console.log(`[NexaIntelligence] 🎤 TTS complete: ${textChunks.length} chunks, ${(totalVoiceSize/1024).toFixed(0)}KB total`);

  // Step 4: Concatenate [🎵 intro] + [🎤 voice] + [🎵 outro] (simple MP3 concat)
  const introSize = introBuffer?.byteLength || 0;
  const outroSize = outroBuffer?.byteLength || 0;
  const totalSize = introSize + totalVoiceSize + outroSize;

  if (introSize > 100 || outroSize > 100) {
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    if (introBuffer && introSize > 100) { combined.set(new Uint8Array(introBuffer), offset); offset += introSize; }
    combined.set(voiceBuffer, offset); offset += totalVoiceSize;
    if (outroBuffer && outroSize > 100) { combined.set(new Uint8Array(outroBuffer), offset); }
    console.log(`[NexaIntelligence] 🎵+🎤+🎵 intro(${(introSize/1024).toFixed(0)}KB) + voice(${(totalVoiceSize/1024).toFixed(0)}KB) + outro(${(outroSize/1024).toFixed(0)}KB) = ${(totalSize/1024).toFixed(0)}KB`);
    return { audioBuffer: combined.buffer };
  }

  return { audioBuffer: voiceBuffer.buffer };
}

// ═══════════════════════════════════════════
// 📱 Send Telegram Notifications
// ═══════════════════════════════════════════

async function sendTelegramNotifications(client: any, companyId: string, opts: any) {
  const { reportType, analysis, voiceBuffer } = opts;
  
  try {
    // Get bot token from company integrations
    const { data: company } = await client.from('companies')
      .select('integrations')
      .eq('id', companyId).single();
    
    const botToken = company?.integrations?.telegram?.bot_token;
    if (!botToken) {
      console.log('[NexaIntelligence] No Telegram bot token configured');
      return 0;
    }

    // Get all linked Telegram connections
    const { data: connections } = await client.from('telegram_connections')
      .select('telegram_chat_id, user_id, notification_role, notification_preferences')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (!connections?.length) {
      console.log('[NexaIntelligence] No Telegram connections found');
      return 0;
    }

    let sent = 0;
    const reportEmoji = reportType === 'morning' ? '☀️' : '🌙';
    const reportLabel = reportType === 'morning' ? 'الصباحي' : 'المسائي';

    for (const conn of connections) {
      const chatId = conn.telegram_chat_id;
      if (!chatId) continue;

      // Check notification preferences
      const prefs = conn.notification_preferences || {};
      const prefKey = reportType === 'morning' ? 'daily_report_am' : 'daily_report_pm';
      if (prefs[prefKey] === false) continue;

      const role = conn.notification_role || 'owner';
      const isAdmin = ['owner', 'company_admin', 'company_owner'].includes(role);
      
      let message = '';
      
      if (isAdmin) {
        message = `🧠 *تقرير NexaIntelligence ${reportEmoji} ${reportLabel}*\n\n`;
        message += analysis.manager_summary || '';
        if (analysis.alerts?.length) {
          message += '\n\n⚠️ *تنبيهات:*\n' + analysis.alerts.map((a: any) => `• ${a.message}`).join('\n');
        }
        if (analysis.highlights?.length) {
          message += '\n\n🌟 *إنجازات:*\n' + analysis.highlights.map((h: string) => `• ${h}`).join('\n');
        }
        if (analysis.tasks?.length) {
          message += `\n\n📋 *مهام اليوم (${analysis.tasks.length}):*\n`;
          message += analysis.tasks.slice(0, 5).map((t: any) => `• [${t.priority}] ${t.title}`).join('\n');
        }
        if (analysis.forecast) message += `\n\n📈 ${analysis.forecast}`;
      } else {
        const empReport = analysis.employee_reports?.[role];
        if (empReport) {
          message = `🧠 *تقريرك ${reportEmoji} ${reportLabel}*\n\n`;
          if (empReport.greeting) message += empReport.greeting + '\n\n';
          if (empReport.summary) message += empReport.summary + '\n\n';
          if (empReport.tasks?.length) {
            message += '📋 *مهامك:*\n' + empReport.tasks.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n') + '\n\n';
          }
          if (empReport.tip) message += `💡 ${empReport.tip}\n`;
          if (empReport.motivation) message += `\n🎯 ${empReport.motivation}`;
        } else {
          message = `🧠 *ملخص ${reportEmoji}*\n\n${analysis.manager_summary || ''}`;
        }
      }

      message += '\n\n_— TexaCore NexaIntelligence 🤖_';

      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
          }),
        });
        if (res.ok) {
          sent++;
          console.log(`[NexaIntelligence] ✅ Telegram text sent to ${chatId}`);

          // Send voice message to admin users only (with 30s timeout)
          if (isAdmin && voiceBuffer && voiceBuffer.byteLength > 100) {
            try {
              const voiceSendController = new AbortController();
              const voiceSendTimeout = setTimeout(() => voiceSendController.abort(), 30000);
              
              const formData = new FormData();
              formData.append('chat_id', chatId);
              formData.append('voice', new Blob([voiceBuffer], { type: 'audio/mpeg' }), 'nexa_report.ogg');
              formData.append('caption', `🎤 ${reportLabel} — TexaCore NexaIntelligence`);

              const voiceRes = await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
                method: 'POST',
                body: formData,
                signal: voiceSendController.signal,
              });
              clearTimeout(voiceSendTimeout);
              
              if (voiceRes.ok) {
                console.log(`[NexaIntelligence] 🎤 Voice sent to ${chatId}`);
              } else {
                // Fallback: try sendAudio if sendVoice fails
                const audioController = new AbortController();
                const audioTimeout = setTimeout(() => audioController.abort(), 30000);
                
                const audioForm = new FormData();
                audioForm.append('chat_id', chatId);
                audioForm.append('audio', new Blob([voiceBuffer], { type: 'audio/mpeg' }), 'nexa_report.mp3');
                audioForm.append('title', `NexaIntelligence ${reportLabel}`);
                audioForm.append('performer', 'TexaCore AI');
                await fetch(`https://api.telegram.org/bot${botToken}/sendAudio`, {
                  method: 'POST',
                  body: audioForm,
                  signal: audioController.signal,
                });
                clearTimeout(audioTimeout);
                console.log(`[NexaIntelligence] 🎵 Audio fallback sent to ${chatId}`);
              }
            } catch (voiceErr: any) {
              console.warn(`[NexaIntelligence] 🎤 Voice send error (non-fatal):`, voiceErr.message);
            }
          }
        } else {
          const err = await res.text();
          console.error(`[NexaIntelligence] ❌ Telegram error ${chatId}:`, err);
        }
      } catch (e: any) {
        console.error(`[NexaIntelligence] ❌ Send error:`, e.message);
      }
    }
    return sent;
  } catch (err: any) {
    console.error('[NexaIntelligence] Telegram error:', err.message);
    return 0;
  }
}
