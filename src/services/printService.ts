/**
 * Print Service
 * خدمة إدارة قوالب الطباعة
 */

import { supabase } from '@/lib/supabase';

// Types
export interface PrintTemplate {
  id: string;
  tenant_id: string | null;
  doc_type: string;
  name_ar: string;
  name_en: string | null;
  category: string;
  template_html: string;
  template_css: string | null;
  variables: any[];
  paper_size: string;
  orientation: string;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  include_qr: boolean;
  include_header: boolean;
  include_footer: boolean;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PrintOptions {
  includeQR: boolean;
  includeHeader: boolean;
  includeFooter: boolean;
  includeStamp: boolean;
  includeSignature: boolean;
  copies: number;
}

// Service class
class PrintService {
  // Get all templates for a doc type
  async getTemplates(docType: string, tenantId?: string): Promise<PrintTemplate[]> {
    let query = supabase
      .from('print_templates')
      .select('*')
      .eq('doc_type', docType)
      .eq('is_active', true)
      .order('sort_order');

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    } else {
      query = query.is('tenant_id', null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Get template by ID
  async getTemplateById(id: string): Promise<PrintTemplate | null> {
    const { data, error } = await supabase
      .from('print_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  // Get default template for doc type
  async getDefaultTemplate(docType: string, tenantId?: string): Promise<PrintTemplate | null> {
    let query = supabase
      .from('print_templates')
      .select('*')
      .eq('doc_type', docType)
      .eq('is_default', true)
      .eq('is_active', true);

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    const { data, error } = await query.single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  // Create new template
  async createTemplate(template: Partial<PrintTemplate>): Promise<PrintTemplate> {
    const { data, error } = await supabase
      .from('print_templates')
      .insert(template)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update template
  async updateTemplate(id: string, updates: Partial<PrintTemplate>): Promise<PrintTemplate> {
    const { data, error } = await supabase
      .from('print_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete template
  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('print_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Set default template
  async setDefaultTemplate(id: string, docType: string, tenantId?: string): Promise<void> {
    // First, unset current default
    let query = supabase
      .from('print_templates')
      .update({ is_default: false })
      .eq('doc_type', docType);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    await query;

    // Then set the new default
    const { error } = await supabase
      .from('print_templates')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
  }

  // Render template with data
  renderTemplate(template: PrintTemplate, data: any, options: PrintOptions): string {
    let html = template.template_html;

    // Replace variables
    for (const variable of template.variables || []) {
      const value = this.getNestedValue(data, variable.key) || '';
      html = html.replace(new RegExp(`{{${variable.key}}}`, 'g'), value);
    }

    // Add QR code placeholder if needed
    if (options.includeQR && template.include_qr) {
      html = html.replace('{{QR_CODE}}', `<div id="qr-code" data-value="${data.id}"></div>`);
    }

    // Add header if needed
    if (!options.includeHeader) {
      html = html.replace(/<!-- HEADER_START -->.*?<!-- HEADER_END -->/gs, '');
    }

    // Add footer if needed
    if (!options.includeFooter) {
      html = html.replace(/<!-- FOOTER_START -->.*?<!-- FOOTER_END -->/gs, '');
    }

    return html;
  }

  // Helper to get nested object value
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Generate print preview
  generatePreview(template: PrintTemplate, data: any, options: PrintOptions): string {
    const content = this.renderTemplate(template, data, options);
    const css = template.template_css || '';
    const margins = template.margins;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${template.name_ar}</title>
          <style>
            @page {
              size: ${template.paper_size} ${template.orientation};
              margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
            }
            body {
              font-family: 'Cairo', 'Arial', sans-serif;
              direction: rtl;
            }
            ${css}
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
  }

  // Trigger print
  async print(templateId: string, data: any, options: PrintOptions): Promise<void> {
    const template = await this.getTemplateById(templateId);
    if (!template) throw new Error('Template not found');

    const preview = this.generatePreview(template, data, options);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(preview);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load then print
      setTimeout(() => {
        printWindow.print();
        // printWindow.close(); // Uncomment to auto-close after print
      }, 250);
    }
  }
}

export const printService = new PrintService();
export default printService;
