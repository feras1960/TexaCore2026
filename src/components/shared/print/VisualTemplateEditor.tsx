/**
 * ════════════════════════════════════════════════════════════════
 * 🎨 VisualTemplateEditor — محرر القوالب المرئي
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
    Building2, User, FileText, Table, Calculator, QrCode,
    Stamp, PenTool, AlignLeft, SeparatorHorizontal,
    GripVertical, Trash2, Settings2,
    Plus, LayoutTemplate, Copy, Type,
    ArrowUp, ArrowDown, Search, Variable,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VARIABLE_DOCS } from '@/services/printService';
import { toast } from 'sonner';

// ─── Block Types ────────────────────────────────────────────────

export interface TemplateBlock {
    id: string;
    type: BlockType;
    props: Record<string, any>;
}

export type BlockType =
    | 'company_header' | 'party_info' | 'document_info'
    | 'items_table' | 'totals_box' | 'qr_code'
    | 'stamp_signature' | 'footer' | 'free_text'
    | 'page_break' | 'divider'
    | 'roll_info' | 'container_info' | 'specs_grid';

// ─── Block Definitions ─────────────────────────────────────────

interface BlockDef {
    type: BlockType;
    label_ar: string;
    label_en: string;
    icon: React.ElementType;
    category: 'layout' | 'data' | 'system' | 'label';
    defaultProps: Record<string, any>;
    availableIn?: string[];
}

const BLOCK_DEFINITIONS: BlockDef[] = [
    { type: 'company_header', label_ar: '🏢 ترويسة الشركة', label_en: '🏢 Company Header', icon: Building2, category: 'layout', defaultProps: { showLogo: true, showName: true, showAddress: true, showPhone: true, showEmail: true, showTaxId: true } },
    { type: 'party_info', label_ar: '👤 بيانات العميل/المورد', label_en: '👤 Party Info', icon: User, category: 'data', defaultProps: { partyType: 'customer', showPhone: true, showAddress: true, showTaxId: true } },
    { type: 'document_info', label_ar: '📄 معلومات المستند', label_en: '📄 Document Info', icon: FileText, category: 'data', defaultProps: { showNumber: true, showDate: true, showDueDate: true, showSupplyDate: false, showCurrency: true } },
    { type: 'items_table', label_ar: '📦 جدول البنود', label_en: '📦 Items Table', icon: Table, category: 'data', defaultProps: { showIndex: true, showDescription: true, showQty: true, showUnit: true, showPrice: true, showDiscount: true, showTax: true, showTotal: true }, availableIn: ['sales_invoice', 'purchase_invoice', 'price_quote'] },
    { type: 'totals_box', label_ar: '💰 صندوق المجاميع', label_en: '💰 Totals Box', icon: Calculator, category: 'data', defaultProps: { showSubtotal: true, showDiscount: true, showTax: true, showTotal: true, showPaid: true, showBalance: true, alignment: 'end' } },
    { type: 'qr_code', label_ar: '📱 QR Code', label_en: '📱 QR Code', icon: QrCode, category: 'system', defaultProps: { size: 80, position: 'center' } },
    { type: 'stamp_signature', label_ar: '🔴 ختم وتوقيع', label_en: '🔴 Stamp & Signature', icon: Stamp, category: 'system', defaultProps: { showStamp: true, showSignature: true, showReceiverLine: true, showAccountantLine: true, showManagerLine: false } },
    { type: 'footer', label_ar: '📝 التذييل', label_en: '📝 Footer', icon: AlignLeft, category: 'layout', defaultProps: { showTerms: true, showThankYou: true, showPrintDate: true, customText: '' } },
    { type: 'free_text', label_ar: '✏️ نص حر', label_en: '✏️ Free Text', icon: Type, category: 'layout', defaultProps: { content: '', fontSize: 12, fontWeight: 'normal', textAlign: 'start', color: '#333' } },
    { type: 'divider', label_ar: '➖ فاصل', label_en: '➖ Divider', icon: SeparatorHorizontal, category: 'layout', defaultProps: { style: 'solid', color: '#ddd', thickness: 1, margin: 8 } },
    { type: 'page_break', label_ar: '📄 فاصل صفحة', label_en: '📄 Page Break', icon: SeparatorHorizontal, category: 'layout', defaultProps: {} },
    { type: 'roll_info', label_ar: '🏷️ بيانات الرولون', label_en: '🏷️ Roll Info', icon: LayoutTemplate, category: 'label', defaultProps: { showMaterialName: true, showCode: true, showComposition: true }, availableIn: ['roll_label'] },
    { type: 'container_info', label_ar: '📦 بيانات الكونتينر', label_en: '📦 Container Info', icon: LayoutTemplate, category: 'label', defaultProps: { showNumber: true, showName: true }, availableIn: ['container_label'] },
    {
        type: 'specs_grid', label_ar: '📊 شبكة المواصفات', label_en: '📊 Specs Grid', icon: Table, category: 'label',
        defaultProps: {
            columns: 3, specs: [
                { label: 'color', variable: '{{roll.color}}' },
                { label: 'width', variable: '{{roll.width}}' },
                { label: 'weight', variable: '{{roll.weight}}' },
                { label: 'length', variable: '{{roll.length}}' },
                { label: 'cost', variable: '{{roll.cost_per_unit}}' },
                { label: 'batch', variable: '{{roll.batch_no}}' },
            ]
        }, availableIn: ['roll_label', 'container_label']
    },
];

// ─── HTML Builder Helpers (avoid JSX parsing issues) ────────────

function tag(el: string, style: string, content: string, attrs = ''): string {
    return '<' + el + (attrs ? ' ' + attrs : '') + ' style="' + style + '">' + content + '</' + el + '>';
}
function img(src: string, style: string): string {
    return '<img src="' + src + '" alt="" style="' + style + '" />';
}
function comment(text: string): string {
    return '<' + '!-- ' + text + ' --' + '>';
}
function hr(style: string): string {
    return '<hr style="' + style + '" />';
}

// ─── Block-to-HTML Generator ────────────────────────────────────

function blockToHtml(block: TemplateBlock): string {
    const p = block.props;
    const parts: string[] = [];

    switch (block.type) {
        case 'company_header': {
            parts.push(comment('HEADER_START'));
            const inner: string[] = [];
            if (p.showLogo) inner.push(tag('div', '', '{{#company.logo}}' + img('{{company.logo}}', 'max-height:60px;max-width:120px') + '{{/company.logo}}', 'class="logo"'));
            const center: string[] = [];
            if (p.showName) center.push(tag('h2', 'font-size:18px;font-weight:700;color:#0f3460;margin:0', '{{company.name}}'));
            if (p.showAddress) center.push(tag('p', 'font-size:10px;color:#666;margin:2px 0', '{{company.address}}'));
            if (p.showPhone) center.push(tag('p', 'font-size:9px;color:#888;margin:0', '{{company.phone}}' + (p.showEmail ? ' · {{company.email}}' : '')));
            if (p.showTaxId) center.push(tag('p', 'font-size:9px;color:#888;margin:0', '{{tax_id_label}}: {{company.tax_id}}'));
            inner.push(tag('div', 'text-align:center;flex:1', center.join('\n')));
            inner.push(tag('div', 'text-align:center', '{{QR_CODE}}'));
            parts.push(tag('div', 'display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f3460;padding-bottom:8px;margin-bottom:12px', inner.join('\n'), 'class="company-header"'));
            parts.push(comment('HEADER_END'));
            return parts.join('\n');
        }

        case 'party_info': {
            const pfx = p.partyType === 'supplier' ? 'supplier' : 'customer';
            const titleVar = p.partyType === 'supplier' ? 'supplier_section_title' : 'party_section_title';
            const inner: string[] = [];
            inner.push(tag('h4', 'font-size:11px;font-weight:600;color:#0f3460;margin:0 0 6px 0', '{{' + titleVar + '}}'));
            inner.push(tag('div', 'font-size:12px;font-weight:700;color:#1a1a2e', '{{' + pfx + '.name}}'));
            if (p.showPhone) inner.push(tag('div', 'font-size:9px;color:#666;margin-top:2px', '{{' + pfx + '.phone}}'));
            if (p.showAddress) inner.push(tag('div', 'font-size:9px;color:#666', '{{' + pfx + '.address}}'));
            if (p.showTaxId) inner.push(tag('div', 'font-size:9px;color:#666', '{{tax_id_label}}: {{' + pfx + '.tax_id}}'));
            return tag('div', 'background:#f8f9fc;border:1px solid #e0e4f0;border-radius:6px;padding:10px 14px;margin-bottom:10px', inner.join('\n'), 'class="party-info"');
        }

        case 'document_info': {
            const inner: string[] = [];
            inner.push(tag('div', 'text-align:center;font-size:16px;font-weight:700;color:#0f3460;grid-column:1/-1', '{{doc_title}}'));
            if (p.showNumber) inner.push(tag('div', 'font-size:9px', tag('span', 'color:#888', '{{invoice_number_label}}: ') + tag('strong', '', '{{invoice.number}}')));
            if (p.showDate) inner.push(tag('div', 'font-size:9px', tag('span', 'color:#888', '{{issue_date_label}}: ') + tag('strong', '', '{{invoice.date}}')));
            if (p.showDueDate) inner.push(tag('div', 'font-size:9px', tag('span', 'color:#888', '{{due_date_label}}: ') + tag('strong', '', '{{invoice.due_date}}')));
            if (p.showSupplyDate) inner.push(tag('div', 'font-size:9px', tag('span', 'color:#888', '{{supply_date_label}}: ') + tag('strong', '', '{{invoice.supply_date}}')));
            if (p.showCurrency) inner.push(tag('div', 'font-size:9px', tag('span', 'color:#888', '{{currency_label}}: ') + tag('strong', '', '{{invoice.currency}}')));
            return tag('div', 'display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#f0f4ff;border-radius:6px;padding:10px 14px;margin-bottom:10px', inner.join('\n'), 'class="doc-info"');
        }

        case 'items_table': {
            const ths: string[] = [];
            if (p.showIndex) ths.push(tag('th', 'padding:6px 4px;text-align:center;width:30px', '#'));
            if (p.showDescription) ths.push(tag('th', 'padding:6px 4px', '{{item_desc_label}}'));
            if (p.showQty) ths.push(tag('th', 'padding:6px 4px;text-align:center', '{{qty_label}}'));
            if (p.showUnit) ths.push(tag('th', 'padding:6px 4px;text-align:center', '{{unit_label}}'));
            if (p.showPrice) ths.push(tag('th', 'padding:6px 4px;text-align:center', '{{price_label}}'));
            if (p.showDiscount) ths.push(tag('th', 'padding:6px 4px;text-align:center', '{{discount_label}}'));
            if (p.showTax) ths.push(tag('th', 'padding:6px 4px;text-align:center', '{{tax_label}}'));
            if (p.showTotal) ths.push(tag('th', 'padding:6px 4px;text-align:center', '{{total_label}}'));
            const thead = tag('thead', '', tag('tr', 'background:#0f3460;color:#fff', ths.join('\n')));
            const tbody = tag('tbody', '', '{{ITEMS_ROWS}}');
            return tag('table', 'width:100%;border-collapse:collapse;font-size:10px;margin-bottom:10px', thead + '\n' + tbody);
        }

        case 'totals_box': {
            const inner: string[] = [];
            const side = p.alignment === 'end' ? 'inline-start' : 'inline-end';
            if (p.showSubtotal) inner.push(tag('div', 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee', tag('span', '', '{{subtotal_label}}') + tag('strong', '', '{{invoice.subtotal}}')));
            if (p.showDiscount) inner.push(tag('div', 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee;color:#e74c3c', tag('span', '', '{{discount_label}}') + tag('strong', '', '-{{invoice.discount}}')));
            if (p.showTax) inner.push(tag('div', 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee', tag('span', '', '{{tax_name}}') + tag('strong', '', '{{invoice.tax_amount}}')));
            if (p.showTotal) inner.push(tag('div', 'display:flex;justify-content:space-between;padding:6px 0;font-size:13px;font-weight:700;color:#0f3460;border-top:2px solid #0f3460', tag('span', '', '{{grand_total_label}}') + tag('strong', '', '{{invoice.total}} {{invoice.currency}}')));
            if (p.showPaid) inner.push(tag('div', 'display:flex;justify-content:space-between;padding:4px 0;font-size:10px;color:#27ae60', tag('span', '', '{{paid_label}}') + tag('strong', '', '{{invoice.paid}}')));
            if (p.showBalance) inner.push(tag('div', 'display:flex;justify-content:space-between;padding:4px 0;font-size:10px;color:#e74c3c', tag('span', '', '{{balance_label}}') + tag('strong', '', '{{invoice.balance}}')));
            return tag('div', 'margin-' + side + ':auto;width:45%;font-size:11px;margin-bottom:10px', inner.join('\n'), 'class="totals"');
        }

        case 'qr_code':
            return tag('div', 'text-align:' + p.position + ';margin:8px 0', '{{QR_CODE}}');

        case 'stamp_signature': {
            const inner: string[] = [];
            if (p.showStamp) inner.push(tag('div', 'text-align:center', tag('div', 'margin-bottom:30px', '{{STAMP}}') + tag('div', 'border-top:1px solid #333;padding-top:4px;font-size:9px', '{{stamp_label}}')));
            if (p.showSignature) inner.push(tag('div', 'text-align:center', tag('div', 'margin-bottom:30px', '{{SIGNATURE}}') + tag('div', 'border-top:1px solid #333;padding-top:4px;font-size:9px', '{{ceo_label}}')));
            if (p.showReceiverLine) inner.push(tag('div', 'text-align:center', tag('div', 'margin-bottom:30px', '') + tag('div', 'border-top:1px solid #333;padding-top:4px;font-size:9px', '{{receiver_label}}')));
            if (p.showAccountantLine) inner.push(tag('div', 'text-align:center', tag('div', 'margin-bottom:30px', '') + tag('div', 'border-top:1px solid #333;padding-top:4px;font-size:9px', '{{accountant_label}}')));
            return tag('div', 'display:flex;justify-content:space-around;margin-top:20px;padding-top:10px;border-top:1px solid #ddd', inner.join('\n'));
        }

        case 'footer': {
            const inner: string[] = [];
            if (p.showThankYou) inner.push(tag('p', 'margin:0 0 4px 0', '{{footer_text}}'));
            if (p.showTerms) inner.push(tag('p', 'margin:0 0 4px 0;font-size:8px', '{{footer_terms}}'));
            if (p.customText) inner.push(tag('p', 'margin:0 0 4px 0', p.customText));
            if (p.showPrintDate) inner.push(tag('p', 'margin:0;font-size:7px;opacity:0.6', '{{printed_at_label}}: {{system.date}}'));
            return comment('FOOTER_START') + '\n' + tag('div', 'margin-top:16px;padding-top:8px;border-top:1px solid #ddd;font-size:9px;color:#888;text-align:center', inner.join('\n')) + '\n' + comment('FOOTER_END');
        }

        case 'free_text':
            return tag('div', 'font-size:' + p.fontSize + 'px;font-weight:' + p.fontWeight + ';text-align:' + p.textAlign + ';color:' + p.color + ';margin:6px 0', p.content || '...');

        case 'divider':
            return hr('border:none;border-top:' + p.thickness + 'px ' + p.style + ' ' + p.color + ';margin:' + p.margin + 'px 0');

        case 'page_break':
            return tag('div', 'page-break-after:always', '');

        case 'roll_info': {
            const inner: string[] = [];
            if (p.showMaterialName) inner.push(tag('h4', 'font-size:13px;font-weight:700;color:#0f3460;margin:0', '{{roll.material_name}}'));
            if (p.showCode) inner.push(tag('div', 'font-size:9px;color:#666', '{{roll.material_code}}'));
            if (p.showComposition) inner.push(tag('div', 'font-size:8px;color:#888;margin-top:2px', '{{roll.composition}}'));
            return tag('div', 'background:#f0f4ff;border:1px solid #d0d8f0;border-radius:4px;padding:8px 10px;margin-bottom:8px', inner.join('\n'));
        }

        case 'container_info': {
            const inner: string[] = [];
            if (p.showNumber) inner.push(tag('h2', 'font-size:20px;letter-spacing:2px;margin:0', '{{container.number}}'));
            if (p.showName) inner.push(tag('p', 'font-size:10px;opacity:0.8;margin:2px 0 0 0', '{{container.name}}'));
            return tag('div', 'text-align:center;background:linear-gradient(135deg,#0f3460,#16213e);color:#fff;padding:12px;border-radius:6px;margin-bottom:8px', inner.join('\n'));
        }

        case 'specs_grid': {
            const cols = p.columns || 3;
            const specs = p.specs || [];
            const cells = specs.map((s: any) =>
                tag('div', 'background:#f8f9fc;border:1px solid #e8e8e8;border-radius:3px;padding:4px 6px;text-align:center',
                    tag('div', 'font-size:7px;color:#888', '{{_label_' + s.label + '}}') +
                    tag('div', 'font-size:10px;font-weight:700;color:#1a1a2e', s.variable)
                )
            );
            return tag('div', 'display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:4px;margin-bottom:8px', cells.join('\n'));
        }

        default:
            return comment('Unknown block: ' + block.type);
    }
}

function generateDefaultCSS(): string {
    return [
        '*{margin:0;padding:0;box-sizing:border-box}',
        "body{font-family:{{font_family}};direction:{{direction}};font-size:11px;line-height:1.5;color:#1a1a2e}",
        '.page{width:190mm;margin:0 auto;padding:10mm}',
        '@media print{.page{width:100%;padding:5mm}}',
    ].join('\n');
}

// ─── Props Editor ───────────────────────────────────────────────

function BlockPropsEditor({ block, isAr, onChange }: { block: TemplateBlock; isAr: boolean; onChange: (props: Record<string, any>) => void }) {
    const p = block.props;
    const update = (key: string, val: any) => onChange({ ...p, [key]: val });

    const renderSwitch = (key: string, labelAr: string, labelEn: string) => (
        <div className="flex items-center justify-between py-1" key={key}>
            <span className="text-xs">{isAr ? labelAr : labelEn}</span>
            <Switch checked={p[key] ?? true} onCheckedChange={v => update(key, v)} />
        </div>
    );

    switch (block.type) {
        case 'company_header':
            return <div className="space-y-1">
                {renderSwitch('showLogo', 'الشعار', 'Logo')}
                {renderSwitch('showName', 'الاسم', 'Name')}
                {renderSwitch('showAddress', 'العنوان', 'Address')}
                {renderSwitch('showPhone', 'الهاتف', 'Phone')}
                {renderSwitch('showEmail', 'البريد', 'Email')}
                {renderSwitch('showTaxId', 'الرقم الضريبي', 'Tax ID')}
            </div>;

        case 'party_info':
            return <div className="space-y-1">
                <div className="flex items-center gap-2 py-1">
                    <span className="text-xs">{isAr ? 'النوع' : 'Type'}</span>
                    <Select value={p.partyType} onValueChange={v => update('partyType', v)}>
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="customer">{isAr ? 'عميل' : 'Customer'}</SelectItem>
                            <SelectItem value="supplier">{isAr ? 'مورد' : 'Supplier'}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {renderSwitch('showPhone', 'الهاتف', 'Phone')}
                {renderSwitch('showAddress', 'العنوان', 'Address')}
                {renderSwitch('showTaxId', 'الرقم الضريبي', 'Tax ID')}
            </div>;

        case 'document_info':
            return <div className="space-y-1">
                {renderSwitch('showNumber', 'الرقم', 'Number')}
                {renderSwitch('showDate', 'التاريخ', 'Date')}
                {renderSwitch('showDueDate', 'الاستحقاق', 'Due Date')}
                {renderSwitch('showSupplyDate', 'التوريد', 'Supply Date')}
                {renderSwitch('showCurrency', 'العملة', 'Currency')}
            </div>;

        case 'items_table':
            return <div className="space-y-1">
                {renderSwitch('showIndex', '#', '#')}
                {renderSwitch('showDescription', 'الوصف', 'Description')}
                {renderSwitch('showQty', 'الكمية', 'Qty')}
                {renderSwitch('showUnit', 'الوحدة', 'Unit')}
                {renderSwitch('showPrice', 'السعر', 'Price')}
                {renderSwitch('showDiscount', 'الخصم', 'Discount')}
                {renderSwitch('showTax', 'الضريبة', 'Tax')}
                {renderSwitch('showTotal', 'الإجمالي', 'Total')}
            </div>;

        case 'totals_box':
            return <div className="space-y-1">
                {renderSwitch('showSubtotal', 'المجموع الفرعي', 'Subtotal')}
                {renderSwitch('showDiscount', 'الخصم', 'Discount')}
                {renderSwitch('showTax', 'الضريبة', 'Tax')}
                {renderSwitch('showTotal', 'الإجمالي', 'Grand Total')}
                {renderSwitch('showPaid', 'المدفوع', 'Paid')}
                {renderSwitch('showBalance', 'المتبقي', 'Balance')}
            </div>;

        case 'free_text':
            return <div className="space-y-2">
                <Textarea
                    value={p.content || ''}
                    onChange={e => update('content', e.target.value)}
                    placeholder={isAr ? 'اكتب النص هنا...' : 'Type text here...'}
                    rows={3} className="text-xs"
                />
                <div className="flex gap-2">
                    <Input type="number" value={p.fontSize || 12} onChange={e => update('fontSize', +e.target.value)} className="h-7 text-xs w-16" />
                    <Select value={p.fontWeight || 'normal'} onValueChange={v => update('fontWeight', v)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="bold">Bold</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>;

        case 'footer':
            return <div className="space-y-1">
                {renderSwitch('showThankYou', 'رسالة شكر', 'Thank You')}
                {renderSwitch('showTerms', 'الشروط', 'Terms')}
                {renderSwitch('showPrintDate', 'تاريخ الطباعة', 'Print Date')}
                <Input value={p.customText || ''} onChange={e => update('customText', e.target.value)}
                    placeholder={isAr ? 'نص إضافي...' : 'Custom text...'} className="h-7 text-xs mt-2" />
            </div>;

        case 'roll_info':
            return <div className="space-y-1">
                {renderSwitch('showMaterialName', 'اسم المادة', 'Material Name')}
                {renderSwitch('showCode', 'الكود', 'Code')}
                {renderSwitch('showComposition', 'التركيبة', 'Composition')}
            </div>;

        case 'stamp_signature':
            return <div className="space-y-1">
                {renderSwitch('showStamp', 'الختم', 'Stamp')}
                {renderSwitch('showSignature', 'التوقيع', 'Signature')}
                {renderSwitch('showReceiverLine', 'المستلم', 'Receiver')}
                {renderSwitch('showAccountantLine', 'المحاسب', 'Accountant')}
                {renderSwitch('showManagerLine', 'المدير', 'Manager')}
            </div>;

        default:
            return <p className="text-xs text-muted-foreground">{isAr ? 'لا توجد إعدادات' : 'No settings'}</p>;
    }
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

interface VisualTemplateEditorProps {
    initialHtml: string;
    initialCss: string;
    docType: string;
    isAr: boolean;
    onHtmlChange: (html: string) => void;
    onCssChange: (css: string) => void;
}

export default function VisualTemplateEditor({ initialHtml, initialCss, docType, isAr, onHtmlChange, onCssChange }: VisualTemplateEditorProps) {
    const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [rightTab, setRightTab] = useState<'props' | 'vars'>('props');
    const [varSearch, setVarSearch] = useState('');
    const dragRef = useRef<string | null>(null);
    const initialized = useRef(false);

    // ─── HTML → Blocks Parser ────────────────────────────────────
    function parseHtmlToBlocks(html: string): TemplateBlock[] {
        const result: TemplateBlock[] = [];
        let idx = 0;
        const mkId = () => 'b_parsed_' + (idx++);
        const has = (s: string) => html.includes(s);

        // Detect company header
        if (has('company-header') || has('company.name') || has('company.logo')) {
            result.push({
                id: mkId(), type: 'company_header', props: {
                    showLogo: has('company.logo'),
                    showName: has('company.name'),
                    showAddress: has('company.address'),
                    showPhone: has('company.phone'),
                    showEmail: has('company.email'),
                    showTaxId: has('company.tax_id'),
                }
            });
        }

        // Detect roll info
        if (has('roll.material_name')) {
            result.push({
                id: mkId(), type: 'roll_info', props: {
                    showMaterialName: has('roll.material_name'),
                    showCode: has('roll.material_code'),
                    showComposition: has('roll.composition'),
                }
            });
        }

        // Detect container info
        if (has('container.number') && (has('container_label') || has('container.name') || docType === 'container_label')) {
            result.push({
                id: mkId(), type: 'container_info', props: {
                    showNumber: has('container.number'),
                    showName: has('container.name'),
                }
            });
        }

        // Detect party info
        if (has('party-info') || has('customer.name') || has('supplier.name')) {
            const isSup = has('supplier.name') && !has('customer.name');
            result.push({
                id: mkId(), type: 'party_info', props: {
                    partyType: isSup ? 'supplier' : 'customer',
                    showPhone: has(isSup ? 'supplier.phone' : 'customer.phone'),
                    showAddress: has(isSup ? 'supplier.address' : 'customer.address'),
                    showTaxId: has(isSup ? 'supplier.tax_id' : 'customer.tax_id'),
                }
            });
        }

        // Detect document info
        if (has('doc-info') || has('doc_title') || has('invoice.number')) {
            result.push({
                id: mkId(), type: 'document_info', props: {
                    showNumber: has('invoice.number'),
                    showDate: has('invoice.date'),
                    showDueDate: has('invoice.due_date'),
                    showSupplyDate: has('invoice.supply_date'),
                    showCurrency: has('invoice.currency') || has('currency_label'),
                }
            });
        }

        // Detect items table
        if (has('ITEMS_ROWS')) {
            result.push({
                id: mkId(), type: 'items_table', props: {
                    showIndex: true,
                    showDescription: has('item_desc_label'),
                    showQty: has('qty_label'),
                    showUnit: has('unit_label'),
                    showPrice: has('price_label'),
                    showDiscount: has('discount_label'),
                    showTax: has('tax_label'),
                    showTotal: has('total_label'),
                }
            });
        }

        // Detect totals box
        if (has('totals') || has('grand_total_label') || has('subtotal_label')) {
            result.push({
                id: mkId(), type: 'totals_box', props: {
                    showSubtotal: has('subtotal_label') || has('invoice.subtotal'),
                    showDiscount: has('discount_label') && has('invoice.discount'),
                    showTax: has('tax_name') || has('invoice.tax_amount'),
                    showTotal: has('grand_total_label') || has('invoice.total'),
                    showPaid: has('paid_label') || has('invoice.paid'),
                    showBalance: has('balance_label') || has('invoice.balance'),
                    alignment: 'end',
                }
            });
        }

        // Detect specs grid
        if (has('_label_')) {
            const specLabels: { label: string; variable: string }[] = [];
            const labelRegex = /\{\{_label_(\w+)\}\}/g;
            let match;
            const seenLabels = new Set<string>();
            while ((match = labelRegex.exec(html)) !== null) {
                const label = match[1];
                if (seenLabels.has(label)) continue;
                seenLabels.add(label);
                // Try to find the corresponding variable after this label
                const afterLabel = html.substring(match.index + match[0].length, match.index + match[0].length + 200);
                const varMatch = afterLabel.match(/\{\{([^}]+)\}\}/);
                specLabels.push({ label, variable: varMatch ? '{{' + varMatch[1] + '}}' : '' });
            }
            if (specLabels.length > 0) {
                // Try to detect columns from grid-template-columns
                const colMatch = html.match(/repeat\((\d+)/);
                result.push({
                    id: mkId(), type: 'specs_grid', props: {
                        columns: colMatch ? parseInt(colMatch[1]) : 3,
                        specs: specLabels,
                    }
                });
            }
        }

        // Detect QR code
        if (has('QR_CODE')) {
            const posMatch = html.match(/text-align:\s*(center|start|end)/);
            result.push({
                id: mkId(), type: 'qr_code', props: {
                    size: 80,
                    position: posMatch ? posMatch[1] : 'center',
                }
            });
        }

        // Detect stamp/signature
        if (has('STAMP') || has('SIGNATURE') || has('stamp_label') || has('receiver_label')) {
            result.push({
                id: mkId(), type: 'stamp_signature', props: {
                    showStamp: has('STAMP') || has('stamp_label'),
                    showSignature: has('SIGNATURE') || has('ceo_label'),
                    showReceiverLine: has('receiver_label'),
                    showAccountantLine: has('accountant_label'),
                    showManagerLine: has('manager_label'),
                }
            });
        }

        // Detect footer
        if (has('FOOTER_START') || has('footer_text') || has('printed_at_label')) {
            result.push({
                id: mkId(), type: 'footer', props: {
                    showThankYou: has('footer_text'),
                    showTerms: has('footer_terms'),
                    showPrintDate: has('printed_at_label') || has('system.date'),
                    customText: '',
                }
            });
        }

        return result;
    }

    // ─── Initialize blocks ─────────────────────────────────────────
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        // If there's existing HTML, try to parse it into blocks
        if (initialHtml && initialHtml.trim().length > 20) {
            const parsed = parseHtmlToBlocks(initialHtml);
            if (parsed.length > 0) {
                setBlocks(parsed);
                return;
            }
        }

        // Fallback: default blocks based on doc type
        if (docType === 'roll_label') {
            setBlocks([
                { id: 'b1', type: 'company_header', props: { showLogo: true, showName: true, showAddress: false, showPhone: false, showEmail: false, showTaxId: false } },
                { id: 'b2', type: 'roll_info', props: { showMaterialName: true, showCode: true, showComposition: true } },
                {
                    id: 'b3', type: 'specs_grid', props: {
                        columns: 3, specs: [
                            { label: 'color', variable: '{{roll.color}}' },
                            { label: 'width', variable: '{{roll.width}} cm' },
                            { label: 'weight', variable: '{{roll.weight}} GSM' },
                            { label: 'length', variable: '{{roll.length}} {{roll.unit}}' },
                            { label: 'cost', variable: '{{roll.cost_per_unit}}' },
                            { label: 'batch', variable: '{{roll.batch_no}}' },
                        ]
                    }
                },
                { id: 'b4', type: 'qr_code', props: { size: 80, position: 'center' } },
            ]);
        } else if (docType === 'container_label') {
            setBlocks([
                { id: 'b1', type: 'company_header', props: { showLogo: true, showName: true, showAddress: false, showPhone: false, showEmail: false, showTaxId: false } },
                { id: 'b2', type: 'container_info', props: { showNumber: true, showName: true } },
                {
                    id: 'b3', type: 'specs_grid', props: {
                        columns: 2, specs: [
                            { label: 'supplier', variable: '{{container.supplier}}' },
                            { label: 'origin', variable: '{{container.origin}}' },
                            { label: 'vessel', variable: '{{container.vessel}}' },
                            { label: 'arrival', variable: '{{container.arrival_date}}' },
                        ]
                    }
                },
                { id: 'b4', type: 'qr_code', props: { size: 80, position: 'center' } },
            ]);
        } else {
            setBlocks([
                { id: 'b1', type: 'company_header', props: BLOCK_DEFINITIONS[0].defaultProps },
                { id: 'b2', type: 'party_info', props: BLOCK_DEFINITIONS[1].defaultProps },
                { id: 'b3', type: 'document_info', props: BLOCK_DEFINITIONS[2].defaultProps },
                { id: 'b4', type: 'items_table', props: BLOCK_DEFINITIONS[3].defaultProps },
                { id: 'b5', type: 'totals_box', props: BLOCK_DEFINITIONS[4].defaultProps },
                { id: 'b6', type: 'stamp_signature', props: BLOCK_DEFINITIONS[6].defaultProps },
                { id: 'b7', type: 'footer', props: BLOCK_DEFINITIONS[7].defaultProps },
            ]);
        }
    }, [docType, initialHtml]);

    // Sync blocks → HTML
    useEffect(() => {
        if (blocks.length === 0) return;
        const pageOpen = '<div class="page">';
        const pageClose = '</div>';
        const html = pageOpen + '\n' + blocks.map(b => blockToHtml(b)).join('\n\n') + '\n' + pageClose;
        onHtmlChange(html);
        if (!initialCss || initialCss.length < 10) {
            onCssChange(generateDefaultCSS());
        }
    }, [blocks]);

    const availableBlocks = useMemo(() => {
        return BLOCK_DEFINITIONS.filter(bd => {
            if (!bd.availableIn || bd.availableIn.length === 0) return true;
            return bd.availableIn.includes(docType);
        });
    }, [docType]);

    const categories = useMemo(() => [
        { id: 'layout', label: isAr ? '📐 تخطيط' : '📐 Layout' },
        { id: 'data', label: isAr ? '📊 بيانات' : '📊 Data' },
        { id: 'system', label: isAr ? '⚙️ نظام' : '⚙️ System' },
        { id: 'label', label: isAr ? '🏷️ لصاقات' : '🏷️ Labels' },
    ], [isAr]);

    const addBlock = useCallback((type: BlockType) => {
        const def = BLOCK_DEFINITIONS.find(d => d.type === type);
        if (!def) return;
        const newBlock: TemplateBlock = {
            id: 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            type,
            props: { ...def.defaultProps },
        };
        setBlocks(prev => [...prev, newBlock]);
        setSelectedBlockId(newBlock.id);
    }, []);

    const removeBlock = useCallback((id: string) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
        if (selectedBlockId === id) setSelectedBlockId(null);
    }, [selectedBlockId]);

    const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
        setBlocks(prev => {
            const idx = prev.findIndex(b => b.id === id);
            if (idx < 0) return prev;
            const newIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (newIdx < 0 || newIdx >= prev.length) return prev;
            const arr = [...prev];
            [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
            return arr;
        });
    }, []);

    const updateBlockProps = useCallback((id: string, props: Record<string, any>) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, props } : b));
    }, []);

    const duplicateBlock = useCallback((id: string) => {
        setBlocks(prev => {
            const idx = prev.findIndex(b => b.id === id);
            if (idx < 0) return prev;
            const orig = prev[idx];
            const copy: TemplateBlock = {
                id: 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                type: orig.type,
                props: { ...orig.props },
            };
            const arr = [...prev];
            arr.splice(idx + 1, 0, copy);
            return arr;
        });
    }, []);

    // Drag & Drop
    const handleDragStart = (id: string) => { dragRef.current = id; };
    const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOverId(id); };
    const handleDrop = (targetId: string) => {
        const srcId = dragRef.current;
        if (!srcId || srcId === targetId) { setDragOverId(null); return; }
        setBlocks(prev => {
            const srcIdx = prev.findIndex(b => b.id === srcId);
            const tgtIdx = prev.findIndex(b => b.id === targetId);
            if (srcIdx < 0 || tgtIdx < 0) return prev;
            const arr = [...prev];
            const [moved] = arr.splice(srcIdx, 1);
            arr.splice(tgtIdx, 0, moved);
            return arr;
        });
        setDragOverId(null);
        dragRef.current = null;
    };

    const selectedBlock = blocks.find(b => b.id === selectedBlockId);
    const selectedBlockDef = selectedBlock ? BLOCK_DEFINITIONS.find(d => d.type === selectedBlock.type) : null;

    // Sanitize HTML for preview (highlight variables)
    const highlightVars = (html: string) => {
        return html.replace(/\{\{[^}]+\}\}/g, (m) => {
            return '<code style="background:#e8f0fe;color:#1a73e8;padding:1px 4px;border-radius:3px;font-size:9px">' + m + '</code>';
        });
    };

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left: Block Palette */}
            <div className="w-52 border-e shrink-0 bg-muted/10 flex flex-col">
                <div className="px-3 py-2 border-b bg-muted/20">
                    <h3 className="text-xs font-semibold flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-primary" />
                        {isAr ? 'إضافة بلوك' : 'Add Block'}
                    </h3>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-3">
                        {categories.map(cat => {
                            const catBlocks = availableBlocks.filter(b => b.category === cat.id);
                            if (catBlocks.length === 0) return null;
                            return (
                                <div key={cat.id}>
                                    <p className="text-[10px] font-bold text-muted-foreground mb-1 px-1">{cat.label}</p>
                                    <div className="space-y-1">
                                        {catBlocks.map(bd => (
                                            <button key={bd.type} onClick={() => addBlock(bd.type)}
                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-primary/10 hover:text-primary transition-colors text-start">
                                                <bd.icon className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate">{isAr ? bd.label_ar : bd.label_en}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>

            {/* Center: Canvas */}
            <div className="flex-1 overflow-auto bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 p-4">
                <div className="max-w-[210mm] mx-auto bg-white dark:bg-gray-950 shadow-xl rounded-lg overflow-hidden border" style={{ minHeight: '297mm' }}>
                    <div className="p-6 space-y-1">
                        {blocks.length === 0 && (
                            <div className="text-center py-20 text-muted-foreground">
                                <LayoutTemplate className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">{isAr ? 'اضغط على البلوكات من اليسار لبناء القالب' : 'Click blocks from the left panel to build your template'}</p>
                            </div>
                        )}

                        {blocks.map((block) => {
                            const def = BLOCK_DEFINITIONS.find(d => d.type === block.type);
                            const isSelected = selectedBlockId === block.id;
                            const isDragOver = dragOverId === block.id;
                            return (
                                <div
                                    key={block.id}
                                    draggable
                                    onDragStart={() => handleDragStart(block.id)}
                                    onDragOver={(e) => handleDragOver(e, block.id)}
                                    onDrop={() => handleDrop(block.id)}
                                    onDragEnd={() => setDragOverId(null)}
                                    onClick={() => setSelectedBlockId(block.id)}
                                    className={[
                                        'group relative border rounded-lg transition-all cursor-pointer',
                                        isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-transparent hover:border-gray-300',
                                        isDragOver ? 'border-t-2 border-t-blue-500' : '',
                                    ].join(' ')}
                                >
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50/80 dark:bg-gray-900/50 rounded-t-lg">
                                        <GripVertical className="w-3 h-3 text-gray-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {def && <def.icon className="w-3 h-3 text-muted-foreground" />}
                                        <span className="text-[10px] font-medium text-muted-foreground flex-1">{def ? (isAr ? def.label_ar : def.label_en) : block.type}</span>
                                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }} className="p-0.5 hover:text-primary" title="Up"><ArrowUp className="w-3 h-3" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }} className="p-0.5 hover:text-primary" title="Down"><ArrowDown className="w-3 h-3" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }} className="p-0.5 hover:text-blue-500" title="Duplicate"><Copy className="w-3 h-3" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="p-0.5 hover:text-destructive" title="Delete"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                    <div className="px-3 py-2 text-xs text-muted-foreground pointer-events-none"
                                        dangerouslySetInnerHTML={{ __html: highlightVars(blockToHtml(block)) }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right: Properties + Variables Panel */}
            <div className="w-60 border-s shrink-0 bg-muted/10 flex flex-col">
                {/* Panel Tabs */}
                <div className="flex border-b bg-muted/20 shrink-0">
                    <button onClick={() => setRightTab('props')}
                        className={'flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors ' + (rightTab === 'props' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground')}>
                        <Settings2 className="w-3 h-3" />
                        {isAr ? 'الخصائص' : 'Properties'}
                    </button>
                    <button onClick={() => setRightTab('vars')}
                        className={'flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors ' + (rightTab === 'vars' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground')}>
                        <Variable className="w-3 h-3" />
                        {isAr ? 'المتغيرات' : 'Variables'}
                    </button>
                </div>

                <ScrollArea className="flex-1">
                    {/* Properties Tab */}
                    {rightTab === 'props' && (
                        <div className="p-3">
                            {selectedBlock && selectedBlockDef ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 pb-2 border-b">
                                        <selectedBlockDef.icon className="w-4 h-4 text-primary" />
                                        <span className="text-xs font-semibold">{isAr ? selectedBlockDef.label_ar : selectedBlockDef.label_en}</span>
                                    </div>
                                    <BlockPropsEditor block={selectedBlock} isAr={isAr} onChange={(props) => updateBlockProps(selectedBlock.id, props)} />
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Settings2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-xs">{isAr ? 'اختر بلوك لتعديل خصائصه' : 'Select a block to edit'}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Variables Tab */}
                    {rightTab === 'vars' && (
                        <div className="p-2 space-y-2">
                            <div className="relative">
                                <Search className="absolute start-2 top-1.5 w-3 h-3 text-muted-foreground" />
                                <Input
                                    placeholder={isAr ? 'بحث...' : 'Search...'}
                                    value={varSearch}
                                    onChange={e => setVarSearch(e.target.value)}
                                    className="h-7 ps-7 text-xs"
                                />
                            </div>
                            <p className="text-[9px] text-muted-foreground px-1">
                                {isAr ? 'اضغط على المتغير لنسخه' : 'Click to copy variable'}
                            </p>
                            <div className="space-y-0.5">
                                {VARIABLE_DOCS
                                    .filter(v => {
                                        if (!varSearch) return true;
                                        const s = varSearch.toLowerCase();
                                        return v.key.toLowerCase().includes(s) || v.label_ar.includes(varSearch) || v.label_en.toLowerCase().includes(s);
                                    })
                                    .filter(v => v.availableIn.includes('all') || v.availableIn.includes(docType))
                                    .map(v => (
                                        <button
                                            key={v.key}
                                            onClick={() => {
                                                navigator.clipboard.writeText(v.key);
                                                toast.success(isAr ? 'تم نسخ ' + v.key : 'Copied ' + v.key);
                                            }}
                                            className="w-full text-start px-2 py-1.5 rounded hover:bg-primary/10 transition-colors group"
                                        >
                                            <code className="text-[10px] font-mono text-primary group-hover:font-bold">{v.key}</code>
                                            <p className="text-[9px] text-muted-foreground truncate">{isAr ? v.label_ar : v.label_en}</p>
                                        </button>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                </ScrollArea>

                <div className="px-3 py-2 border-t text-center">
                    <Badge variant="secondary" className="text-[10px]">
                        {blocks.length} {isAr ? 'بلوك' : 'blocks'}
                    </Badge>
                </div>
            </div>
        </div>
    );
}
