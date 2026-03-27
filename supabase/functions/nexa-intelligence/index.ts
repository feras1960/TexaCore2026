// ═══════════════════════════════════════════════════
// 🧠 NexaIntelligence — Smart Daily Reports Engine
// Uses Claude Opus for deep analysis + personalized reports
// ═══════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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

    // ═══ Step 10: Send Telegram notifications ═══
    const tgSent = await sendTelegramNotifications(adminClient, company_id, {
      reportType: report_type,
      analysis: analysisResult.analysis,
      employees,
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

  // Purchases + containers
  const { data: containers } = await client.from('containers')
    .select('container_number, status, total_cost, arrival_date, supplier_id')
    .eq('company_id', companyId).order('created_at', { ascending: false }).limit(10);
  data.containers = containers || [];

  // Accounting - unposted entries
  const { data: unposted } = await client.from('journal_entries')
    .select('id, entry_number, description_ar, total_debit, status')
    .eq('company_id', companyId).eq('is_posted', false).limit(20);
  data.unposted_entries = unposted || [];

  // Customers with balances
  const { data: customers } = await client.from('customers')
    .select('id, name_ar, name_en, balance, credit_limit, currency')
    .eq('company_id', companyId).limit(100);
  data.customers = customers?.map((c: any) => ({ id: c.id, name: c.name_ar || c.name_en, balance: c.balance || 0 })) || [];

  // Suppliers
  const { data: suppliers } = await client.from('suppliers')
    .select('id, name_ar, name_en, balance')
    .eq('company_id', companyId).limit(100);
  data.suppliers = suppliers?.map((s: any) => ({ id: s.id, name: s.name_ar || s.name_en, balance: s.balance || 0 })) || [];

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

async function callClaudeOpus(apiKey: string, context: any) {
  const { reportType, companyData, employees, overdueTasks, companyId } = context;
  
  const isMorning = reportType === 'morning';
  const today = new Date().toISOString().split('T')[0];
  
  const employeesList = employees.map((e: any) => `- ${e.name} (${e.role_code}/${e.role_name})`).join('\n');
  const overdueList = overdueTasks.length > 0 
    ? overdueTasks.map((t: any) => `- [${t.priority}] ${t.title} (مسند لـ: ${t.assigned_to || 'غير محدد'}, مستحق: ${t.due_date})`).join('\n')
    : 'لا توجد مهام متأخرة ✅';

  const prompt = `أنت **وكيل NexaIntelligence** — الوكيل الأذكى المتخصص في تجارة الأقمشة والشركات العالمية الكبرى في أوروبا وأمريكا.
مبني في نظام **TexaCore ERP** — أقوى نظام ERP ذكي.

اليوم: ${today}
نوع التقرير: ${isMorning ? '☀️ صباحي (توزيع مهام اليوم)' : '🌙 مسائي (ملخص أداء + مهام الغد)'}

## بيانات الشركة:
${JSON.stringify(companyData, null, 2).substring(0, 15000)}

## الموظفين وأدوارهم:
${employeesList}

## المهام المتأخرة من أيام سابقة:
${overdueList}

## المطلوب منك:
أنشئ تقريراً مهنياً **تحفيزياً وإيجابياً** بـ JSON بالهيكل التالي:

{
  "manager_summary": "ملخص شامل للمدير (5-8 جمل) يتضمن: الأداء المالي، تنبيهات عاجلة، توصيات استراتيجية. اسلوب تحفيزي. يذكر أنه من وكيل NexaIntelligence في TexaCore.",
  "highlights": ["إنجاز 1", "إنجاز 2"],
  "alerts": [{"severity": "high", "message": "تنبيه عاجل"}],
  "tasks": [
    {
      "title": "عنوان المهمة",
      "description": "التفاصيل",
      "assigned_to_role": "salesperson",
      "assigned_to_name": "اسم الموظف إن وُجد",
      "priority": "high",
      "category": "collection",
      "due_date": "${today}",
      "ai_reasoning": "لماذا هذه المهمة مهمة",
      "related_entity_type": "customer",
      "related_entity_id": "uuid-if-available"
    }
  ],
  "employee_reports": {
    "role_code": {
      "greeting": "تحية مخصصة تحفيزية",
      "summary": "ملخص مخصص للدور",
      "tasks": ["مهمة 1", "مهمة 2"],
      "tip": "نصيحة مهنية 💡",
      "motivation": "رسالة تحفيزية 🎯"
    }
  },
  "kpi_insights": "ملاحظات عن مؤشرات الأداء",
  "forecast": "توقع المبيعات/الأداء للأيام القادمة"
}

## قواعد مهمة:
1. **أسلوب تحفيزي**: كل رسالة يجب أن تكون إيجابية ومحفزة. استخدم إيموجي.
2. **مهام مخصصة**: وزع المهام حسب الدور:
   - salesperson/sales_agent: متابعة عملاء، تحصيلات، عروض
   - warehouse_keeper: جرد، مناقلات، استلامات، فواتير معلقة
   - purchasing_manager: كونتينرات، طلبات شراء، متابعة موردين
   - accountant: قيود غير مرحّلة، تسويات
   - company_admin/company_owner: مراجعة أداء، قرارات استراتيجية
3. **فواتير متأخرة**: خصص لكل مندوب فواتير زبائنه المسجلين.
4. **المهام المتأخرة**: نبّه الموظف المسؤول واقترح حلاً.
5. اذكر أن التقرير من **TexaCore NexaIntelligence** — أقوى وكيل ذكاء اصطناعي متخصص في الأقمشة.
6. أضف تقديرات الأداء الإيجابية وشجع على الأفضل.

أجب بـ JSON فقط بدون أي نص إضافي.`;

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
// 📱 Send Telegram Notifications
// ═══════════════════════════════════════════

async function sendTelegramNotifications(client: any, companyId: string, opts: any) {
  const { reportType, analysis } = opts;
  
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
          console.log(`[NexaIntelligence] ✅ Telegram sent to ${chatId}`);
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
