/**
 * ════════════════════════════════════════════════════════════════
 * Exchange & Remittance Module Types
 * ════════════════════════════════════════════════════════════════
 */

export interface Remittance {
    // ─── Base ───────────────────────────────────────────────────
    id: string;
    tenant_id: string;
    company_id: string;
    branch_id?: string;
    remittance_number: string;
    remittance_type: 'outgoing' | 'incoming';
    remittance_date: string;
    
    // ─── Sender Info ────────────────────────────────────────────
    sender_customer_id?: string;
    sender_name: string;
    sender_phone?: string;
    sender_id_type?: string;
    sender_id_number?: string;
    sender_country?: string;
    sender_city?: string;
    sender_address?: string;
    
    // ─── Receiver Info ──────────────────────────────────────────
    receiver_customer_id?: string;
    receiver_name: string;
    receiver_phone?: string;
    receiver_id_type?: string;
    receiver_id_number?: string;
    receiver_country?: string;
    receiver_city?: string;
    receiver_address?: string;
    receiver_bank_name?: string;
    receiver_bank_account?: string;
    receiver_wallet?: string;
    receiver_swift_code?: string;
    receiver_routing_number?: string;
    
    // ─── Amounts & Currencies ───────────────────────────────────
    send_currency: string;
    send_amount: number;
    receive_currency: string;
    receive_amount: number;
    exchange_rate?: number;
    
    // ─── Fees & Commissions ─────────────────────────────────────
    commission_amount: number; // Total commission charged to client
    our_commission: number;    // Our revenue
    agent_commission: number;  // Third party cost
    network_fee: number;       // Swift/Crypto cost
    commission_bearer: 'sender' | 'receiver' | 'split';
    total_paid?: number;
    
    // ─── Intermediaries & Routing ───────────────────────────────
    agent_id?: string;
    partner_id?: string;
    delivery_method: 'cash' | 'branch' | 'agent' | 'bank' | 'wallet' | 'internal' | 'delegate';
    payment_method: 'cash' | 'bank' | 'wallet' | 'internal';
    execution_channel?: 'agent_partner' | 'branch' | 'direct_bank' | 'wallet';
    execution_payment_method?: 'cash' | 'bank' | 'wallet';
    crypto_network?: string;
    delivery_country?: string;
    delivery_city?: string;
    delivery_delegate_id?: string;
    
    // ─── Status & Meta ──────────────────────────────────────────
    status: 'draft' | 'pending' | 'processing' | 'sent' | 'delivered' | 'completed' | 'cancelled' | 'returned';
    purpose?: string;
    priority: 'normal' | 'urgent' | 'vip';
    
    // ─── Tracking ────────────────────────────────────────────────
    tracking_code?: string;

    // ─── Collection ──────────────────────────────────────────────
    collection_status?: 'collected' | 'pending' | 'partial';
    collection_method?: 'cash' | 'bank' | 'internal';
    collection_fund_id?: string;
    collection_reference?: string;

    // ─── Confirmation & Delivery ────────────────────────────────
    confirmed_by?: string;
    confirmed_at?: string;
    delivered_at?: string;
    delivery_confirmed_by?: string;

    // ─── Accounting ─────────────────────────────────────────────
    journal_entry_id?: string;
    fund_id?: string;
    
    notes?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface RemittanceTracking {
    id: string;
    tenant_id: string;
    company_id: string;
    remittance_id: string;
    status: string;
    notes?: string;
    location?: string;
    updated_by?: string;
    created_at: string;
}
