/**
 * ════════════════════════════════════════════════════════════════
 * 🔔 Remittance Notification Service
 * ════════════════════════════════════════════════════════════════
 * Sends notifications to customers (sender/receiver) via:
 *   - Telegram (if customer has telegram_chat_id)
 *   - WhatsApp via Twilio (using customer phone)
 * 
 * Also logs every notification to remittance_tracking for timeline display.
 * Uses templates from exchange_settings.remittance_notifications
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────
interface NotificationData {
  remittanceId: string;
  remittanceNumber: string;
  companyId: string;
  triggerKey: string; // draft_created, confirmed, executed, delivered, completed, returned, cancelled
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  amount?: number;
  currency?: string;
  receiveCurrency?: string;
  deliveryMethod?: string;
  agentName?: string;
  reason?: string;
  companyName?: string;
}

interface NotificationResult {
  recipient: string; // 'sender' | 'receiver' | 'agent'
  channel: string;   // 'telegram' | 'whatsapp' | 'sms'
  success: boolean;
  error?: string;
}

// ─── Status trigger key mapping ───────────────────────────────
const STATUS_TO_TRIGGER: Record<string, string> = {
  pending: 'confirmed',
  processing: 'confirmed',
  sent: 'executed',
  delivered: 'delivered',
  completed: 'completed',
  cancelled: 'cancelled',
  returned: 'returned',
};

// ─── Templates with placeholders ──────────────────────────────
const DEFAULT_TEMPLATES: Record<string, Record<string, { ar: string; en: string }>> = {
  sender: {
    confirmed: { ar: '✅ تم تأكيد حوالتك بنجاح!\n📋 رقم: {ref}\n💰 المبلغ: {amount} {currency}\n👤 المستفيد: {receiver}\n🔄 قيد التنفيذ\n\n{company}', en: '✅ Confirmed!\n📋 Ref: {ref}\n💰 {amount} {currency}\n👤 To: {receiver}\n🔄 Processing\n\n{company}' },
    executed: { ar: '⚡ تم تنفيذ حوالتك!\n📋 رقم: {ref}\n💰 المبلغ: {amount} {currency}\n✨ في الطريق إلى {receiver}\n\n{company}', en: '⚡ Executed!\n📋 Ref: {ref}\n💰 {amount} {currency}\n✨ On the way to {receiver}\n\n{company}' },
    delivered: { ar: '📬 تم تسليم حوالتك بنجاح!\n📋 رقم: {ref}\n👤 المستفيد: {receiver}\n🎉 شكراً لثقتك بنا!\n{company}', en: '📬 Delivered!\n📋 Ref: {ref}\n👤 To: {receiver}\n🎉 Thank you!\n{company}' },
    completed: { ar: '✔️ اكتملت حوالتك بنجاح! 🎉\n📋 رقم: {ref}\n🙏 شكراً لاستخدامك خدمات {company}', en: '✔️ Completed! 🎉\n📋 Ref: {ref}\n🙏 Thank you!\n{company}' },
    cancelled: { ar: '❌ تم إلغاء حوالتك\n📋 رقم: {ref}\n📝 السبب: {reason}\n📞 للاستفسار تواصل معنا\n{company}', en: '❌ Cancelled\n📋 Ref: {ref}\n📝 Reason: {reason}\n{company}' },
    returned: { ar: '↩️ تم إرجاع حوالتك\n📋 رقم: {ref}\n📝 السبب: {reason}\n📞 تواصل معنا\n{company}', en: '↩️ Returned\n📋 Ref: {ref}\n📝 Reason: {reason}\n{company}' },
  },
  receiver: {
    confirmed: { ar: '✅ حوالة مؤكدة باسمك!\n📋 رقم: {ref}\n💰 المبلغ: {amount} {currency}\n👤 من: {sender}\n🔄 قيد التنفيذ\n\n{company}', en: '✅ Confirmed for you!\n📋 Ref: {ref}\n💰 {amount} {currency}\n👤 From: {sender}\n\n{company}' },
    executed: { ar: '⚡ حوالتك في الطريق!\n📋 رقم: {ref}\n💰 المبلغ: {amount} {currency}\n📌 يرجى الاستعداد للاستلام\n{company}', en: '⚡ On the way!\n📋 Ref: {ref}\n💰 {amount} {currency}\n📌 Be ready for pickup\n{company}' },
    delivered: { ar: '📬 حوالتك جاهزة للاستلام! 🎉\n📋 رقم: {ref}\n💰 المبلغ: {amount} {currency}\n📌 إحضار هوية شخصية\n{company}', en: '📬 Ready for pickup! 🎉\n📋 Ref: {ref}\n💰 {amount} {currency}\n📌 Bring valid ID\n{company}' },
    completed: { ar: '✔️ تم استلام حوالتك بنجاح! 🎉\n{company}', en: '✔️ Received! 🎉\n{company}' },
    cancelled: { ar: '❌ تم إلغاء الحوالة الموجهة لك\n📋 رقم: {ref}\n📞 للاستفسار: {company}', en: '❌ Cancelled\n📋 Ref: {ref}\nContact: {company}' },
    returned: { ar: '↩️ تم إرجاع الحوالة\n📋 رقم: {ref}\n📞 {company}', en: '↩️ Returned\n📋 Ref: {ref}\n{company}' },
  },
};

// ─── Fill template placeholders ───────────────────────────────
function fillTemplate(template: string, data: NotificationData): string {
  const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });
  return template
    .replace(/\{ref\}/g, data.remittanceNumber || '')
    .replace(/\{amount\}/g, data.amount ? fmtAmt(data.amount) : '0')
    .replace(/\{currency\}/g, data.currency || 'USD')
    .replace(/\{to_currency\}/g, data.receiveCurrency || data.currency || '')
    .replace(/\{sender\}/g, data.senderName || '')
    .replace(/\{receiver\}/g, data.receiverName || '')
    .replace(/\{delivery\}/g, data.deliveryMethod || '')
    .replace(/\{agent_name\}/g, data.agentName || '')
    .replace(/\{reason\}/g, data.reason || '—')
    .replace(/\{company\}/g, data.companyName || 'TexaCore')
    .replace(/\{branch\}/g, '')
    .replace(/\{bot_link\}/g, '')
    .replace(/\{sent_at\}/g, new Date().toLocaleString('ar-SA'))
    .replace(/\{delivered_at\}/g, new Date().toLocaleString('ar-SA'))
    .replace(/\{location\}/g, '')
    .replace(/\{commission\}/g, '')
    .replace(/\{profit\}/g, '')
    .replace(/\{base_currency\}/g, data.currency || '')
    .replace(/\{created_by\}/g, '')
    .replace(/\{cancelled_by\}/g, '');
}

// ─── Normalize phone ──────────────────────────────────────────
function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, '').replace(/^00/, '+');
  if (!p.startsWith('+')) p = '+' + p;
  return p;
}

// ═══════════════════════════════════════════════════════════════
export const remittanceNotificationService = {

  /**
   * Send notifications to all relevant parties for a remittance event.
   * Logs results to remittance_tracking.
   */
  async notify(data: NotificationData): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    try {
      // Load company integrations
      const { data: company } = await supabase
        .from('companies')
        .select('integrations, name, name_ar')
        .eq('id', data.companyId)
        .single();

      const integrations = company?.integrations || {};
      data.companyName = company?.name_ar || company?.name || 'TexaCore';

      // Load exchange notification settings
      let notifSettings: Record<string, Record<string, string[]>> = {};
      try {
        const { data: exSettings } = await supabase
          .from('exchange_settings')
          .select('remittance_notifications, notification_channels')
          .eq('company_id', data.companyId)
          .maybeSingle();
        notifSettings = exSettings?.remittance_notifications || {};
      } catch { /* settings table may not exist */ }

      const triggerKey = data.triggerKey;

      // ─── Send to Sender ─────────────────────────────────
      if (data.senderPhone) {
        const senderResults = await this._sendToCustomer({
          phone: data.senderPhone,
          recipientType: 'sender',
          triggerKey,
          data,
          integrations,
          notifSettings,
        });
        results.push(...senderResults);
      }

      // ─── Send to Receiver ───────────────────────────────
      if (data.receiverPhone) {
        const receiverResults = await this._sendToCustomer({
          phone: data.receiverPhone,
          recipientType: 'receiver',
          triggerKey,
          data,
          integrations,
          notifSettings,
        });
        results.push(...receiverResults);
      }

      // ─── Log to remittance_tracking ─────────────────────
      if (results.length > 0) {
        const { data: userData } = await supabase.auth.getUser();
        const successResults = results.filter(r => r.success);
        const failResults = results.filter(r => !r.success);

        const notesLines: string[] = [];
        if (successResults.length > 0) {
          notesLines.push('📤 ' + successResults.map(r => `${r.recipient} (${r.channel})`).join(', '));
        }
        if (failResults.length > 0) {
          notesLines.push('❌ ' + failResults.map(r => `${r.recipient}:${r.channel} — ${r.error}`).join(', '));
        }

        try {
          await supabase.from('remittance_tracking').insert([{
            remittance_id: data.remittanceId,
            status: 'notification',
            notes: `🔔 إشعارات — ${triggerKey}\n${notesLines.join('\n')}`,
            updated_by: userData?.user?.id,
          }]);
        } catch (e) {
          console.warn('[RemittanceNotify] Failed to log tracking:', e);
        }
      }
    } catch (err) {
      console.error('[RemittanceNotify] Error:', err);
    }

    return results;
  },

  /**
   * Send notification to a customer via available channels
   */
  async _sendToCustomer(params: {
    phone: string;
    recipientType: 'sender' | 'receiver';
    triggerKey: string;
    data: NotificationData;
    integrations: any;
    notifSettings: Record<string, Record<string, string[]>>;
  }): Promise<NotificationResult[]> {
    const { phone, recipientType, triggerKey, data, integrations } = params;
    const results: NotificationResult[] = [];

    // Get template
    const templates = DEFAULT_TEMPLATES[recipientType];
    const template = templates?.[triggerKey];
    if (!template) return results;

    // For now use Arabic messages (can be made dynamic later)
    const message = fillTemplate(template.ar, data);
    const normalizedPhone = normalizePhone(phone);

    // 1. Try WhatsApp via Twilio
    if (integrations.twilio?.account_sid && integrations.twilio?.auth_token && integrations.twilio?.whatsapp_sender) {
      try {
        const twilio = integrations.twilio;
        // Normalize the sender number (remove whatsapp: prefix if accidentally stored)
        let senderNum = (twilio.whatsapp_sender || '').replace(/^whatsapp:/i, '').trim();
        senderNum = normalizePhone(senderNum);

        const fromAddr = `whatsapp:${senderNum}`;
        const toAddr = `whatsapp:${normalizedPhone}`;

        console.log(`[RemittanceNotify] 📱 WhatsApp: From=${fromAddr}, To=${toAddr}, Trigger=${triggerKey}`);

        const urlParams = new URLSearchParams();
        urlParams.append('From', fromAddr);
        urlParams.append('To', toAddr);
        urlParams.append('Body', message);

        const resp = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilio.account_sid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${twilio.account_sid}:${twilio.auth_token}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: urlParams,
          }
        );

        if (resp.ok) {
          const respData = await resp.json().catch(() => ({}));
          console.log(`[RemittanceNotify] ✅ WhatsApp sent to ${recipientType}. SID: ${respData.sid}`);
          results.push({ recipient: recipientType, channel: 'whatsapp', success: true });
        } else {
          const errData = await resp.json().catch(() => ({} as any));
          const errCode = errData?.code || resp.status;
          const errMsg = errData?.message || errData?.more_info || `HTTP ${resp.status}`;
          console.error(`[RemittanceNotify] ❌ WhatsApp FAILED [${errCode}]:`, errMsg, { from: fromAddr, to: toAddr, errData });
          results.push({
            recipient: recipientType,
            channel: 'whatsapp',
            success: false,
            error: `[${errCode}] ${errMsg}`,
          });
        }
      } catch (err: any) {
        console.error(`[RemittanceNotify] ❌ WhatsApp exception:`, err);
        results.push({ recipient: recipientType, channel: 'whatsapp', success: false, error: err.message });
      }
    } else {
      console.warn(`[RemittanceNotify] ⚠️ WhatsApp NOT configured:`, {
        hasSid: !!integrations.twilio?.account_sid,
        hasAuth: !!integrations.twilio?.auth_token,
        hasSender: !!integrations.twilio?.whatsapp_sender,
      });
    }

    // 2. Try Telegram (if bot is configured)
    if (integrations.telegram?.bot_token) {
      // Look for customer's telegram_chat_id by phone
      try {
        const { data: customer } = await supabase
          .from('exchange_customers')
          .select('telegram_chat_id')
          .eq('company_id', data.companyId)
          .or(`phone.eq.${phone},phone.eq.${normalizedPhone}`)
          .not('telegram_chat_id', 'is', null)
          .maybeSingle();

        if (customer?.telegram_chat_id) {
          const resp = await fetch(
            `https://api.telegram.org/bot${integrations.telegram.bot_token}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: customer.telegram_chat_id,
                text: message,
                parse_mode: 'HTML',
              }),
            }
          );
          const result = await resp.json();
          results.push({
            recipient: recipientType,
            channel: 'telegram',
            success: result.ok === true,
            error: result.ok ? undefined : result.description,
          });
        }
      } catch (err: any) {
        // Telegram lookup failed silently — not critical
        console.warn('[RemittanceNotify] Telegram lookup error:', err.message);
      }
    }

    return results;
  },

  /**
   * Convenience: Get trigger key from new status
   */
  getTriggerKey(newStatus: string): string {
    return STATUS_TO_TRIGGER[newStatus] || newStatus;
  },
};
