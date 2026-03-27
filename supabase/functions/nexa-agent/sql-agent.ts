// ═══════════════════════════════════════════════════
// 🤖 NexaPro Agent — SQL Agent Module
// ═══════════════════════════════════════════════════
// Schema caching, SQL hints prompt, function calling tools,
// and the multi-round SQL Agent execution loop

// ═══ Module-level schema cache ═══
let cachedSchema = '';
let schemaCacheTime = 0;
const SCHEMA_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const IMPORTANT_TABLES = [
  'fabric_materials', 'fabric_rolls', 'customers', 'suppliers',
  'sales_transactions', 'sales_transaction_items',
  'purchase_invoices', 'purchase_invoice_items', 'purchase_receipts', 'purchase_receipt_items',
  'inventory_movements', 'stock_movements', 'roll_reservations',
  'warehouses', 'warehouse_locations', 'containers', 'container_items',
  'container_expenses', 'container_cost_allocations',
  'journal_entries', 'journal_entry_lines', 'chart_of_accounts',
  'equity_partners', 'companies', 'branches', 'currencies',
  'employees', 'departments', 'positions', 'employee_salary', 'salary_components',
  'attendance', 'leave_requests', 'leave_balances', 'payroll_periods', 'payroll_entries',
  'employee_contracts', 'expense_entries', 'drivers', 'payment_vouchers',
  'delivery_notes', 'delivery_note_items', 'sales_delivery_items',
  'sales_invoice_items', 'sales_order_items', 'sales_return_items',
  'user_profiles', 'notifications', 'inventory_stock',
  'exchange_rates', 'tax_rates',
];

// ═══ Schema Loading ═══

export async function loadSchema(adminClient: any): Promise<string> {
  const now = Date.now();
  if (cachedSchema && (now - schemaCacheTime) < SCHEMA_CACHE_TTL) {
    console.log('[SQLAgent] ⚡ Schema from cache');
    return cachedSchema;
  }

  try {
    const { data: schemaData } = await adminClient.rpc('get_schema_info');
    if (schemaData && Array.isArray(schemaData)) {
      const importantTables = schemaData.filter((t: any) => IMPORTANT_TABLES.includes(t.table));
      cachedSchema = importantTables.map((t: any) => `${t.table}: ${t.columns?.map((c: any) => c.name).join(', ')}`).join('\n');
      schemaCacheTime = Date.now();
      console.log('[SQLAgent] Schema loaded & cached:', importantTables.length, 'tables');
    }
  } catch (err) {
    console.log('[SQLAgent] Schema fetch error:', err);
  }

  return cachedSchema;
}

// ═══ Function Calling Tools Definition ═══

export function buildSQLTools(schemaContext: string): any[] | undefined {
  if (!schemaContext) return undefined;
  return [{
    functionDeclarations: [{
      name: 'run_sql_query',
      description: 'Execute a read-only SQL query against the company database. Use this when you need to look up specific data not available in the pre-loaded context. ALWAYS include WHERE company_id = the company ID in your queries for tables that have company_id. Only SELECT queries are allowed.',
      parameters: {
        type: 'OBJECT',
        properties: {
          sql: { type: 'STRING', description: "The SQL SELECT query to execute. Must include company_id filter." },
          purpose: { type: 'STRING', description: 'Brief description of what this query is looking for' },
        },
        required: ['sql', 'purpose'],
      },
    }],
  }];
}

// ═══ SQL Agent Prompt ═══

export function buildSQLAgentPrompt(schemaContext: string, companyId: string, tenantId: string, userRole: string = 'user'): string {
  if (!schemaContext) return '';

  // Role-based SQL restrictions
  const ADMIN_ROLES = ['super_admin', 'tenant_owner', 'company_owner', 'company_admin'];
  let roleRestriction = '';
  if (!ADMIN_ROLES.includes(userRole)) {
    const restrictedByRole: Record<string, string[]> = {
      'salesperson': ['purchase_invoices', 'purchase_invoice_items', 'purchase_orders', 'purchase_receipts', 'purchase_receipt_items', 'containers', 'container_items', 'container_expenses', 'container_cost_allocations', 'employee_salary', 'salary_components', 'payroll_entries', 'payroll_periods', 'equity_partners'],
      'sales_agent': ['purchase_invoices', 'purchase_invoice_items', 'purchase_orders', 'purchase_receipts', 'purchase_receipt_items', 'containers', 'container_items', 'container_expenses', 'container_cost_allocations', 'employee_salary', 'salary_components', 'payroll_entries', 'payroll_periods', 'equity_partners'],
      'warehouse_keeper': ['sales_transactions', 'sales_transaction_items', 'sales_invoice_items', 'purchase_invoices', 'purchase_invoice_items', 'journal_entries', 'journal_entry_lines', 'chart_of_accounts', 'payment_vouchers', 'employee_salary', 'salary_components', 'payroll_entries', 'payroll_periods', 'equity_partners'],
      'purchasing_manager': ['sales_transactions', 'sales_transaction_items', 'sales_invoice_items', 'employee_salary', 'salary_components', 'payroll_entries', 'payroll_periods', 'equity_partners'],
      'accountant': ['employee_salary', 'salary_components', 'payroll_entries', 'payroll_periods'],
      'driver': ['purchase_invoices', 'purchase_invoice_items', 'sales_transactions', 'sales_transaction_items', 'journal_entries', 'journal_entry_lines', 'chart_of_accounts', 'payment_vouchers', 'employee_salary', 'salary_components', 'payroll_entries', 'payroll_periods', 'equity_partners', 'customers', 'suppliers'],
      'hr_manager': ['sales_transactions', 'sales_transaction_items', 'purchase_invoices', 'purchase_invoice_items', 'journal_entries', 'journal_entry_lines', 'equity_partners'],
    };
    const blocked = restrictedByRole[userRole] || restrictedByRole['driver']; // Default = most restricted
    roleRestriction = `\n⚠️ **قيود أمنية حسب الدور (${userRole})**: لا تستعلم أبداً من هذه الجداول: ${blocked.join(', ')}. إذا طلب المستخدم بيانات منها قل: "هذه البيانات غير متاحة لصلاحياتك 🔒".`;
  }
  return `

## 🔧 أدوات SQL Agent (وصول مباشر لقاعدة البيانات):
لديك أداة run_sql_query لاستعلام قاعدة البيانات مباشرة.
⚠️ **قاعدة ذهبية**: دائماً استخدم أداة run_sql_query عندما يسأل المستخدم عن تفاصيل دقيقة مثل: رولونات فاتورة، مواقع مخزون، حركات مخزنية، أو أي بيانات غير متوفرة أعلاه.
⚠️ دائماً أضف WHERE company_id = '${companyId}' للجداول الرئيسية.
⚠️ الجداول الفرعية (purchase_invoice_items, purchase_receipt_items, container_items, journal_entry_lines, delivery_note_items) ليس فيها company_id — استخدم tenant_id = '${tenantId}' أو JOIN مع الجدول الرئيسي.

### 💡 قواعد بيانات مهمة (استخدمها لكتابة SQL):
1. **رولونات فاتورة مبيعات**: الرولونات المصروفة لفاتورة موجودة في جدول **inventory_movements** حيث reference_number = رقم الفاتورة (مثل SI-2026-000001) و movement_type = 'sale'. كل صف = رول واحد مع roll_id و quantity (الطول المصروف).
   مثال: SELECT im.roll_id, im.quantity, fr.roll_number, fm.name_ar FROM inventory_movements im JOIN fabric_rolls fr ON im.roll_id = fr.id JOIN fabric_materials fm ON im.material_id = fm.id WHERE im.reference_number = 'SI-2026-000001'
2. **رمز الرول**: في fabric_rolls.roll_number
3. **اسم المادة**: JOIN fabric_materials ON material_id = fabric_materials.id (استخدم name_ar)
4. **اسم المستودع**: JOIN warehouses ON warehouse_id = warehouses.id (استخدم name أو name_ar)
5. **موقع الرول داخل المستودع**: fabric_rolls.bin_location_id → JOIN warehouse_locations ON id = bin_location_id (استخدم name أو row_label+column_label)
6. **رصيد عميل**: SELECT SUM(balance) FROM sales_transactions WHERE customer_id = 'xxx' AND stage IN ('confirmed','posted','partial_paid')
7. ⚠️ **أسماء الأعمدة المهمة**:
   - المبيعات: sales_transactions.invoice_no (مثل SI-2026-000001)
   - المشتريات: purchase_invoices.invoice_number (مثل PI-2026-000001) — ليس invoice_no!
   - الموردين/العملاء: name_ar (وليس name)
   - الكونتينر: containers.container_number, containers.status ('in_transit','at_port','customs','received','closed')
   - بنود المشتريات: purchase_invoice_items (استخدم tenant_id للفلترة)
   - بنود الكونتينر: container_items (استخدم tenant_id للفلترة)
   - بنود الاستلام: purchase_receipt_items.ordered_quantity, received_quantity, variance_quantity
8. **لا تقل أبداً "البيانات غير متوفرة"** — استخدم أداة SQL للبحث!

### 🎯 استراتيجية الاستخدام:
- السياق أعلاه = نظرة عامة سريعة. استخدمه للإجابات العامة.
- أداة SQL = تفاصيل دقيقة. استخدمها لأي سؤال يحتاج بيانات محددة.
- ⚠️ **كن فعالاً جداً**: في أول query اجمع أكبر قدر من البيانات بـ JOINs شاملة!
- يمكنك تنفيذ حتى 5 استعلامات SQL. اجمع أكبر قدر من البيانات في كل استعلام.
- ⚠️ **chart_of_accounts فيها 135+ حساب — ليست فارغة!** استعلم: SELECT code, name_ar, account_type, balance FROM chart_of_accounts WHERE company_id = 'COMPANY_ID'

### 🏢 منطق الأعمال (Business Logic):
#### 📦 دورة الشراء الكاملة:
1. إنشاء فاتورة مشتريات من المورد → purchase_invoices
2. إدخال الفاتورة في كونتينر → container_items (قد يحتوي فواتير من موردين مختلفين)
3. دفع المصاريف على الكونتينر بشكل مستقل → container_expenses (شحن، تخزين، نقل، تأمين)
4. دفع الضريبة الجمركية بشكل مستقل → journal_entries — الضريبة المرتجعة تُوزع على المواد
5. توزيع المصاريف على المواد → container_cost_allocations (حساب التكلفة الواصلة Landed Cost)
6. استلام في المستودع → تحديث received_quantity, received_rolls, variance_amount
7. القيود المحاسبية → journal_entries + journal_entry_lines
8. حركات المخزون → inventory_movements (reference_type = 'container_receipt')
#### 💰 التكلفة الواصلة = سعر الشراء + حصة الشحن + حصة الجمارك + مصاريف أخرى - حصة الضريبة المرتجعة

### 🔄 دورة المشتريات:
- ⚠️ **مهم**: المشتريات تتم عبر الكونتينر. ابحث دائماً في containers + container_items أولاً!
- فاتورة مشتريات: purchase_invoices (invoice_number, supplier_name, total_amount, invoice_date)
- بنود الفاتورة: purchase_invoice_items (tenant_id للفلترة)
- إيصال الاستلام: purchase_receipts (purchase_invoice_id, status, received_by)
- القيود المحاسبية: journal_entries (ابحث بـ description ILIKE '%PI-2026%' أو '%نانسي%')

### 📦 بنود الكونتينر (المصدر الرئيسي للمشتريات):
- ⚠️ **container_items هو المصدر الرئيسي لبيانات الشراء**
- container_expenses: مصاريف الشحن والتخزين والنقل
- container_cost_allocations: توزيع التكاليف على المواد
- مثال: SELECT c.container_number, c.status, c.total_cost, ci.item_description, ci.supplier_name, ci.invoice_no, ci.expected_quantity, ci.received_quantity, ci.received_rolls, ci.variance_amount, ci.unit_price, ci.total_price FROM containers c JOIN container_items ci ON ci.container_id = c.id WHERE c.company_id = 'COMPANY_ID'
- حركات المخزون: inventory_movements حيث reference_type = 'container_receipt'
- تكاليف: containers.total_cost, container_expenses, journal_entries عن 'جمرك' أو 'customs'

### هيكل قاعدة البيانات (الجداول والأعمدة):
${schemaContext}
${roleRestriction}
`;
}

// ═══ SQL Security: Role-based query enforcement ═══
const ROLE_BLOCKED_TABLES: Record<string, string[]> = {
  'salesperson': ['purchase_invoices', 'purchase_invoice_items', 'purchase_orders', 'purchase_receipts', 'purchase_receipt_items', 'containers', 'container_items', 'container_expenses', 'container_cost_allocations', 'employee_salary', 'salary_components', 'payroll_entries', 'payroll_periods', 'equity_partners'],
  'sales_agent': ['purchase_invoices', 'purchase_invoice_items', 'purchase_orders', 'purchase_receipts', 'purchase_receipt_items', 'containers', 'container_items', 'container_expenses', 'container_cost_allocations', 'employee_salary', 'salary_components', 'payroll_entries', 'payroll_periods', 'equity_partners'],
  'warehouse_keeper': ['sales_transactions', 'sales_transaction_items', 'sales_invoice_items', 'purchase_invoices', 'purchase_invoice_items', 'journal_entries', 'journal_entry_lines', 'chart_of_accounts', 'payment_vouchers', 'employee_salary', 'salary_components', 'payroll_entries', 'payroll_periods', 'equity_partners'],
  'purchasing_manager': ['sales_transactions', 'sales_transaction_items', 'sales_invoice_items', 'employee_salary', 'salary_components', 'payroll_entries', 'payroll_periods', 'equity_partners'],
  'accountant': ['employee_salary', 'salary_components', 'payroll_entries', 'payroll_periods'],
  'driver': ['purchase_invoices', 'purchase_invoice_items', 'sales_transactions', 'sales_transaction_items', 'journal_entries', 'journal_entry_lines', 'chart_of_accounts', 'payment_vouchers', 'employee_salary', 'salary_components', 'payroll_entries', 'payroll_periods', 'equity_partners', 'customers', 'suppliers'],
  'hr_manager': ['sales_transactions', 'sales_transaction_items', 'purchase_invoices', 'purchase_invoice_items', 'journal_entries', 'journal_entry_lines', 'equity_partners'],
};

function enforceQuerySecurity(sql: string, userRole: string): string | null {
  const ADMIN_ROLES = ['super_admin', 'tenant_owner', 'company_owner', 'company_admin'];
  if (ADMIN_ROLES.includes(userRole)) return null; // Admins pass all queries
  
  const blocked = ROLE_BLOCKED_TABLES[userRole] || ROLE_BLOCKED_TABLES['driver'];
  const sqlLower = sql.toLowerCase();
  
  for (const table of blocked) {
    // Check if the query references any blocked table
    if (sqlLower.includes(table)) {
      console.log(`[SQLAgent] 🔒 BLOCKED query for role '${userRole}' — table '${table}' is restricted`);
      return table;
    }
  }
  return null;
}

// ═══ SQL Agent Execution Loop ═══

export async function executeSQLAgentLoop(
  adminClient: any,
  geminiBody: any,
  contents: any[],
  apiUrl: string,
  companyId: string,
  tenantId: string,
  userRole: string = 'user',
): Promise<{ response: any; contents: any[]; geminiBody: any; ok: boolean; status: number }> {
  let geminiResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody),
  });

  let maxRounds = 5;
  let lastParsedResult: any = null;

  while (geminiResponse.ok && maxRounds > 0) {
    lastParsedResult = await geminiResponse.json();
    const candidate = lastParsedResult?.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    const functionCall = parts.find((p: any) => p.functionCall);
    if (!functionCall) break;

    const fc = functionCall.functionCall;
    console.log('[SQLAgent] Function call:', fc.name, 'Purpose:', fc.args?.purpose);
    console.log('[SQLAgent] Query:', fc.args?.sql?.substring(0, 200));

    let queryResult: any = { error: 'Unknown function' };

    if (fc.name === 'run_sql_query' && adminClient && fc.args?.sql) {
      // 🔒 Layer 4: Enforce SQL security before execution
      const blockedTable = enforceQuerySecurity(fc.args.sql, userRole);
      if (blockedTable) {
        queryResult = { error: `🔒 ممنوع الوصول: جدول '${blockedTable}' غير متاح لصلاحياتك. تواصل مع المسؤول.` };
      } else {
      try {
        const { data, error } = await adminClient.rpc('execute_readonly_query', {
          query_text: fc.args.sql,
          p_company_id: companyId,
          p_tenant_id: tenantId || null,
        });
        if (error) {
          queryResult = { error: error.message };
          console.log('[SQLAgent] Query error:', error.message);
        } else {
          queryResult = { rows: data || [], count: Array.isArray(data) ? data.length : 0 };
          console.log('[SQLAgent] Query returned:', queryResult.count, 'rows');
        }
      } catch (err: any) {
        queryResult = { error: err?.message || 'Query execution failed' };
        console.log('[SQLAgent] Execution error:', err?.message);
      }
      } // close the else from security check
    }

    contents.push({ role: 'model', parts });
    contents.push({ role: 'user', parts: [{ functionResponse: { name: fc.name, response: queryResult } }] });
    geminiBody.contents = contents;

    geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    maxRounds--;
    lastParsedResult = null;
  }

  // If loop exhausted, force text response
  if (maxRounds <= 0 && lastParsedResult) {
    const lastParts = lastParsedResult?.candidates?.[0]?.content?.parts || [];
    const hasOnlyFunctionCall = lastParts.some((p: any) => p.functionCall) && !lastParts.some((p: any) => p.text);
    if (hasOnlyFunctionCall) {
      console.log('[SQLAgent] ⚠️ Exhausted rounds — forcing text response');
      contents.push({ role: 'model', parts: lastParts });
      contents.push({ role: 'user', parts: [{ text: 'لقد انتهت جولات الاستعلام. من فضلك لخّص ما وجدته وأجب على سؤال المستخدم بناءً على المعلومات المتاحة.' }] });
      geminiBody.contents = contents;
      delete geminiBody.tools;
      geminiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });
      lastParsedResult = null;
    }
  }

  return { response: lastParsedResult || (geminiResponse.ok ? await geminiResponse.json() : null), contents, geminiBody, ok: geminiResponse.ok, status: geminiResponse.status };
}
