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
async function dispatch(companyId: string, eventType: string, htmlMessage: string, targetWarehouseId?: string) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { ok: false, error: 'Not authenticated' };

        const response = await supabase.functions.invoke('telegram-webhook', {
            body: {
                action: 'dispatch_notification',
                company_id: companyId,
                event_type: eventType,
                html_message: htmlMessage,
                ...(targetWarehouseId ? { target_warehouse_id: targetWarehouseId } : {}),
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
        const msg = `📥 <b>إذن استلام جديد ${data.orderNumber}</b>
━━━━━━━━━━━━━━━━━━━━

👤 المورّد: <b>${data.supplierName}</b>
${data.warehouseName ? `📍 المستودع: ${data.warehouseName}` : ''}

📋 المواد:
${formatItemsTable(data.items)}

📊 الإجمالي: <b>${totalQty}</b>${totalRolls ? ` | ${totalRolls} رول` : ''}
${data.notes ? `📝 ${data.notes}` : ''}
${data.createdBy ? `👤 بواسطة: ${data.createdBy}` : ''}`;

        return dispatch(companyId, 'receipt_order', msg.trim(), data.warehouseId);
    },

    /** 📤 إذن تسليم/صرف — Issue Order */
    issueOrder: (companyId: string, data: {
        orderNumber: string;
        customerName: string;
        warehouseName?: string;
        warehouseId?: string;
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

        return dispatch(companyId, 'issue_order', msg.trim(), data.warehouseId);
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
};

export default telegramNotify;
