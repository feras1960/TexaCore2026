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

// ─── Core Dispatch Function ──────────────────────────────
async function dispatch(companyId: string, eventType: string, htmlMessage: string) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { ok: false, error: 'Not authenticated' };

        const response = await supabase.functions.invoke('telegram-webhook', {
            body: {
                action: 'dispatch_notification',
                company_id: companyId,
                event_type: eventType,
                html_message: htmlMessage,
            },
        });

        if (response.error) {
            console.warn(`[TelegramNotify] ${eventType} failed:`, response.error);
            return { ok: false, error: response.error.message };
        }

        const result = response.data;
        if (result?.sent > 0) {
            console.log(`[TelegramNotify] ${eventType}: sent=${result.sent}, skipped=${result.skipped}`);
        }
        return result;
    } catch (err) {
        console.warn('[TelegramNotify] Error:', err);
        return { ok: false, error: 'Network error' };
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

// ─── Notification Templates ──────────────────────────────

export const telegramNotify = {

    /** 📥 إذن استلام — Receipt Order */
    receiptOrder: (companyId: string, data: {
        orderNumber: string;
        supplierName: string;
        warehouseName?: string;
        items: Array<{ name: string; qty: number; unit?: string; rolls?: number }>;
        totalQty?: number;
        totalRolls?: number;
        notes?: string;
        createdBy?: string;
    }) => {
        const totalQty = data.totalQty || data.items.reduce((s, i) => s + i.qty, 0);
        const totalRolls = data.totalRolls || data.items.reduce((s, i) => s + (i.rolls || 0), 0);
        const msg = `📥 <b>إذن استلام جديد ${data.orderNumber}</b>
━━━━━━━━━━━━━━━━━━━━

👤 المورّد: <b>${data.supplierName}</b>
${data.warehouseName ? `📍 المستودع: ${data.warehouseName}` : ''}

📋 المواد:
${formatItemsTable(data.items)}

📊 الإجمالي: <b>${totalQty}</b>${totalRolls ? ` | ${totalRolls} رول` : ''}
${data.notes ? `📝 ${data.notes}` : ''}
${data.createdBy ? `👤 بواسطة: ${data.createdBy}` : ''}`;

        return dispatch(companyId, 'receipt_order', msg.trim());
    },

    /** 📤 إذن تسليم/صرف — Issue Order */
    issueOrder: (companyId: string, data: {
        orderNumber: string;
        customerName: string;
        warehouseName?: string;
        items: Array<{ name: string; qty: number; unit?: string; rolls?: number; preferredRolls?: string }>;
        totalQty?: number;
        estimatedValue?: number;
        invoiceNumber?: string;
        deadline?: string;
        createdBy?: string;
    }) => {
        const totalQty = data.totalQty || data.items.reduce((s, i) => s + i.qty, 0);
        const itemLines = data.items.map(item => {
            let line = `• ${item.name} — <b>${item.qty}</b>`;
            if (item.unit) line += ` ${item.unit}`;
            if (item.rolls) line += ` (${item.rolls} رول)`;
            if (item.preferredRolls) line += `\n  ↳ الرولونات: ${item.preferredRolls}`;
            return line;
        }).join('\n');

        const msg = `📤 <b>إذن تسليم/صرف ${data.orderNumber}</b>
━━━━━━━━━━━━━━━━━━━━

👤 العميل: <b>${data.customerName}</b>
${data.warehouseName ? `📍 المستودع: ${data.warehouseName}` : ''}

📋 المواد المطلوبة:
${itemLines}

📊 الإجمالي: <b>${totalQty}</b>
${data.estimatedValue ? `💰 قيمة تقديرية: <b>${data.estimatedValue.toLocaleString()}</b>` : ''}
${data.invoiceNumber ? `🔖 الفاتورة: ${data.invoiceNumber}` : ''}
${data.deadline ? `⏰ مطلوب قبل: ${data.deadline}` : ''}
${data.createdBy ? `👤 بواسطة: ${data.createdBy}` : ''}`;

        return dispatch(companyId, 'issue_order', msg.trim());
    },

    /** 📦 وصول حاوية/شحنة — Shipment Arrival */
    shipmentArrival: (companyId: string, data: {
        containerNumber: string;
        supplierName?: string;
        itemCount: number;
        warehouseName?: string;
        arrivalDate?: string;
    }) => {
        const msg = `📦 <b>وصول حاوية ${data.containerNumber}</b>
━━━━━━━━━━━━━━━━━━━━

${data.supplierName ? `👤 المورّد: <b>${data.supplierName}</b>` : ''}
📊 عدد الأصناف: <b>${data.itemCount}</b>
${data.warehouseName ? `📍 المستودع: ${data.warehouseName}` : ''}
${data.arrivalDate ? `📅 تاريخ الوصول: ${data.arrivalDate}` : ''}

⏳ بانتظار الفحص والاستلام`;

        return dispatch(companyId, 'shipment_arrival', msg.trim());
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
    }) => {
        const msg = `💰 <b>دفعة مستلمة</b>
━━━━━━━━━━━━━━━━━━━━

👤 العميل: <b>${data.customerName}</b>
💵 المبلغ: <b>${data.amount.toLocaleString()}</b> ${data.currency || '₺'}
${data.paymentMethod ? `💳 الطريقة: ${data.paymentMethod}` : ''}
${data.referenceNumber ? `🔖 المرجع: ${data.referenceNumber}` : ''}`;

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
    }) => {
        const msg = `🛒 <b>طلب بيع جديد ${data.orderNumber}</b>
━━━━━━━━━━━━━━━━━━━━

👤 العميل: <b>${data.customerName}</b>
📦 عدد الأصناف: ${data.itemCount}
💰 الإجمالي: <b>${data.totalAmount.toLocaleString()}</b> ${data.currency || '₺'}`;

        return dispatch(companyId, 'sales_order', msg.trim());
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
};

export default telegramNotify;

