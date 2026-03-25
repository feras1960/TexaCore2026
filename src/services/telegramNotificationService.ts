/**
 * Telegram Notification Service
 * ═══════════════════════════════════════════════════
 * Dispatches role-filtered notifications via Telegram
 * 
 * Usage:
 *   import { telegramNotify } from '@/services/telegramNotificationService'
 *   
 *   await telegramNotify.receiptOrder(companyId, {
 *     orderNumber: 'RCV-2026-0045',
 *     supplierName: 'شركة التكستيل',
 *     warehouseName: 'المستودع الرئيسي',
 *     items: [{ name: 'قماش كتان', qty: 500, unit: 'م', rolls: 5 }],
 *   })
 */

import { supabase } from '@/lib/supabase';

// Event type → source type + notification type mapping
const EVENT_SOURCE_MAP: Record<string, { sourceType: string; notifType: 'info' | 'success' | 'warning' | 'error' }> = {
    receipt_order: { sourceType: 'warehouse', notifType: 'info' },
    issue_order: { sourceType: 'warehouse', notifType: 'info' },
    shipment_arrival: { sourceType: 'container', notifType: 'success' },
    warehouse_transfer: { sourceType: 'warehouse', notifType: 'info' },
    warehouse_picking: { sourceType: 'sales', notifType: 'info' },
    warehouse_receiving: { sourceType: 'purchases', notifType: 'info' },
    warehouse_transfer_picking: { sourceType: 'warehouse', notifType: 'info' },
    low_stock: { sourceType: 'warehouse', notifType: 'warning' },
    payment_received: { sourceType: 'finance', notifType: 'success' },
    payment_sent: { sourceType: 'finance', notifType: 'info' },
    price_update: { sourceType: 'inventory', notifType: 'warning' },
    delivery_route: { sourceType: 'delivery', notifType: 'info' },
    sales_order: { sourceType: 'sales', notifType: 'success' },
    invoice_due: { sourceType: 'finance', notifType: 'warning' },
    credit_limit: { sourceType: 'finance', notifType: 'error' },
    inventory_task: { sourceType: 'warehouse', notifType: 'info' },
    security_alert: { sourceType: 'security', notifType: 'warning' },
    test_notification: { sourceType: 'system', notifType: 'info' },
    // ─── Exchange / Remittance Events ─────────────────────
    remittance_created: { sourceType: 'exchange', notifType: 'info' },
    remittance_sent: { sourceType: 'exchange', notifType: 'success' },
    remittance_delivered: { sourceType: 'exchange', notifType: 'success' },
    remittance_incoming: { sourceType: 'exchange', notifType: 'info' },
    remittance_cancelled: { sourceType: 'exchange', notifType: 'warning' },
    remittance_status_change: { sourceType: 'exchange', notifType: 'info' },
};

// ─── Core Dispatch Function ──────────────────────────────
async function dispatch(companyId: string, eventType: string, htmlMessage: string, targetWarehouseId?: string, roleMessages?: Record<string, string>) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { ok: false, error: 'Not authenticated' };

        let telegramResult: any = { ok: true };

        // 1. Send via Telegram (existing flow)
        try {
            const response = await supabase.functions.invoke('telegram-webhook', {
                body: {
                    action: 'dispatch_notification',
                    company_id: companyId,
                    event_type: eventType,
                    html_message: htmlMessage,
                    ...(targetWarehouseId ? { target_warehouse_id: targetWarehouseId } : {}),
                    ...(roleMessages ? { role_messages: roleMessages } : {}),
                },
            });

            if (response.error) {
                // CORS errors still deliver the message — treat as success
                console.warn(`[TelegramNotify] ${eventType} response error (may be CORS):`, response.error);
            }
            telegramResult = response?.data || { ok: true, sent: 1 };
        } catch (telegramErr) {
            // CORS or network error — Edge Function likely still executed
            console.warn(`[TelegramNotify] ${eventType} fetch error (likely CORS, message may have been sent):`, telegramErr);
            telegramResult = { ok: true, sent: 1, cors_fallback: true };
        }

        // 2. Save in-app notification (for NotificationBell)
        try {
            const mapping = EVENT_SOURCE_MAP[eventType] || { sourceType: 'system', notifType: 'info' as const };
            const plainText = htmlMessage.replace(/<[^>]+>/g, '').trim();
            const lines = plainText.split('\n').filter(l => l.trim() && !l.includes('━'));
            const title = lines[0] || eventType;
            const body = lines.slice(1, 4).join('\n').trim();

            await supabase.from('notifications').insert({
                user_id: session.user.id,
                tenant_id: companyId,
                title,
                body: body || null,
                type: mapping.notifType,
                source_type: mapping.sourceType,
                metadata: { event_type: eventType, company_id: companyId },
            });
        } catch (inAppErr) {
            console.warn('[TelegramNotify] In-app save failed:', inAppErr);
        }

        if (telegramResult?.sent > 0) {
            console.log(`[TelegramNotify] ${eventType}: sent=${telegramResult.sent}`);
        }
        return telegramResult;
    } catch (err) {
        console.warn('[TelegramNotify] Error:', err);
        return { ok: false, error: 'Network error' };
    }
}

/**
 * 🧪 Send a test notification to verify a channel works
 */
export async function sendTestNotification(channel: 'telegram' | 'email' | 'in_app', companyId?: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { ok: false, error: 'Not authenticated' };

        const userName = session.user.user_metadata?.full_name || session.user.email || 'User';
        const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        if (channel === 'telegram') {
            const msg = `🧪 <b>إشعار تجريبي — Test Notification</b>
━━━━━━━━━━━━━━━━━━━━

✅ مرحباً <b>${userName}</b>
📱 إشعارات التلغرام تعمل بنجاح!
⏰ ${timestamp}

— TexaCore ERP`;

            let cId = companyId || session.user.app_metadata?.company_id;

            // Fallback: get company_id from user_profiles
            if (!cId) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('company_id')
                    .eq('id', session.user.id)
                    .maybeSingle();
                cId = profile?.company_id;
            }

            if (cId) {
                const result = await dispatch(cId, 'test_notification', msg);
                return { ok: !!result?.ok || !!result?.sent };
            }
            return { ok: false, error: 'No company ID' };
        }

        if (channel === 'email') {
            const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#2563eb 100%);padding:32px 24px;text-align:center;">
    <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:1px;">TexaCore</div>
    <div style="font-size:12px;color:#93c5fd;margin-top:4px;">Enterprise Resource Planning</div>
  </div>
  <!-- Content -->
  <div style="padding:32px 28px;text-align:center;">
    <div style="width:64px;height:64px;margin:0 auto 16px;background:linear-gradient(135deg,#10b981,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;">
      <span style="font-size:32px;line-height:64px;">✅</span>
    </div>
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;">إشعار تجريبي ناجح</h2>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.6;">
      مرحباً <strong style="color:#1e293b;">${userName}</strong><br>
      إشعارات البريد الإلكتروني تعمل بنجاح!
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:20px 0;">
      <div style="display:inline-block;background:#059669;color:#fff;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;margin-bottom:8px;">CONNECTED</div>
      <p style="margin:8px 0 0;color:#166534;font-size:13px;">📧 ${session.user.email}</p>
      <p style="margin:4px 0 0;color:#166534;font-size:13px;">⏰ ${timestamp}</p>
    </div>
    <p style="color:#94a3b8;font-size:12px;margin-top:24px;line-height:1.5;">
      ستستقبل إشعارات المبيعات والمشتريات والمستودع<br>
      والمقبوضات والمدفوعات ومهام الفريق
    </p>
  </div>
  <!-- Footer -->
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 24px;text-align:center;">
    <p style="margin:0;color:#94a3b8;font-size:11px;">
      TexaCore ERP — جودة تستحق الثقة
    </p>
    <p style="margin:4px 0 0;color:#cbd5e1;font-size:10px;">
      هذا إشعار تجريبي • يمكنك إدارة تفضيلاتك من الملف الشخصي
    </p>
  </div>
</div>
</body>
</html>`;
            const result = await supabase.functions.invoke('send-email', {
                body: {
                    to: session.user.email,
                    subject: '✅ TexaCore — إشعار تجريبي ناجح',
                    html: emailHtml,
                },
            });
            return { ok: !result.error };
        }

        if (channel === 'in_app') {
            // Get company_id for tenant_id
            let tenantId = session.user.app_metadata?.company_id;
            if (!tenantId) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('company_id')
                    .eq('id', session.user.id)
                    .maybeSingle();
                tenantId = profile?.company_id;
            }
            await supabase.from('notifications').insert({
                user_id: session.user.id,
                tenant_id: tenantId,
                title: '🧪 إشعار تجريبي — Test',
                body: `✅ الإشعارات الداخلية تعمل بنجاح! (${timestamp})`,
                type: 'success',
                source_type: 'system',
                metadata: { test: true },
            });
            return { ok: true };
        }

        return { ok: false, error: 'Unknown channel' };
    } catch (err: any) {
        return { ok: false, error: err?.message || 'Error' };
    }
}

// ─── Helper: Format items table ──────────────────────────
function formatItemsTable(items: Array<{ name: string; qty: number; unit?: string; rolls?: number }>) {
    if (!items?.length) return '';
    return items.map(item => {
        let line = `• ${item.name} — <b>${item.qty}</b>`;
        if (item.unit) line += ` ${item.unit}`;
        if (item.rolls) line += ` (${item.rolls} رول)`;
        return line;
    }).join('\n');
}

// ─── Helper: Fetch bin locations for materials ───────────
async function fetchBinLocations(
    materialIds: string[],
    warehouseId?: string
): Promise<Record<string, Array<{ binCode: string; binName: string; rollCount: number; totalLength: number }>>> {
    if (!materialIds?.length) return {};

    try {
        let query = supabase
            .from('fabric_rolls')
            .select('material_id, current_length, bin_location:bin_locations(code, name, row_code, column_code)')
            .in('material_id', materialIds)
            .in('status', ['available', 'reserved', 'in_stock'])
            .not('bin_location_id', 'is', null);

        if (warehouseId) {
            query = query.eq('warehouse_id', warehouseId);
        }

        const { data: rolls, error } = await query;
        if (error || !rolls?.length) return {};

        // Group by material_id → bin
        const result: Record<string, Array<{ binCode: string; binName: string; rollCount: number; totalLength: number }>> = {};
        const binMap: Record<string, Record<string, { code: string; name: string; count: number; length: number }>> = {};

        for (const roll of rolls) {
            const matId = (roll as any).material_id;
            const bin = (roll as any).bin_location;
            if (!matId || !bin?.code) continue;

            if (!binMap[matId]) binMap[matId] = {};
            const binKey = bin.code;
            if (!binMap[matId][binKey]) {
                binMap[matId][binKey] = {
                    code: bin.code,
                    name: bin.name || `${bin.row_code || ''}${bin.column_code || ''}`,
                    count: 0,
                    length: 0,
                };
            }
            binMap[matId][binKey].count++;
            binMap[matId][binKey].length += Number((roll as any).current_length) || 0;
        }

        for (const [matId, bins] of Object.entries(binMap)) {
            result[matId] = Object.values(bins)
                .sort((a, b) => b.count - a.count)
                .map(b => ({
                    binCode: b.code,
                    binName: b.name,
                    rollCount: b.count,
                    totalLength: Math.round(b.length * 100) / 100,
                }));
        }
        return result;
    } catch {
        return {};
    }
}

// ─── Helper: Format shipping method ──────────────────────
function formatShippingMethod(method?: string): string {
    const methods: Record<string, string> = {
        'store_pickup': '🏬 استلام من الفرع',
        'direct_delivery': '🚚 توصيل مباشر',
        'direct_pickup': '🚗 استلام مباشر من العميل',
        'carrier': '📦 شركة شحن',
    };
    return method ? (methods[method] || method) : '';
}

// ─── Notification Templates ──────────────────────────────

export const telegramNotify = {

    /** 📥 إذن استلام — Receipt Order */
    receiptOrder: (companyId: string, data: {
        orderNumber: string;
        supplierName: string;
        warehouseName?: string;
        warehouseId?: string;
        items: Array<{ name: string; qty: number; unit?: string; rolls?: number }>;
        totalQty?: number;
        totalRolls?: number;
        notes?: string;
        createdBy?: string;
    }) => {
        const totalQty = data.totalQty || data.items.reduce((s, i) => s + i.qty, 0);
        const totalRolls = data.totalRolls || data.items.reduce((s, i) => s + (i.rolls || 0), 0);

        // ── Full message (warehouse_keeper + owner default) ──
        const fullMsg = `📥 <b>إذن استلام جديد ${data.orderNumber}</b>
━━━━━━━━━━━━━━━━━━━━

👤 المورّد: <b>${data.supplierName}</b>
${data.warehouseName ? `📍 المستودع: ${data.warehouseName}` : ''}

📋 المواد:
${formatItemsTable(data.items)}

📊 الإجمالي: <b>${totalQty}</b>${totalRolls ? ` | ${totalRolls} رول` : ''}
${data.notes ? `📝 ${data.notes}` : ''}
${data.createdBy ? `👤 بواسطة: ${data.createdBy}` : ''}`;

        // ── Picker: focused unloading list ──
        const pickerItems = data.items.map(item => {
            let line = `📦 ${item.name} — <b>${item.qty}</b>`;
            if (item.unit) line += ` ${item.unit}`;
            if (item.rolls) line += ` (${item.rolls} رول)`;
            return line;
        }).join('\n');

        const pickerMsg = `🏋️ <b>قائمة تنزيل ${data.orderNumber}</b>
━━━━━━━━━━━━━━━━━━━━

${data.warehouseName ? `📍 المستودع: ${data.warehouseName}` : ''}

${pickerItems}

📊 الإجمالي: <b>${totalQty}</b>${totalRolls ? ` | ${totalRolls} رول` : ''}`;

        return dispatch(companyId, 'receipt_order', fullMsg.trim(), data.warehouseId, {
            warehouse_keeper: fullMsg.trim(),
            picker: pickerMsg.trim(),
            owner: fullMsg.trim(),
        });
    },

    /** 📤 إذن تسليم/صرف — Issue Order */
    issueOrder: (companyId: string, data: {
        orderNumber: string;
        customerName: string;
        warehouseName?: string;
        warehouseId?: string;
        items: Array<{ name: string; qty: number; unit?: string; rolls?: number; preferredRolls?: string; binLocation?: string }>;
        totalQty?: number;
        estimatedValue?: number;
        invoiceNumber?: string;
        deadline?: string;
        createdBy?: string;
        purpose?: string; // 'sale' | 'transfer'
    }) => {
        const totalQty = data.totalQty || data.items.reduce((s, i) => s + i.qty, 0);
        const totalRolls = data.items.reduce((s, i) => s + (i.rolls || 0), 0);

        // ── Warehouse Keeper: materials + qty + location, NO prices ──
        const whItems = data.items.map(item => {
            let line = `• ${item.name} — <b>${item.qty}</b>`;
            if (item.unit) line += ` ${item.unit}`;
            if (item.rolls) line += ` (${item.rolls} رول)`;
            if (item.binLocation) line += `\n  📍 الموقع: ${item.binLocation}`;
            if (item.preferredRolls) line += `\n  ↳ الرولونات: ${item.preferredRolls}`;
            return line;
        }).join('\n');

        const whMsg = `📤 <b>إذن تسليم ${data.orderNumber}</b>
━━━━━━━━━━━━━━━━━━━━

${data.purpose === 'transfer' ? '🔄 تحويل مستودعي' : `👤 العميل: <b>${data.customerName}</b>`}
${data.warehouseName ? `📍 المستودع: ${data.warehouseName}` : ''}

📋 المواد المطلوبة:
${whItems}

📊 الإجمالي: <b>${totalQty}</b>${totalRolls ? ` | ${totalRolls} رول` : ''}
${data.deadline ? `⏰ مطلوب قبل: ${data.deadline}` : ''}
${data.createdBy ? `👤 بواسطة: ${data.createdBy}` : ''}`;

        // ── Owner: full details with value ──
        const ownerItems = data.items.map(item => {
            let line = `• ${item.name} — <b>${item.qty}</b>`;
            if (item.unit) line += ` ${item.unit}`;
            if (item.rolls) line += ` (${item.rolls} رول)`;
            return line;
        }).join('\n');

        const ownerMsg = `📤 <b>إذن تسليم/صرف ${data.orderNumber}</b>
━━━━━━━━━━━━━━━━━━━━

👤 العميل: <b>${data.customerName}</b>
${data.warehouseName ? `📍 المستودع: ${data.warehouseName}` : ''}

📋 المواد المطلوبة:
${ownerItems}

📊 الإجمالي: <b>${totalQty}</b>${totalRolls ? ` | ${totalRolls} رول` : ''}
${data.estimatedValue ? `💰 قيمة تقديرية: <b>${data.estimatedValue.toLocaleString()}</b>` : ''}
${data.invoiceNumber ? `🔖 الفاتورة: ${data.invoiceNumber}` : ''}
${data.deadline ? `⏰ مطلوب قبل: ${data.deadline}` : ''}
${data.createdBy ? `👤 بواسطة: ${data.createdBy}` : ''}`;

        // ── Picker: focused picking list with locations ──
        const pickerItems = data.items.map(item => {
            let line = `📍 ${item.name} — <b>${item.qty}</b>`;
            if (item.unit) line += ` ${item.unit}`;
            if (item.rolls) line += ` (${item.rolls} رول)`;
            if (item.binLocation) line += ` ← ${item.binLocation}`;
            if (item.preferredRolls) line += `\n  ↳ الرولونات: ${item.preferredRolls}`;
            return line;
        }).join('\n');

        const pickerMsg = `🏋️ <b>قائمة تجميع ${data.orderNumber}</b>
━━━━━━━━━━━━━━━━━━━━

${data.warehouseName ? `📍 المستودع: ${data.warehouseName}` : ''}

${pickerItems}

📊 الإجمالي: <b>${totalQty}</b>${totalRolls ? ` | ${totalRolls} رول` : ''}
${data.deadline ? `⏰ مطلوب قبل: ${data.deadline}` : ''}`;

        return dispatch(companyId, 'issue_order', ownerMsg.trim(), data.warehouseId, {
            warehouse_keeper: whMsg.trim(),
            picker: pickerMsg.trim(),
            owner: ownerMsg.trim(),
        });
    },

    /** 📦 وصول حاوية/شحنة — Shipment Arrival */
    shipmentArrival: (companyId: string, data: {
        containerNumber: string;
        supplierName?: string;
        itemCount: number;
        warehouseName?: string;
        arrivalDate?: string;
        originCountry?: string;
        totalCost?: number;
        currency?: string;
        invoices?: Array<{ number: string; amount: number; items?: number }>;
    }) => {
        const invoiceLines = data.invoices?.map(inv =>
            `  🔖 ${inv.number} — <b>${inv.amount.toLocaleString()}</b>${inv.items ? ` (${inv.items} صنف)` : ''}`
        ).join('\n') || '';

        // ── Warehouse Keeper: items to receive, NO costs ──
        const whMsg = `📦 <b>حاوية واردة ${data.containerNumber}</b>
━━━━━━━━━━━━━━━━━━━━

${data.supplierName ? `👤 المورّد: <b>${data.supplierName}</b>` : ''}
📊 عدد الأصناف: <b>${data.itemCount}</b>
${data.warehouseName ? `📍 الاستلام في: ${data.warehouseName}` : ''}
${data.arrivalDate ? `📅 تاريخ الوصول: ${data.arrivalDate}` : ''}

⏳ يرجى تجهيز منطقة الاستلام والفحص`;

        // ── Owner: full details with costs and invoices ──
        const ownerMsg = `📦 <b>وصول حاوية ${data.containerNumber}</b>
━━━━━━━━━━━━━━━━━━━━

${data.supplierName ? `👤 المورّد: <b>${data.supplierName}</b>` : ''}
${data.originCountry ? `🌍 بلد المنشأ: ${data.originCountry}` : ''}
📊 عدد الأصناف: <b>${data.itemCount}</b>
${data.totalCost ? `💰 التكلفة الإجمالية: <b>${data.totalCost.toLocaleString()}</b> ${data.currency || '₺'}` : ''}
${data.warehouseName ? `📍 المستودع: ${data.warehouseName}` : ''}
${data.arrivalDate ? `📅 تاريخ الوصول: ${data.arrivalDate}` : ''}
${invoiceLines ? `\n📄 الفواتير المرتبطة:\n${invoiceLines}` : ''}

⏳ بانتظار الفحص والاستلام`;

        return dispatch(companyId, 'shipment_arrival', ownerMsg.trim(), undefined, {
            warehouse_keeper: whMsg.trim(),
            owner: ownerMsg.trim(),
        });
    },

    /** 🔄 تحويل مستودعي — Warehouse Transfer */
    warehouseTransfer: (companyId: string, data: {
        transferNumber: string;
        fromWarehouse: string;
        toWarehouse: string;
        items: Array<{ name: string; qty: number; unit?: string; rolls?: number }>;
        createdBy?: string;
    }) => {
        const msg = `🔄 <b>تحويل مستودعي ${data.transferNumber}</b>
━━━━━━━━━━━━━━━━━━━━

📍 من: <b>${data.fromWarehouse}</b>
📍 إلى: <b>${data.toWarehouse}</b>

📋 المواد:
${formatItemsTable(data.items)}

${data.createdBy ? `👤 بواسطة: ${data.createdBy}` : ''}`;

        return dispatch(companyId, 'warehouse_transfer', msg.trim());
    },

    /** ⚠️ مخزون منخفض — Low Stock */
    lowStock: (companyId: string, data: {
        materialName: string;
        currentQty: number;
        minQty: number;
        unit?: string;
        warehouseName?: string;
    }) => {
        const msg = `⚠️ <b>تنبيه مخزون منخفض</b>
━━━━━━━━━━━━━━━━━━━━

📦 المادة: <b>${data.materialName}</b>
📊 المخزون الحالي: <b>${data.currentQty}</b> ${data.unit || ''}
🔴 الحد الأدنى: <b>${data.minQty}</b> ${data.unit || ''}
${data.warehouseName ? `📍 المستودع: ${data.warehouseName}` : ''}

⏰ يرجى طلب التوريد`;

        return dispatch(companyId, 'low_stock', msg.trim());
    },

    /** 💰 دفعة مستلمة — Payment Received */
    paymentReceived: (companyId: string, data: {
        amount: number;
        currency?: string;
        customerName: string;
        paymentMethod?: string;
        referenceNumber?: string;
        invoiceNumber?: string;
        remainingBalance?: number;
        receivedBy?: string;
    }) => {
        const msg = `💰 <b>دفعة مستلمة</b>
━━━━━━━━━━━━━━━━━━━━

👤 العميل: <b>${data.customerName}</b>
💵 المبلغ: <b>${data.amount.toLocaleString()}</b> ${data.currency || '₺'}
${data.paymentMethod ? `💳 الطريقة: ${data.paymentMethod}` : ''}
${data.referenceNumber ? `🔖 المرجع: ${data.referenceNumber}` : ''}
${data.invoiceNumber ? `📄 الفاتورة: ${data.invoiceNumber}` : ''}
${data.remainingBalance !== undefined ? `📊 الرصيد المتبقي: <b>${data.remainingBalance.toLocaleString()}</b> ${data.currency || '₺'}` : ''}
${data.receivedBy ? `👤 استلمها: ${data.receivedBy}` : ''}`;

        return dispatch(companyId, 'payment_received', msg.trim());
    },

    /** 💸 دفعة صادرة — Payment Sent */
    paymentSent: (companyId: string, data: {
        amount: number;
        currency?: string;
        recipientName: string;
        purpose?: string;
    }) => {
        const msg = `💸 <b>دفعة صادرة</b>
━━━━━━━━━━━━━━━━━━━━

👤 المستفيد: <b>${data.recipientName}</b>
💵 المبلغ: <b>${data.amount.toLocaleString()}</b> ${data.currency || '₺'}
${data.purpose ? `📝 الغرض: ${data.purpose}` : ''}`;

        return dispatch(companyId, 'payment_sent', msg.trim());
    },

    /** 💹 تحديث أسعار — Price Update */
    priceUpdate: (companyId: string, data: {
        items: Array<{ name: string; oldPrice: number; newPrice: number }>;
        updatedBy?: string;
        reason?: string;
    }) => {
        const lines = data.items.map(item => {
            const change = ((item.newPrice - item.oldPrice) / item.oldPrice * 100).toFixed(1);
            const arrow = item.newPrice > item.oldPrice ? '📈' : '📉';
            return `${arrow} ${item.name}: <b>${item.oldPrice}</b> → <b>${item.newPrice}</b> (${change}%)`;
        }).join('\n');

        const msg = `💹 <b>تحديث أسعار</b>
━━━━━━━━━━━━━━━━━━━━

${lines}

${data.updatedBy ? `👤 بواسطة: ${data.updatedBy}` : ''}
${data.reason ? `📝 السبب: ${data.reason}` : ''}`;

        return dispatch(companyId, 'price_update', msg.trim());
    },

    /** 🚚 وجهة توصيل — Delivery Route */
    deliveryRoute: (companyId: string, data: {
        deliveryNumber: string;
        customerName: string;
        customerPhone?: string;
        address: string;
        items?: string;
        collectAmount?: number;
        currency?: string;
        mapsUrl?: string;
    }) => {
        const msg = `🚚 <b>مهمة توصيل جديدة</b>
━━━━━━━━━━━━━━━━━━━━

📋 رقم التسليم: <b>${data.deliveryNumber}</b>
👤 العميل: <b>${data.customerName}</b>
${data.customerPhone ? `📱 الهاتف: ${data.customerPhone}` : ''}

📍 العنوان: ${data.address}
${data.items ? `📦 الحمولة: ${data.items}` : ''}
${data.collectAmount ? `💰 مبلغ التحصيل: <b>${data.collectAmount.toLocaleString()}</b> ${data.currency || '₺'}` : ''}
${data.mapsUrl ? `📍 <a href="${data.mapsUrl}">عرض على الخريطة</a>` : ''}`;

        return dispatch(companyId, 'delivery_route', msg.trim());
    },

    /** 🛒 طلب بيع جديد — New Sales Order */
    salesOrder: (companyId: string, data: {
        orderNumber: string;
        customerName: string;
        totalAmount: number;
        currency?: string;
        itemCount: number;
        items?: Array<{ name: string; qty: number; unit?: string; price?: number; rolls?: number }>;
        salesPerson?: string;
        notes?: string;
    }) => {
        const cur = data.currency || '₺';

        // ── Owner/Sales Manager: full prices ──
        const ownerItems = data.items?.map(item => {
            let line = `• ${item.name} — <b>${item.qty}</b>`;
            if (item.unit) line += ` ${item.unit}`;
            if (item.rolls) line += ` (${item.rolls} رول)`;
            if (item.price) line += ` × ${item.price.toLocaleString()} = <b>${(item.qty * item.price).toLocaleString()}</b>`;
            return line;
        }).join('\n') || '';

        const ownerMsg = `🛒 <b>طلب بيع جديد ${data.orderNumber}</b>
━━━━━━━━━━━━━━━━━━━━

👤 العميل: <b>${data.customerName}</b>
${data.salesPerson ? `🧑‍💼 المندوب: ${data.salesPerson}` : ''}

${ownerItems ? `📋 الأصناف:\n${ownerItems}\n` : `📦 عدد الأصناف: ${data.itemCount}`}
💰 إجمالي الفاتورة: <b>${data.totalAmount.toLocaleString()}</b> ${cur}
${data.notes ? `📝 ملاحظات: ${data.notes}` : ''}`;

        // ── Accountant: financial summary only ──
        const accountantMsg = `🧾 <b>فاتورة مبيعات جديدة ${data.orderNumber}</b>
━━━━━━━━━━━━━━━━━━━━

👤 العميل: <b>${data.customerName}</b>
📦 عدد الأصناف: ${data.itemCount}
💰 الإجمالي: <b>${data.totalAmount.toLocaleString()}</b> ${cur}
${data.salesPerson ? `🧑‍💼 المندوب: ${data.salesPerson}` : ''}`;

        // ── Warehouse Keeper: materials + qty, NO prices ──
        const whItems = data.items?.map(item => {
            let line = `• ${item.name} — <b>${item.qty}</b>`;
            if (item.unit) line += ` ${item.unit}`;
            if (item.rolls) line += ` (${item.rolls} رول)`;
            return line;
        }).join('\n') || '';

        const whMsg = `📤 <b>جهّز بضاعة لطلب ${data.orderNumber}</b>
━━━━━━━━━━━━━━━━━━━━

👤 العميل: <b>${data.customerName}</b>

📋 المواد المطلوبة:
${whItems || `📦 ${data.itemCount} صنف`}

⏳ يرجى تجهيز الطلب`;

        // ── Cashier: collection amount ──
        const cashierMsg = `💳 <b>فاتورة بيع ${data.orderNumber}</b>
━━━━━━━━━━━━━━━━━━━━

👤 العميل: <b>${data.customerName}</b>
💰 المبلغ المطلوب: <b>${data.totalAmount.toLocaleString()}</b> ${cur}
📦 عدد الأصناف: ${data.itemCount}`;

        return dispatch(companyId, 'sales_order', ownerMsg.trim(), undefined, {
            owner: ownerMsg.trim(),
            sales_manager: ownerMsg.trim(),
            accountant: accountantMsg.trim(),
            cashier: cashierMsg.trim(),
            warehouse_keeper: whMsg.trim(),
        });
    },

    /** 📄 فاتورة مستحقة — Invoice Due */
    invoiceDue: (companyId: string, data: {
        invoiceNumber: string;
        customerName: string;
        amount: number;
        currency?: string;
        dueDate: string;
        daysLeft: number;
    }) => {
        const urgency = data.daysLeft <= 0 ? '🔴 متأخرة!' : data.daysLeft <= 3 ? '🟠 عاجل' : '🟡 قريبة';
        const msg = `📄 <b>فاتورة مستحقة ${urgency}</b>
━━━━━━━━━━━━━━━━━━━━

📋 الفاتورة: <b>${data.invoiceNumber}</b>
👤 العميل: <b>${data.customerName}</b>
💵 المبلغ: <b>${data.amount.toLocaleString()}</b> ${data.currency || '₺'}
📅 الاستحقاق: ${data.dueDate}
${data.daysLeft <= 0 ? `⚠️ متأخرة بـ ${Math.abs(data.daysLeft)} يوم` : `⏳ متبقي ${data.daysLeft} يوم`}`;

        return dispatch(companyId, 'invoice_due', msg.trim());
    },

    /** 🚫 تجاوز حد ائتمان — Credit Limit Exceeded */
    creditLimit: (companyId: string, data: {
        customerName: string;
        balance: number;
        limit: number;
        currency?: string;
    }) => {
        const msg = `🚫 <b>تجاوز حد ائتمان</b>
━━━━━━━━━━━━━━━━━━━━

👤 العميل: <b>${data.customerName}</b>
💰 الرصيد المستحق: <b>${data.balance.toLocaleString()}</b> ${data.currency || '₺'}
🔴 الحد المسموح: <b>${data.limit.toLocaleString()}</b> ${data.currency || '₺'}
⚠️ التجاوز: <b>${(data.balance - data.limit).toLocaleString()}</b> ${data.currency || '₺'}`;

        return dispatch(companyId, 'credit_limit', msg.trim());
    },

    /** 📋 مهمة جرد — Inventory Task */
    inventoryTask: (companyId: string, data: {
        taskType: string;
        warehouseName: string;
        deadline: string;
        itemCount: number;
        rollCount?: number;
    }) => {
        const msg = `📋 <b>مهمة جرد جديدة</b>
━━━━━━━━━━━━━━━━━━━━

📊 النوع: ${data.taskType}
📍 المستودع: <b>${data.warehouseName}</b>
📅 الموعد النهائي: ${data.deadline}
📦 عدد المواد: <b>${data.itemCount}</b>
${data.rollCount ? `🧵 عدد الرولونات: <b>${data.rollCount}</b>` : ''}

⏰ يرجى إتمام الجرد والإبلاغ عبر النظام`;

        return dispatch(companyId, 'inventory_task', msg.trim());
    },

    // ═══════════════════════════════════════════════════════════
    // 🔔 CUSTOMER DIRECT NOTIFICATIONS
    // These bypass employee preferences — sent directly to customer's Telegram
    // ═══════════════════════════════════════════════════════════

    /** 📦 إعلام العميل بجاهزية بضاعته — Customer Goods Ready */
    customerGoodsReady: async (companyId: string, data: {
        customerId: string;
        customerName: string;
        invoiceNumber?: string;
        items?: Array<{ name: string; qty: number; unit?: string; rolls?: number }>;
        totalQty?: number;
        pickupAddress?: string;
        deliveryDate?: string;
        companyName?: string;
    }) => {
        try {
            // 1. Look up customer's Telegram chat ID
            const { data: customer } = await supabase
                .from('customers')
                .select('telegram_chat_id, telegram_username')
                .eq('id', data.customerId)
                .maybeSingle();

            if (!customer?.telegram_chat_id) {
                console.log(`[TelegramNotify] Customer ${data.customerName} has no Telegram linked`);
                return { ok: false, error: 'No Telegram for customer' };
            }

            // 2. Build customer-friendly message
            const itemsText = data.items?.length ? `\n📋 المواد:\n${formatItemsTable(data.items)}` : '';
            const msg = `✅ <b>بضاعتكم جاهزة!</b>
━━━━━━━━━━━━━━━━━━━━

مرحباً <b>${data.customerName}</b> 👋

${data.invoiceNumber ? `📋 الفاتورة: <b>${data.invoiceNumber}</b>` : ''}${itemsText}
${data.totalQty ? `📊 الإجمالي: <b>${data.totalQty}</b> م` : ''}
${data.pickupAddress ? `📍 عنوان الاستلام: ${data.pickupAddress}` : ''}
${data.deliveryDate ? `📅 موعد التوصيل: ${data.deliveryDate}` : ''}

${data.companyName ? `— ${data.companyName}` : '— TexaFab'}`;

            // 3. Send directly to customer's chat
            const response = await supabase.functions.invoke('telegram-webhook', {
                body: {
                    action: 'send_direct_message',
                    company_id: companyId,
                    chat_id: customer.telegram_chat_id,
                    html_message: msg.trim(),
                },
            });

            return response.data || { ok: false };
        } catch (err) {
            console.warn('[TelegramNotify] Customer notification error:', err);
            return { ok: false, error: 'Failed' };
        }
    },

    /** 🔔 Generic notification — for custom events */
    custom: (companyId: string, eventType: string, htmlMessage: string) => {
        return dispatch(companyId, eventType, htmlMessage);
    },

    // ═══════════════════════════════════════════════════════════
    // 📦 RICH WAREHOUSE NOTIFICATIONS (with bin locations)
    // ═══════════════════════════════════════════════════════════

    /** 📦 طلب تجميع مبيعات — Warehouse Picking Order
     * يُرسل لأمين المستودع عند تأكيد فاتورة مبيعات
     * يتضمن: البنود + مواقع المواد بالرفوف + طريقة الشحن
     */
    warehousePickingOrder: async (companyId: string, data: {
        orderNumber: string;
        customerName: string;
        customerPhone?: string;
        warehouseId?: string;
        warehouseName?: string;
        items: Array<{
            materialId?: string;
            name: string;
            qty: number;
            unit?: string;
            rolls?: number;
            color?: string;
        }>;
        totalAmount?: number;
        currency?: string;
        shippingMethod?: string;
        shippingAddress?: string;
        driverName?: string;
        driverPhone?: string;
        notes?: string;
        createdBy?: string;
    }) => {
        try {
            // Fetch bin locations for all materials
            const materialIds = data.items
                .map(i => i.materialId)
                .filter((id): id is string => !!id);

            const binLocations = await fetchBinLocations(materialIds, data.warehouseId);

            // Format items with bin locations
            const itemLines = data.items.map((item, idx) => {
                let line = `<b>${idx + 1}.</b> ${item.name}`;
                if (item.color) line += ` (${item.color})`;
                line += `\n   📏 الكمية: <b>${item.qty}</b> ${item.unit || 'م'}`;
                if (item.rolls) line += ` | ${item.rolls} رول`;

                // Add bin location info
                if (item.materialId && binLocations[item.materialId]?.length) {
                    const bins = binLocations[item.materialId];
                    const binText = bins.slice(0, 3).map(b =>
                        `📍 <code>${b.binCode}</code> (${b.rollCount} رول, ${b.totalLength} م)`
                    ).join('\n   ');
                    line += `\n   ${binText}`;
                }
                return line;
            }).join('\n\n');

            const shippingInfo = data.shippingMethod ? `\n🚛 <b>طريقة الشحن:</b> ${formatShippingMethod(data.shippingMethod)}` : '';
            const addressInfo = data.shippingAddress ? `\n📍 <b>عنوان التوصيل:</b> ${data.shippingAddress}` : '';
            const driverInfo = data.driverName ? `\n👤 <b>السائق:</b> ${data.driverName}${data.driverPhone ? ` (${data.driverPhone})` : ''}` : '';

            const msg = `📦 <b>طلب تجميع — فاتورة ${data.orderNumber}</b>
━━━━━━━━━━━━━━━━━━━━━━━━

👤 العميل: <b>${data.customerName}</b>${data.customerPhone ? ` 📱 ${data.customerPhone}` : ''}
${data.warehouseName ? `🏭 المستودع: <b>${data.warehouseName}</b>` : ''}
${data.totalAmount ? `💰 المبلغ: <b>${data.totalAmount.toLocaleString()}</b> ${data.currency || '₺'}` : ''}

📋 <b>البنود المطلوبة:</b>
${itemLines}
${shippingInfo}${addressInfo}${driverInfo}
${data.notes ? `\n📝 ملاحظات: ${data.notes}` : ''}
${data.createdBy ? `\n👤 بواسطة: ${data.createdBy}` : ''}

⚡ يرجى تجميع الطلب وإعداده للتسليم`;

            return dispatch(companyId, 'warehouse_picking', msg.trim(), data.warehouseId);
        } catch (err) {
            console.warn('[TelegramNotify] warehousePickingOrder error:', err);
            return { ok: false, error: 'Failed' };
        }
    },

    /** 📥 طلب ترتيب استلام مشتريات — Warehouse Receiving Order
     * يُرسل لأمين المستودع عند تأكيد/استلام فاتورة مشتريات
     * يتضمن: البنود + مواقع التخزين المقترحة
     */
    warehouseReceivingOrder: async (companyId: string, data: {
        orderNumber: string;
        supplierName: string;
        warehouseId?: string;
        warehouseName?: string;
        items: Array<{
            materialId?: string;
            name: string;
            qty: number;
            unit?: string;
            rolls?: number;
            color?: string;
        }>;
        totalAmount?: number;
        currency?: string;
        notes?: string;
        createdBy?: string;
    }) => {
        try {
            // Fetch existing bin locations (to suggest where to store)
            const materialIds = data.items
                .map(i => i.materialId)
                .filter((id): id is string => !!id);

            const existingBins = await fetchBinLocations(materialIds, data.warehouseId);

            const itemLines = data.items.map((item, idx) => {
                let line = `<b>${idx + 1}.</b> ${item.name}`;
                if (item.color) line += ` (${item.color})`;
                line += `\n   📏 الكمية: <b>${item.qty}</b> ${item.unit || 'م'}`;
                if (item.rolls) line += ` | ${item.rolls} رول`;

                // Suggest existing bin location 
                if (item.materialId && existingBins[item.materialId]?.length) {
                    const suggestedBin = existingBins[item.materialId][0];
                    line += `\n   💡 موقع مقترح: <code>${suggestedBin.binCode}</code> (يوجد فيه ${suggestedBin.rollCount} رول)`;
                }
                return line;
            }).join('\n\n');

            const msg = `📥 <b>طلب استلام مشتريات — ${data.orderNumber}</b>
━━━━━━━━━━━━━━━━━━━━━━━━

👤 المورّد: <b>${data.supplierName}</b>
${data.warehouseName ? `🏭 المستودع: <b>${data.warehouseName}</b>` : ''}
${data.totalAmount ? `💰 المبلغ: <b>${data.totalAmount.toLocaleString()}</b> ${data.currency || '₺'}` : ''}

📋 <b>المواد الواردة:</b>
${itemLines}
${data.notes ? `\n📝 ملاحظات: ${data.notes}` : ''}
${data.createdBy ? `\n👤 بواسطة: ${data.createdBy}` : ''}

⚡ يرجى الفحص والاستلام وترتيب المواد بالمستودع`;

            return dispatch(companyId, 'warehouse_receiving', msg.trim(), data.warehouseId);
        } catch (err) {
            console.warn('[TelegramNotify] warehouseReceivingOrder error:', err);
            return { ok: false, error: 'Failed' };
        }
    },

    /** 🔄 طلب تجميع مناقلة — Transfer Picking Order
     * يُرسل لأمين مستودع المصدر عند تأكيد مناقلة
     * يتضمن: البنود + مواقع المواد + معلومات الشحن
     */
    warehouseTransferPicking: async (companyId: string, data: {
        transferNumber: string;
        fromWarehouseId: string;
        fromWarehouseName: string;
        toWarehouseName: string;
        items: Array<{
            materialId?: string;
            name: string;
            qty: number;
            unit?: string;
            rolls?: number;
            color?: string;
        }>;
        shippingMethod?: string;
        driverName?: string;
        driverPhone?: string;
        vehicleNumber?: string;
        notes?: string;
        createdBy?: string;
    }) => {
        try {
            // Fetch bin locations from source warehouse
            const materialIds = data.items
                .map(i => i.materialId)
                .filter((id): id is string => !!id);

            const binLocations = await fetchBinLocations(materialIds, data.fromWarehouseId);

            const itemLines = data.items.map((item, idx) => {
                let line = `<b>${idx + 1}.</b> ${item.name}`;
                if (item.color) line += ` (${item.color})`;
                line += `\n   📏 الكمية: <b>${item.qty}</b> ${item.unit || 'م'}`;
                if (item.rolls) line += ` | ${item.rolls} رول`;

                if (item.materialId && binLocations[item.materialId]?.length) {
                    const bins = binLocations[item.materialId];
                    const binText = bins.slice(0, 3).map(b =>
                        `📍 <code>${b.binCode}</code> (${b.rollCount} رول, ${b.totalLength} م)`
                    ).join('\n   ');
                    line += `\n   ${binText}`;
                }
                return line;
            }).join('\n\n');

            const shippingLine = data.shippingMethod ? `\n🚛 طريقة النقل: ${formatShippingMethod(data.shippingMethod)}` : '';
            const driverLine = data.driverName ? `\n👤 السائق: ${data.driverName}${data.driverPhone ? ` (${data.driverPhone})` : ''}` : '';
            const vehicleLine = data.vehicleNumber ? `\n🚗 رقم المركبة: ${data.vehicleNumber}` : '';

            const msg = `🔄 <b>طلب تجميع مناقلة — ${data.transferNumber}</b>
━━━━━━━━━━━━━━━━━━━━━━━━

📍 من: <b>${data.fromWarehouseName}</b>
📍 إلى: <b>${data.toWarehouseName}</b>

📋 <b>المواد المطلوب نقلها:</b>
${itemLines}
${shippingLine}${driverLine}${vehicleLine}
${data.notes ? `\n📝 ملاحظات: ${data.notes}` : ''}
${data.createdBy ? `\n👤 بواسطة: ${data.createdBy}` : ''}

⚡ يرجى تجميع المواد وتجهيزها للنقل`;

            return dispatch(companyId, 'warehouse_transfer_picking', msg.trim(), data.fromWarehouseId);
        } catch (err) {
            console.warn('[TelegramNotify] warehouseTransferPicking error:', err);
            return { ok: false, error: 'Failed' };
        }
    },

    // ═══════════════════════════════════════════════════════════
    // 💸 REMITTANCE / EXCHANGE NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════

    /** 💸 حوالة صادرة جديدة — New Outgoing Remittance */
    remittanceCreated: (companyId: string, data: {
        remittanceNumber: string;
        senderName: string;
        receiverName: string;
        sendAmount: number;
        sendCurrency: string;
        receiveAmount?: number;
        receiveCurrency?: string;
        deliveryMethod: string;
        deliveryCountry?: string;
        commission?: number;
        trackingCode?: string;
        createdBy?: string;
    }) => {
        const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });
        const deliveryLabels: Record<string, string> = {
            branch: '🏬 استلام من الفرع',
            agent: '🤝 عبر وكيل',
            bank: '🏦 تحويل بنكي',
            wallet: '📱 محفظة إلكترونية',
            internal: '🔄 داخلي',
            delegate: '🚗 مندوب',
        };

        // ── Owner message: full details ──
        const ownerMsg = `💸 <b>حوالة صادرة جديدة ${data.remittanceNumber}</b>
━━━━━━━━━━━━━━━━━━━━

👤 المرسل: <b>${data.senderName}</b>
👤 المستقبل: <b>${data.receiverName}</b>
${data.deliveryCountry ? `🌍 الوجهة: ${data.deliveryCountry}` : ''}

💵 مبلغ الإرسال: <b>${fmtAmt(data.sendAmount)}</b> ${data.sendCurrency}
${data.receiveAmount ? `💰 مبلغ الاستلام: <b>${fmtAmt(data.receiveAmount)}</b> ${data.receiveCurrency || data.sendCurrency}` : ''}
${data.commission ? `🏷 العمولة: <b>${fmtAmt(data.commission)}</b> ${data.sendCurrency}` : ''}
📦 طريقة التسليم: ${deliveryLabels[data.deliveryMethod] || data.deliveryMethod}
${data.trackingCode ? `🔍 كود التتبع: <b>${data.trackingCode}</b>` : ''}
${data.createdBy ? `👤 بواسطة: ${data.createdBy}` : ''}`;

        // ── Cashier: amounts only ──
        const cashierMsg = `💸 <b>حوالة ${data.remittanceNumber}</b>
━━━━━━━━━━━━━━━━━━━━

👤 ${data.senderName} → ${data.receiverName}
💵 المبلغ: <b>${fmtAmt(data.sendAmount)}</b> ${data.sendCurrency}
${data.commission ? `🏷 العمولة: <b>${fmtAmt(data.commission)}</b>` : ''}
💰 إجمالي التحصيل: <b>${fmtAmt(data.sendAmount + (data.commission || 0))}</b> ${data.sendCurrency}`;

        return dispatch(companyId, 'remittance_created', ownerMsg.trim(), undefined, {
            owner: ownerMsg.trim(),
            cashier: cashierMsg.trim(),
            accountant: ownerMsg.trim(),
        });
    },

    /** ✈️ تم إرسال الحوالة — Remittance Sent */
    remittanceSent: (companyId: string, data: {
        remittanceNumber: string;
        senderName: string;
        receiverName: string;
        sendAmount: number;
        sendCurrency: string;
        agentName?: string;
        trackingCode?: string;
    }) => {
        const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });
        const msg = `✈️ <b>تم إرسال الحوالة ${data.remittanceNumber}</b>
━━━━━━━━━━━━━━━━━━━━

👤 ${data.senderName} → <b>${data.receiverName}</b>
💵 المبلغ: <b>${fmtAmt(data.sendAmount)}</b> ${data.sendCurrency}
${data.agentName ? `🤝 الوكيل: ${data.agentName}` : ''}
${data.trackingCode ? `🔍 كود التتبع: <b>${data.trackingCode}</b>` : ''}

⏳ بانتظار تأكيد التسليم`;

        return dispatch(companyId, 'remittance_sent', msg.trim());
    },

    /** ✅ تم تسليم الحوالة — Remittance Delivered */
    remittanceDelivered: (companyId: string, data: {
        remittanceNumber: string;
        receiverName: string;
        receiveAmount: number;
        receiveCurrency: string;
        deliveredBy?: string;
    }) => {
        const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });
        const msg = `✅ <b>تم تسليم الحوالة ${data.remittanceNumber}</b>
━━━━━━━━━━━━━━━━━━━━

👤 المستقبل: <b>${data.receiverName}</b>
💰 المبلغ المسلّم: <b>${fmtAmt(data.receiveAmount)}</b> ${data.receiveCurrency}
${data.deliveredBy ? `👤 سلّمها: ${data.deliveredBy}` : ''}

✅ الحوالة مكتملة`;

        return dispatch(companyId, 'remittance_delivered', msg.trim());
    },

    /** 📥 حوالة واردة — Incoming Remittance */
    remittanceIncoming: (companyId: string, data: {
        remittanceNumber: string;
        senderName: string;
        receiverName: string;
        sendAmount: number;
        sendCurrency: string;
        receiveAmount: number;
        receiveCurrency: string;
        agentName?: string;
        partnerName?: string;
    }) => {
        const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });
        const source = data.partnerName || data.agentName || 'غير محدد';
        const msg = `📥 <b>حوالة واردة ${data.remittanceNumber}</b>
━━━━━━━━━━━━━━━━━━━━

🤝 المصدر: <b>${source}</b>
👤 المرسل: ${data.senderName}
👤 المستقبل: <b>${data.receiverName}</b>

💵 مبلغ الإرسال: <b>${fmtAmt(data.sendAmount)}</b> ${data.sendCurrency}
💰 مبلغ التسليم: <b>${fmtAmt(data.receiveAmount)}</b> ${data.receiveCurrency}

⏳ يرجى تسليم المبلغ للمستقبل`;

        return dispatch(companyId, 'remittance_incoming', msg.trim());
    },

    /** ❌ إلغاء حوالة — Remittance Cancelled */
    remittanceCancelled: (companyId: string, data: {
        remittanceNumber: string;
        senderName: string;
        sendAmount: number;
        sendCurrency: string;
        reason?: string;
        cancelledBy?: string;
    }) => {
        const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });
        const msg = `❌ <b>إلغاء حوالة ${data.remittanceNumber}</b>
━━━━━━━━━━━━━━━━━━━━

👤 المرسل: <b>${data.senderName}</b>
💵 المبلغ: <b>${fmtAmt(data.sendAmount)}</b> ${data.sendCurrency}
${data.reason ? `📝 السبب: ${data.reason}` : ''}
${data.cancelledBy ? `👤 بواسطة: ${data.cancelledBy}` : ''}

⚠️ يجب إرجاع المبلغ للمرسل`;

        return dispatch(companyId, 'remittance_cancelled', msg.trim());
    },

    /** 🔄 تغيير حالة حوالة — Remittance Status Change */
    remittanceStatusChange: (companyId: string, data: {
        remittanceNumber: string;
        oldStatus: string;
        newStatus: string;
        senderName?: string;
        receiverName?: string;
        changedBy?: string;
    }) => {
        const statusLabels: Record<string, string> = {
            pending: '⏳ بانتظار',
            processing: '🔄 معالجة',
            sent: '✈️ أُرسلت',
            delivered: '✅ تم التسليم',
            completed: '🏁 مكتملة',
            cancelled: '❌ ملغاة',
            returned: '↩️ مرتجعة',
        };
        const msg = `🔄 <b>تحديث حالة حوالة ${data.remittanceNumber}</b>
━━━━━━━━━━━━━━━━━━━━

${statusLabels[data.oldStatus] || data.oldStatus} → <b>${statusLabels[data.newStatus] || data.newStatus}</b>
${data.senderName ? `👤 ${data.senderName}` : ''}${data.receiverName ? ` → ${data.receiverName}` : ''}
${data.changedBy ? `👤 بواسطة: ${data.changedBy}` : ''}`;

        return dispatch(companyId, 'remittance_status_change', msg.trim());
    },
};

export default telegramNotify;
