/**
 * ════════════════════════════════════════════════════════════════
 * 📋 complianceService — وثائق الامتثال KYC/AML
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

export interface ComplianceDoc {
  id: string;
  customer_id: string;
  doc_type: string;    // id_card / passport / residence / license / commercial_register
  doc_number?: string;
  issuing_country?: string;
  issue_date?: string;
  expiry_date?: string;
  status: string;      // valid / expired / pending_review
  file_url?: string;
  notes?: string;
  verified_by?: string;
  verified_at?: string;
  created_at?: string;
}

export type ComplianceStatus = 'valid' | 'warning' | 'expired' | 'none';

export const complianceService = {
  /**
   * Get all compliance docs for a customer
   */
  async getDocs(customerId: string): Promise<ComplianceDoc[]> {
    const { data, error } = await supabase
      .from('customer_compliance_docs')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /**
   * Get overall compliance status for a customer
   */
  async getComplianceStatus(customerId: string): Promise<ComplianceStatus> {
    const docs = await this.getDocs(customerId);
    if (docs.length === 0) return 'none';

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let hasValid = false;
    let hasWarning = false;
    let hasExpired = false;

    for (const doc of docs) {
      if (!doc.expiry_date) {
        hasValid = true;
        continue;
      }
      const expiry = new Date(doc.expiry_date);
      if (expiry < now) {
        hasExpired = true;
      } else if (expiry < thirtyDaysFromNow) {
        hasWarning = true;
      } else {
        hasValid = true;
      }
    }

    if (hasExpired && !hasValid) return 'expired';
    if (hasWarning) return 'warning';
    if (hasValid) return 'valid';
    return 'expired';
  },

  /**
   * Create or update a compliance document
   */
  async upsertDoc(doc: Partial<ComplianceDoc> & { customer_id: string }): Promise<string> {
    if (doc.id) {
      const { error } = await supabase
        .from('customer_compliance_docs')
        .update({
          doc_type: doc.doc_type,
          doc_number: doc.doc_number,
          issuing_country: doc.issuing_country,
          issue_date: doc.issue_date,
          expiry_date: doc.expiry_date,
          status: doc.status || 'valid',
          file_url: doc.file_url,
          notes: doc.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id);
      if (error) throw error;
      return doc.id;
    } else {
      // Get tenant_id from customer
      const { data: cust } = await supabase
        .from('customers')
        .select('tenant_id')
        .eq('id', doc.customer_id)
        .single();

      const { data, error } = await supabase
        .from('customer_compliance_docs')
        .insert({
          customer_id: doc.customer_id,
          doc_type: doc.doc_type || 'id_card',
          doc_number: doc.doc_number,
          issuing_country: doc.issuing_country,
          issue_date: doc.issue_date,
          expiry_date: doc.expiry_date,
          status: doc.status || 'valid',
          file_url: doc.file_url,
          notes: doc.notes,
          tenant_id: cust?.tenant_id,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    }
  },

  /**
   * Delete a compliance document
   */
  async deleteDoc(docId: string): Promise<void> {
    const { error } = await supabase
      .from('customer_compliance_docs')
      .delete()
      .eq('id', docId);
    if (error) throw error;
  },
};
