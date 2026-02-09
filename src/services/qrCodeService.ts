import { supabase } from '@/lib/supabase';
import { getCurrentUserWithMetadata } from './authService';


export interface QRCode {
    id: string;
    tenant_id: string;
    code: string;
    entity_type: 'material' | 'roll' | 'invoice' | 'entry' | 'delivery_note';
    entity_id: string;
    current_status: string;
    generated_by?: string;
    created_at: string;
    scans_count?: number;
}

export interface QRScan {
    id: string;
    tenant_id: string;
    qr_code_id: string;
    scanned_by_telegram_id?: number;
    scanned_by_user_id?: string;
    action_type: string;
    prev_status?: string;
    new_status?: string;
    location_data?: any;
    scanned_at: string;
}

export const qrCodeService = {
    /**
     * Get or Create a QR Code for an entity
     * If a QR code already exists for this entity, return it.
     * Otherwise, generate a new unique code and return it.
     */
    async getOrCreateQRCode(
        entityType: QRCode['entity_type'],
        entityId: string
    ): Promise<QRCode | null> {
        // 1. Check if exists
        const { data: existing, error: fetchError } = await supabase
            .from('qr_codes')
            .select('*')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .single();

        if (existing) return existing;

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('Error checking QR code:', fetchError);
            throw fetchError;
        }

        // 2. Generate new code
        // Format: TYPE-ENTITY_ID_PREFIX-RANDOM
        // To keep it short but unique, we might just use a UUID or a shorter nano-id.
        // For now, let's use a simple format: Ti-UUID_SEGMENT
        const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        const typePrefix = entityType.substring(0, 3).toUpperCase(); // MAT, ROL, INV
        const newCode = `${typePrefix}-${uniqueSuffix}`;

        // Get tenant_id from current session
        const user = await getCurrentUserWithMetadata();
        if (!user?.tenant_id) {
            console.error('QR Gen Failed: User has no tenant_id', user);
            throw new Error('User does not belong to a tenant');
        }

        const { data: newQR, error: createError } = await supabase
            .from('qr_codes')
            .insert({
                tenant_id: user.tenant_id,
                entity_type: entityType,
                entity_id: entityId,
                code: newCode,
                current_status: 'active'
            })
            .select()
            .single();

        if (createError) {
            console.error('Error creating QR code:', createError);
            throw createError;
        }

        return newQR;
    },

    /**
     * Get QR Code by the code string
     */
    async getByCode(code: string): Promise<QRCode | null> {
        const { data, error } = await supabase
            .from('qr_codes')
            .select('*')
            .eq('code', code)
            .single();

        if (error) {
            console.error('Error fetching QR code:', error);
            return null;
        }
        return data;
    },

    /**
     * Get Scan History for a QR Code
     */
    async getScanHistory(qrCodeId: string): Promise<QRScan[]> {
        const { data, error } = await supabase
            .from('qr_scans')
            .select(`
        *,
        scanned_by_user:scanned_by_user_id(first_name, last_name, email)
      `)
            .eq('qr_code_id', qrCodeId)
            .order('scanned_at', { ascending: false });

        if (error) {
            console.error('Error fetching scan history:', error);
            throw error;
        }
        return data || [];
    }
};
