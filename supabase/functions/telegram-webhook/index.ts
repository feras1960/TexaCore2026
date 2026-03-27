import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

// ═══════════════════════════════════════════════════════════════
// 📱 Telegram Webhook — NexaPro Agent
// ═══════════════════════════════════════════════════════════════
// Handles:
// 1. Verification codes → link Telegram user to system user
// 2. Text commands → process quick actions (payments, receipts)
// 3. Group messages → respond when mentioned
// 4. Callback queries → inline button responses
// ═══════════════════════════════════════════════════════════════

const TELEGRAM_API = 'https://api.telegram.org/bot'

// ─── Telegram API helper ────────────────────────────────────
async function sendTelegram(botToken: string, method: string, body: any) {
    const res = await fetch(`${TELEGRAM_API}${botToken}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    return res.json()
}

async function sendMessage(botToken: string, chatId: number, text: string, options: any = {}) {
    return sendTelegram(botToken, 'sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options,
    })
}

// ─── Get bot token from company integrations ────────────────
async function getBotConfig(supabase: any, companyId?: string) {
    if (companyId) {
        const { data } = await supabase
            .from('companies')
            .select('id, integrations, tenant_id')
            .eq('id', companyId)
            .single()
        if (data?.integrations?.telegram?.bot_token) {
            return {
                botToken: data.integrations.telegram.bot_token,
                companyId: data.id,
                tenantId: data.tenant_id,
                webhookSecret: data.integrations.telegram.webhook_secret,
            }
        }
    }
    return null
}

// ─── Find company by bot token ──────────────────────────────
async function findCompanyByBotToken(supabase: any, botToken: string) {
    // Search in companies integrations JSONB
    const { data } = await supabase
        .from('companies')
        .select('id, tenant_id, integrations')

    if (data) {
        for (const company of data) {
            if (company.integrations?.telegram?.bot_token === botToken) {
                return {
                    companyId: company.id,
                    tenantId: company.tenant_id,
                }
            }
        }
    }
    return null
}

// ─── Find linked user by chat_id ────────────────────────────
async function findLinkedUser(supabase: any, chatId: number, companyId: string) {
    const { data } = await supabase
        .from('telegram_connections')
        .select('id, user_id, telegram_username, is_active, notification_preferences, notification_role')
        .eq('telegram_chat_id', chatId)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single()
    return data
}

// ─── Handle verification code ───────────────────────────────
async function handleVerification(supabase: any, chatId: number, code: string, username: string, firstName: string, botToken: string) {
    // Find pending verification
    const { data: conn } = await supabase
        .from('telegram_connections')
        .select('id, company_id, tenant_id')
        .eq('verification_code', code.toUpperCase())
        .eq('is_active', false)
        .single()

    if (!conn) {
        await sendMessage(botToken, chatId, '❌ رمز التحقق غير صحيح أو منتهي الصلاحية.\n\n<i>Invalid or expired verification code.</i>')
        return
    }

    // Link the user
    const { error } = await supabase
        .from('telegram_connections')
        .update({
            telegram_chat_id: chatId,
            telegram_username: username,
            telegram_first_name: firstName,
            is_active: true,
            verified_at: new Date().toISOString(),
            verification_code: null,
        })
        .eq('id', conn.id)

    if (error) {
        console.error('Verification error:', error)
        await sendMessage(botToken, chatId, '❌ حدث خطأ. حاول مرة أخرى.')
        return
    }

    await sendMessage(botToken, chatId,
        `✅ <b>تم الربط بنجاح!</b>\n\n` +
        `مرحباً <b>${firstName}</b> 👋\n` +
        `تم ربط حسابك بنظام TexaCore.\n\n` +
        `يمكنك الآن:\n` +
        `• إرسال أوامر سريعة\n` +
        `• استقبال الإشعارات\n` +
        `• التفاعل مع وكيل نيكسا برو\n\n` +
        `اكتب <b>/help</b> لمعرفة الأوامر المتاحة.`
    )
}

// ─── Handle /start command ──────────────────────────────────
async function handleStart(botToken: string, chatId: number, firstName: string, startPayload?: string) {
    if (startPayload) {
        // User clicked a deep link with verification code
        // Format: /start verify_CODE
        if (startPayload.startsWith('verify_')) {
            const code = startPayload.replace('verify_', '')
            // Will be handled by verification flow
            return code
        }
    }

    await sendMessage(botToken, chatId,
        `🤖 <b>مرحباً ${firstName}!</b>\n\n` +
        `أنا وكيل <b>نيكسا برو</b> — مساعدك الذكي في نظام TexaCore ERP.\n\n` +
        `<b>للبدء:</b>\n` +
        `1️⃣ اطلب رمز التحقق من مدير النظام\n` +
        `2️⃣ أرسل الرمز هنا للربط\n\n` +
        `<b>الأوامر المتاحة:</b>\n` +
        `/help — عرض المساعدة\n` +
        `/status — حالة الحساب\n\n` +
        `<i>NexaPro Agent — powered by TexaCore ERP</i>`
    )
    return null
}

// ─── Handle /help command ───────────────────────────────────
async function handleHelp(botToken: string, chatId: number, isLinked: boolean) {
    if (!isLinked) {
        await sendMessage(botToken, chatId,
            `📋 <b>المساعدة</b>\n\n` +
            `حسابك غير مربوط بعد.\n` +
            `أرسل رمز التحقق لربط حسابك.\n\n` +
            `<i>Your account is not linked yet. Send verification code to link.</i>`
        )
        return
    }

    await sendMessage(botToken, chatId,
        `📋 <b>أوامر وكيل نيكسا برو</b>\n\n` +
        `<b>💰 المالية:</b>\n` +
        `• <code>استلمت 5000 من أحمد</code> — تسجيل دفعة مقبوضة\n` +
        `• <code>دفعت 2000 كهرباء</code> — تسجيل مصروف\n` +
        `• <code>سلفة 500 لمحمد</code> — سلفة راتب\n\n` +
        `<b>📊 الاستعلامات:</b>\n` +
        `• <code>رصيد أحمد</code> — رصيد عميل\n` +
        `• <code>مبيعات اليوم</code> — ملخص المبيعات\n` +
        `• <code>المخزون</code> — حالة المخزون\n\n` +
        `<b>⚙️ النظام:</b>\n` +
        `/status — حالة الحساب\n` +
        `/help — هذه الرسالة\n\n` +
        `<i>كل الإجراءات تحتاج تأكيد قبل التنفيذ.</i>`
    )
}

// ─── Parse quick action from message ────────────────────────
function parseQuickAction(text: string): { type: string; data: any } | null {
    const t = text.trim()

    // Pattern: استلمت/قبضت [مبلغ] من [اسم]
    const receivePatterns = [
        /(?:استلمت|قبضت|وصلني)\s+(\d+(?:\.\d+)?)\s+(?:من|from)\s+(.+)/i,
        /(?:received|got)\s+(\d+(?:\.\d+)?)\s+(?:from)\s+(.+)/i,
    ]
    for (const pattern of receivePatterns) {
        const match = t.match(pattern)
        if (match) {
            return {
                type: 'payment_received',
                data: { amount: parseFloat(match[1]), from_name: match[2].trim() }
            }
        }
    }

    // Pattern: دفعت [مبلغ] [وصف/لـ]
    const payPatterns = [
        /(?:دفعت|صرفت|حولت)\s+(\d+(?:\.\d+)?)\s+(?:لـ?|على|إلى|ل)\s*(.+)/i,
        /(?:دفعت|صرفت)\s+(\d+(?:\.\d+)?)\s+(.+)/i,
        /(?:paid|sent)\s+(\d+(?:\.\d+)?)\s+(?:to|for)\s+(.+)/i,
    ]
    for (const pattern of payPatterns) {
        const match = t.match(pattern)
        if (match) {
            return {
                type: 'payment_made',
                data: { amount: parseFloat(match[1]), to_name: match[2].trim() }
            }
        }
    }

    // Pattern: مصروف [مبلغ] [وصف]
    const expensePatterns = [
        /(?:مصروف|مصاريف)\s+(\d+(?:\.\d+)?)\s+(.+)/i,
        /(?:expense)\s+(\d+(?:\.\d+)?)\s+(.+)/i,
    ]
    for (const pattern of expensePatterns) {
        const match = t.match(pattern)
        if (match) {
            return {
                type: 'expense',
                data: { amount: parseFloat(match[1]), description: match[2].trim() }
            }
        }
    }

    // Pattern: سلفة [مبلغ] لـ [اسم]
    const advancePatterns = [
        /(?:سلفة|سلف)\s+(\d+(?:\.\d+)?)\s+(?:لـ?|ل)\s*(.+)/i,
        /(?:advance)\s+(\d+(?:\.\d+)?)\s+(?:to|for)\s+(.+)/i,
    ]
    for (const pattern of advancePatterns) {
        const match = t.match(pattern)
        if (match) {
            return {
                type: 'salary_advance',
                data: { amount: parseFloat(match[1]), employee_name: match[2].trim() }
            }
        }
    }

    return null
}

// ─── Format action confirmation message ─────────────────────
function formatActionConfirmation(actionType: string, data: any): string {
    switch (actionType) {
        case 'payment_received':
            return `💰 <b>دفعة مقبوضة</b>\n\n` +
                `المبلغ: <b>${data.amount}</b>\n` +
                `من: <b>${data.from_name}</b>\n\n` +
                `هل تريد تأكيد هذا الإجراء؟`
        case 'payment_made':
            return `💸 <b>دفعة مدفوعة</b>\n\n` +
                `المبلغ: <b>${data.amount}</b>\n` +
                `إلى: <b>${data.to_name}</b>\n\n` +
                `هل تريد تأكيد هذا الإجراء؟`
        case 'expense':
            return `🧾 <b>مصروف</b>\n\n` +
                `المبلغ: <b>${data.amount}</b>\n` +
                `الوصف: <b>${data.description}</b>\n\n` +
                `هل تريد تأكيد هذا الإجراء؟`
        case 'salary_advance':
            return `👤 <b>سلفة راتب</b>\n\n` +
                `المبلغ: <b>${data.amount}</b>\n` +
                `الموظف: <b>${data.employee_name}</b>\n\n` +
                `هل تريد تأكيد هذا الإجراء؟`
        default:
            return `📋 <b>إجراء جديد</b>\n\n${JSON.stringify(data, null, 2)}`
    }
}

// ─── Create pending action ──────────────────────────────────
async function createPendingAction(
    supabase: any,
    companyId: string,
    tenantId: string,
    userId: string | null,
    telegramId: number,
    actionType: string,
    actionData: any,
    originalMessage: string
) {
    const { data, error } = await supabase
        .from('pending_actions')
        .insert({
            company_id: companyId,
            tenant_id: tenantId,
            created_by_user_id: userId,
            created_by_telegram_id: telegramId,
            action_type: actionType,
            action_data: actionData,
            original_message: originalMessage,
            status: 'pending',
        })
        .select('id')
        .single()

    if (error) {
        console.error('Create action error:', error)
        return null
    }
    return data
}

// ─── Handle callback query (button press) ───────────────────
async function handleCallbackQuery(supabase: any, botToken: string, callbackQuery: any) {
    const data = callbackQuery.data
    const chatId = callbackQuery.message.chat.id
    const messageId = callbackQuery.message.message_id

    // Parse callback: confirm_ACTION_ID or reject_ACTION_ID
    if (data.startsWith('confirm_')) {
        const actionId = data.replace('confirm_', '')

        const { error } = await supabase
            .from('pending_actions')
            .update({
                status: 'confirmed',
                confirmed_at: new Date().toISOString(),
                confirmed_via: 'telegram',
            })
            .eq('id', actionId)

        if (error) {
            await sendTelegram(botToken, 'answerCallbackQuery', {
                callback_query_id: callbackQuery.id,
                text: '❌ خطأ في التأكيد',
            })
            return
        }

        // Edit the message to show confirmed
        await sendTelegram(botToken, 'editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: callbackQuery.message.text + '\n\n✅ <b>تم التأكيد</b> — سيتم إضافته للمسودة اليومية.',
            parse_mode: 'HTML',
        })

        await sendTelegram(botToken, 'answerCallbackQuery', {
            callback_query_id: callbackQuery.id,
            text: '✅ تم التأكيد!',
        })

    } else if (data.startsWith('reject_')) {
        const actionId = data.replace('reject_', '')

        await supabase
            .from('pending_actions')
            .update({
                status: 'rejected',
                rejection_reason: 'Rejected via Telegram',
            })
            .eq('id', actionId)

        await sendTelegram(botToken, 'editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: callbackQuery.message.text + '\n\n❌ <b>تم الرفض</b>',
            parse_mode: 'HTML',
        })

        await sendTelegram(botToken, 'answerCallbackQuery', {
            callback_query_id: callbackQuery.id,
            text: '❌ تم الرفض',
        })
    }
}

// ═══════════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════════

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function corsResponse(body: any, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

        if (!serviceRoleKey) {
            return corsResponse({ error: 'Service role key missing' }, 500)
        }

        // Service-role client (full access)
        const supabase = createClient(supabaseUrl, serviceRoleKey)

        const body = await req.json()
        console.log('[TelegramWebhook] Received:', JSON.stringify(body).substring(0, 500))

        // ─── Webhook verification from settings UI ──────────
        if (body.action === 'verify_webhook') {
            return corsResponse({ ok: true, message: 'Webhook active' })
        }

        // ─── Send notification from web app ─────────────────
        if (body.action === 'send_notification') {
            const { company_id, chat_id, message } = body
            if (!company_id || !chat_id || !message) {
                return corsResponse({ ok: false, error: 'Missing params' })
            }
            const notifConfig = await getBotConfig(supabase, company_id)
            if (!notifConfig) {
                return corsResponse({ ok: false, error: 'Bot not configured' })
            }
            const result = await sendMessage(notifConfig.botToken, chat_id, message)
            return corsResponse({ ok: result.ok })
        }

        // ─── Send bulk notification ─────────────────────────
        if (body.action === 'send_bulk_notification') {
            const { company_id, message: bulkMessage, target_type } = body
            if (!company_id || !bulkMessage) {
                return corsResponse({ ok: false, error: 'Missing params' })
            }
            const bulkConfig = await getBotConfig(supabase, company_id)
            if (!bulkConfig) {
                return corsResponse({ ok: false, error: 'Bot not configured' })
            }

            // Get all active connections
            let connQuery = supabase
                .from('telegram_connections')
                .select('telegram_chat_id, connection_type')
                .eq('company_id', company_id)
                .eq('is_active', true)

            if (target_type === 'private') {
                connQuery = connQuery.eq('connection_type', 'private')
            } else if (target_type === 'group') {
                connQuery = connQuery.neq('connection_type', 'private')
            }

            const { data: conns } = await connQuery
            let sentCount = 0
            if (conns) {
                for (const conn of conns) {
                    const r = await sendMessage(bulkConfig.botToken, conn.telegram_chat_id, bulkMessage)
                    if (r.ok) sentCount++
                }
            }
            return corsResponse({ ok: true, sent: sentCount })
        }

        // ─── Dispatch notification by event type ────────────
        if (body.action === 'dispatch_notification') {
            const { company_id, event_type, message: notifMessage, html_message } = body
            if (!company_id || !event_type || (!notifMessage && !html_message)) {
                return corsResponse({ ok: false, error: 'Missing: company_id, event_type, message' })
            }
            const dispatchConfig = await getBotConfig(supabase, company_id)
            if (!dispatchConfig) {
                return corsResponse({ ok: false, error: 'Bot not configured' })
            }

            // ═══ Layer 1: Company-level settings ═══
            // Check companies.settings.notification_preferences for document-type toggles
            const { data: companyRow } = await supabase
                .from('companies')
                .select('settings')
                .eq('id', company_id)
                .maybeSingle()

            const companyPrefs = (companyRow?.settings as any)?.notification_preferences || {}

            // Map event_type → company setting keys
            // An event is blocked if ALL its mapped company keys are explicitly false
            const EVENT_TO_COMPANY_KEYS: Record<string, string[]> = {
                // Sales
                'issue_order': ['sales_notify_warehouse'],
                'sales_order': ['sales_notify_owner', 'sales_notify_accountant'],
                // Purchases
                'receipt_order': ['purchase_notify_warehouse'],
                // Containers
                'shipment_arrival': ['container_notify_warehouse', 'container_notify_owner'],
                // Transfers
                'warehouse_transfer': ['transfer_notify_from_wh', 'transfer_notify_to_wh'],
                // Finance
                'payment_received': ['finance_notify_accountant', 'finance_notify_owner'],
                'payment_sent': ['finance_notify_accountant'],
                'invoice_due': ['finance_notify_accountant', 'finance_notify_owner'],
                'credit_limit': ['finance_notify_owner', 'finance_notify_sales'],
                'price_update': ['finance_notify_sales'],
                // Inventory
                'low_stock': ['stock_notify_warehouse', 'stock_notify_owner'],
                'inventory_task': ['stock_notify_warehouse'],
                // Delivery
                'delivery_route': ['delivery_notify_driver'],
            }

            const companyKeys = EVENT_TO_COMPANY_KEYS[event_type] || []
            if (companyKeys.length > 0) {
                // If ALL mapped company keys are explicitly false → skip entirely
                const allDisabled = companyKeys.every(k => companyPrefs[k] === false)
                if (allDisabled) {
                    console.log(`[Dispatch] ${event_type}: BLOCKED by company settings (${companyKeys.join(',')})`)
                    return corsResponse({ ok: true, event_type, sent: 0, skipped: 0, blocked_by: 'company_settings' })
                }
            }

            // ═══ Layer 2 + 3: Role-based routing + Per-user preferences ═══
            const { data: activeConns } = await supabase
                .from('telegram_connections')
                .select('telegram_chat_id, notification_preferences, notification_role, assigned_warehouses')
                .eq('company_id', company_id)
                .eq('is_active', true)
                .eq('connection_type', 'private')

            // Map event_type → which roles should receive it
            const EVENT_TO_ROLES: Record<string, string[]> = {
                'receipt_order': ['warehouse_keeper', 'picker', 'owner'],
                'issue_order': ['warehouse_keeper', 'picker', 'owner'],
                'shipment_arrival': ['warehouse_keeper', 'owner'],
                'warehouse_transfer': ['warehouse_keeper', 'picker', 'owner'],
                'low_stock': ['warehouse_keeper', 'owner'],
                'inventory_task': ['warehouse_keeper', 'picker'],
                'payment_received': ['accountant', 'cashier', 'owner'],
                'payment_sent': ['accountant', 'cashier', 'owner'],
                'invoice_due': ['accountant', 'owner'],
                'credit_limit': ['owner', 'sales_manager'],
                'price_update': ['sales_manager', 'owner'],
                'sales_order': ['owner', 'sales_manager', 'accountant', 'cashier'],
                'delivery_route': ['driver'],
            }

            // Optional: target a specific warehouse (passed from the caller)
            const targetWarehouseId = body.target_warehouse_id || null

            const targetRoles = EVENT_TO_ROLES[event_type] || []

            let sentCount = 0
            let skippedCount = 0

            // ═══ Layer 4: Role-based message content ═══
            // role_messages: { warehouse_keeper: "...", owner: "...", accountant: "...", driver: "..." }
            const roleMessages = body.role_messages || {}
            const defaultMsg = html_message || notifMessage

            if (activeConns) {
                for (const conn of activeConns) {
                    // Layer 2a: Role-based filter (if roles are defined)
                    if (targetRoles.length > 0 && conn.notification_role) {
                        if (!targetRoles.includes(conn.notification_role)) {
                            skippedCount++
                            continue
                        }
                    }

                    // Layer 2b: Warehouse-specific filter (applies to warehouse_keeper and picker)
                    if (targetWarehouseId && (conn.notification_role === 'warehouse_keeper' || conn.notification_role === 'picker')) {
                        const assignedWhs = conn.assigned_warehouses || []
                        if (assignedWhs.length > 0 && !assignedWhs.includes(targetWarehouseId)) {
                            skippedCount++
                            continue
                        }
                    }

                    // Layer 3: Per-user opt-out preferences
                    const prefs = conn.notification_preferences || {}
                    if (prefs[event_type] === false) {
                        skippedCount++
                        continue
                    }

                    // Layer 4: Pick role-specific message or fallback to default
                    const role = conn.notification_role || ''
                    const msgToSend = roleMessages[role] || defaultMsg
                    const r = await sendMessage(dispatchConfig.botToken, conn.telegram_chat_id, msgToSend)
                    if (r.ok) sentCount++
                }
            }

            console.log(`[Dispatch] ${event_type}: sent=${sentCount}, skipped=${skippedCount}`)
            return corsResponse({ ok: true, event_type, sent: sentCount, skipped: skippedCount })
        }

        // ─── Send direct message to specific chat ───────────
        if (body.action === 'send_direct_message') {
            const { company_id, chat_id, message: directMsg, html_message } = body
            if (!company_id || !chat_id || (!directMsg && !html_message)) {
                return corsResponse({ ok: false, error: 'Missing: company_id, chat_id, message' })
            }
            const directConfig = await getBotConfig(supabase, company_id)
            if (!directConfig) {
                return corsResponse({ ok: false, error: 'Bot not configured' })
            }

            const msgToSend = html_message || directMsg
            const r = await sendMessage(directConfig.botToken, chat_id, msgToSend)
            console.log(`[DirectMsg] chat=${chat_id}: ${r.ok ? 'sent' : 'failed'}`)
            return corsResponse({ ok: r.ok, chat_id })
        }

        // ─── Bot token from URL parameter or body ───────────
        const url = new URL(req.url)
        const botTokenParam = url.searchParams.get('bot_token') || body.bot_token || ''

        // ─── Handle Telegram Update ─────────────────────────
        const update = body

        // Find company by bot token (or from the webhook URL setup)
        let companyId = url.searchParams.get('company_id') || ''
        let tenantId = ''

        if (companyId) {
            const config = await getBotConfig(supabase, companyId)
            if (config) {
                tenantId = config.tenantId
            }
        } else if (botTokenParam) {
            const company = await findCompanyByBotToken(supabase, botTokenParam)
            if (company) {
                companyId = company.companyId
                tenantId = company.tenantId
            }
        }

        // Try to find company from the actual integrations data if we still don't have it
        if (!companyId) {
            // Get all companies with telegram integration
            const { data: companies } = await supabase
                .from('companies')
                .select('id, tenant_id, integrations')

            if (companies) {
                for (const c of companies) {
                    if (c.integrations?.telegram?.webhook_active) {
                        companyId = c.id
                        tenantId = c.tenant_id
                        break
                    }
                }
            }
        }

        if (!companyId) {
            console.error('[TelegramWebhook] No company found for this bot')
            return corsResponse({ ok: true })
        }

        // Get bot token from company settings
        const config = await getBotConfig(supabase, companyId)
        if (!config) {
            console.error('[TelegramWebhook] No bot config for company:', companyId)
            return corsResponse({ ok: true })
        }
        const botToken = config.botToken

        // ─── Handle Callback Query (button press) ───────────
        if (update.callback_query) {
            await handleCallbackQuery(supabase, botToken, update.callback_query)
            return corsResponse({ ok: true })
        }

        // ─── Handle Message ─────────────────────────────────
        const message = update.message
        if (!message || !message.text) {
            return corsResponse({ ok: true })
        }

        const chatId = message.chat.id
        const text = message.text.trim()
        const username = message.from?.username || ''
        const firstName = message.from?.first_name || ''
        const chatType = message.chat.type // 'private', 'group', 'supergroup'

        console.log(`[TelegramWebhook] Chat ${chatId} (${chatType}): ${text}`)

        // ─── Groups: only respond when mentioned ────────────
        if (chatType !== 'private') {
            // In groups, only respond to commands or @mentions
            const botUsername = config.botToken ? '' : '' // We'd need to fetch this
            if (!text.startsWith('/') && !text.includes(`@${botUsername}`)) {
                return corsResponse({ ok: true })
            }
        }

        // ─── /start command ─────────────────────────────────
        if (text.startsWith('/start')) {
            const payload = text.split(' ')[1] || ''
            const verificationCode = await handleStart(botToken, chatId, firstName, payload)
            if (verificationCode) {
                await handleVerification(supabase, chatId, verificationCode, username, firstName, botToken)
            }
            return corsResponse({ ok: true })
        }

        // ─── Check if user is linked ────────────────────────
        const linkedUser = await findLinkedUser(supabase, chatId, companyId)

        // ─── /help command ──────────────────────────────────
        if (text === '/help') {
            await handleHelp(botToken, chatId, !!linkedUser)
            return corsResponse({ ok: true })
        }

        // ─── /status command ────────────────────────────────
        if (text === '/status') {
            if (linkedUser) {
                await sendMessage(botToken, chatId,
                    `✅ <b>حسابك مربوط</b>\n\n` +
                    `👤 ${firstName} (@${username})\n` +
                    `🏢 متصل بنظام TexaCore\n` +
                    `🔔 الإشعارات: مفعّلة`
                )
            } else {
                await sendMessage(botToken, chatId,
                    `❌ <b>حسابك غير مربوط</b>\n\n` +
                    `أرسل رمز التحقق لربط حسابك.`
                )
            }
            return corsResponse({ ok: true })
        }

        // ─── Verification code (6 chars, not linked) ────────
        if (!linkedUser && /^[A-Z0-9]{6}$/i.test(text)) {
            await handleVerification(supabase, chatId, text, username, firstName, botToken)
            return corsResponse({ ok: true })
        }

        // ─── Not linked — prompt to verify ──────────────────
        if (!linkedUser) {
            await sendMessage(botToken, chatId,
                `👋 مرحباً! حسابك غير مربوط بعد.\n\n` +
                `📌 أرسل <b>رمز التحقق</b> المكون من 6 أحرف لربط حسابك.\n\n` +
                `<i>اطلب الرمز من مدير النظام (الإعدادات → التكاملات)</i>`
            )
            return corsResponse({ ok: true })
        }

        // ═══ LINKED USER — Process Actions ═══════════════════

        // ─── Try to parse quick action ──────────────────────
        const action = parseQuickAction(text)

        if (action) {
            // Create pending action
            const pendingAction = await createPendingAction(
                supabase, companyId, tenantId,
                linkedUser.user_id, chatId,
                action.type, action.data, text
            )

            if (pendingAction) {
                // Send confirmation with inline buttons
                const confirmMsg = formatActionConfirmation(action.type, action.data)
                await sendMessage(botToken, chatId, confirmMsg, {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '✅ تأكيد', callback_data: `confirm_${pendingAction.id}` },
                            { text: '❌ رفض', callback_data: `reject_${pendingAction.id}` },
                        ]]
                    }
                })
            } else {
                await sendMessage(botToken, chatId, '❌ حدث خطأ في إنشاء الإجراء. حاول مرة أخرى.')
            }

            return corsResponse({ ok: true })
        }

        // ─── Detect user language from message ─────────────
        const detectLanguage = (text: string, telegramLang?: string): string => {
            // Check script-based detection first (most reliable)
            if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) return 'ar'    // Arabic script
            if (/[\u0400-\u04FF]/.test(text)) return 'ru'                 // Cyrillic (Russian/Ukrainian)
            if (/[ğüşöçıİĞÜŞÖÇ]/.test(text)) return 'tr'                // Turkish specific chars
            if (/[\u0400-\u04FF]/.test(text) && /[іїєґ]/i.test(text)) return 'uk' // Ukrainian specific
            // Fallback to Telegram's reported language
            if (telegramLang) {
                if (telegramLang.startsWith('ru')) return 'ru'
                if (telegramLang.startsWith('uk')) return 'uk'
                if (telegramLang.startsWith('tr')) return 'tr'
                if (telegramLang.startsWith('ar')) return 'ar'
            }
            return 'en' // default English
        }

        const userLang = detectLanguage(text, message?.from?.language_code)

        // ─── General message → forward to NexaPro Agent ─────
        // Auto-detect role from user_role_assignments (unified with system)
        let mappedRole = 'user';
        if (linkedUser?.user_id) {
            const { data: roleData } = await supabase
                .from('user_role_assignments')
                .select('role_id, roles(code, level)')
                .eq('user_id', linkedUser.user_id)
                .eq('is_active', true);
            
            if (roleData?.length) {
                const ADMIN_ROLES = ['super_admin', 'tenant_owner', 'company_owner', 'company_admin'];
                const roleCodes = roleData.map((r: any) => r.roles?.code).filter(Boolean);
                mappedRole = ADMIN_ROLES.find(r => roleCodes.includes(r)) || roleCodes[0] || 'user';
            }
            
            // Fallback: check if user is tenant owner by email
            if (mappedRole === 'user') {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('email, is_tenant_admin, is_super_admin')
                    .eq('id', linkedUser.user_id).single();
                if (profile?.is_tenant_admin || profile?.is_super_admin) {
                    mappedRole = 'tenant_owner';
                } else if (profile?.email) {
                    const { data: tenant } = await supabase
                        .from('tenants').select('id').eq('owner_email', profile.email).maybeSingle();
                    if (tenant) mappedRole = 'tenant_owner';
                }
            }
        }
        console.log(`[TelegramWebhook] User ${linkedUser?.user_id} role: ${mappedRole}`);

        try {
            const agentResponse = await fetch(`${supabaseUrl}/functions/v1/nexa-agent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${serviceRoleKey}`,
                },
                body: JSON.stringify({
                    message: text,
                    company_id: companyId,
                    language: userLang,
                    context_type: 'general',
                    complexity: 'auto',
                    client_role: mappedRole,
                    user_name: firstName || username || '',
                }),
            })

            if (agentResponse.ok) {
                const agentData = await agentResponse.json()
                const fallbackMsg = userLang === 'ar' ? 'لم أتمكن من معالجة طلبك.'
                    : userLang === 'ru' ? 'Не удалось обработать ваш запрос.'
                        : userLang === 'tr' ? 'İsteğiniz işlenemedi.'
                            : userLang === 'uk' ? 'Не вдалося обробити ваш запит.'
                                : 'Could not process your request.'
                const reply = agentData.response || agentData.reply || fallbackMsg

                // Truncate if too long for Telegram (4096 chars max)
                const truncatedReply = reply.length > 4000
                    ? reply.substring(0, 4000) + '...\n\n<i>📄 ' +
                    (userLang === 'ar' ? 'الرد مختصر — افتح البرنامج للتفاصيل' :
                        userLang === 'ru' ? 'Ответ сокращён — откройте программу для деталей' :
                            userLang === 'tr' ? 'Yanıt kısaltıldı — detaylar için programı açın' :
                                'Response truncated — open the app for full details') + '</i>'
                    : reply

                await sendMessage(botToken, chatId, truncatedReply)
            } else {
                const helpMsg = userLang === 'ar'
                    ? `🤖 <b>وكيل نيكسا برو</b>\n\nتم استلام رسالتك. يمكنك التحقق من النتائج في البرنامج.\n\n<i>💡 جرّب أوامر مباشرة مثل: "استلمت 5000 من أحمد"</i>`
                    : userLang === 'ru'
                        ? `🤖 <b>NexaPro Agent</b>\n\nВаше сообщение получено. Проверьте результаты в программе.\n\n<i>💡 Попробуйте: "получил 5000 от Ахмеда"</i>`
                        : userLang === 'tr'
                            ? `🤖 <b>NexaPro Agent</b>\n\nMesajınız alındı. Sonuçları programda kontrol edin.\n\n<i>💡 Deneyin: "5000 aldım Ahmed'den"</i>`
                            : `🤖 <b>NexaPro Agent</b>\n\nMessage received. Check results in the app.\n\n<i>💡 Try: "received 5000 from Ahmed"</i>`
                await sendMessage(botToken, chatId, helpMsg)
            }
        } catch (agentErr) {
            console.error('[TelegramWebhook] Agent call error:', agentErr)
            const errMsg = userLang === 'ar'
                ? `🤖 استلمت رسالتك.\n\n💡 <b>جرّب:</b>\n• <code>استلمت 5000 من أحمد</code>\n• <code>دفعت 2000 كهرباء</code>\n• <code>/help</code> للمساعدة`
                : userLang === 'ru'
                    ? `🤖 Сообщение получено.\n\n💡 <b>Попробуйте:</b>\n• <code>получил 5000 от Ахмеда</code>\n• <code>оплатил 2000 за электричество</code>\n• <code>/help</code> для помощи`
                    : userLang === 'tr'
                        ? `🤖 Mesajınız alındı.\n\n💡 <b>Deneyin:</b>\n• <code>5000 aldım Ahmed'den</code>\n• <code>2000 elektrik ödedim</code>\n• <code>/help</code> yardım için`
                        : `🤖 Message received.\n\n💡 <b>Try:</b>\n• <code>received 5000 from Ahmed</code>\n• <code>paid 2000 for electricity</code>\n• <code>/help</code> for help`
            await sendMessage(botToken, chatId, errMsg)
        }

        return corsResponse({ ok: true })

    } catch (err) {
        console.error('[TelegramWebhook] Error:', err)
        // Always return 200 to Telegram to avoid retries
        return corsResponse({ ok: true, error: 'internal' })
    }
})
