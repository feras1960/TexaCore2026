/**
 * QR Code Generator Component
 * مكون توليد رمز QR
 * 
 * Features:
 * - Generate QR codes for any document type
 * - Support for different data formats (URL, JSON, Text)
 * - Customizable size and colors
 * - Download and print functionality
 */

import React, { useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  Download, 
  Printer, 
  Copy, 
  Check,
  Share2,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Document types that support QR codes
export type QRDocType = 
  | 'invoice' 
  | 'payment' 
  | 'receipt' 
  | 'journal_entry' 
  | 'account'
  | 'customer'
  | 'supplier'
  | 'order'
  | 'tenant'
  | 'fund';

interface QRCodeData {
  type: QRDocType;
  id: string;
  number?: string;
  date?: string;
  total?: number;
  currency?: string;
  status?: string;
  company?: string;
  vat?: string;
  url?: string;
  extra?: Record<string, any>;
}

interface QRCodeGeneratorProps {
  data: QRCodeData;
  size?: number;
  showLabel?: boolean;
  showActions?: boolean;
  variant?: 'default' | 'compact' | 'card' | 'inline';
  className?: string;
  onScan?: () => void;
}

// Generate a unique URL for the QR code
const generateQRUrl = (data: QRCodeData): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/qr/${data.type}/${data.id}`;
};

// Generate ZATCA-compliant QR data for invoices (Saudi Arabia e-invoice)
const generateZATCAData = (data: QRCodeData): string => {
  // TLV format for ZATCA
  const tlvData = [
    { tag: 1, value: data.company || '' }, // Seller name
    { tag: 2, value: data.vat || '' }, // VAT number
    { tag: 3, value: data.date || new Date().toISOString() }, // Timestamp
    { tag: 4, value: data.total?.toFixed(2) || '0.00' }, // Total with VAT
    { tag: 5, value: (data.total ? data.total * 0.15 : 0).toFixed(2) }, // VAT amount (15%)
  ];
  
  // Encode to base64 (simplified - real implementation needs proper TLV encoding)
  const jsonStr = JSON.stringify(tlvData);
  return btoa(jsonStr);
};

// Generate full QR code value
const generateQRValue = (data: QRCodeData): string => {
  // For invoices, use ZATCA format if company/VAT is provided
  if (data.type === 'invoice' && data.company && data.vat) {
    return generateZATCAData(data);
  }
  
  // Default: use URL with embedded data
  const qrData = {
    t: data.type,
    i: data.id,
    n: data.number,
    d: data.date,
    a: data.total,
    c: data.currency,
    s: data.status,
    ...data.extra
  };
  
  // If URL is preferred, use it
  if (data.url) {
    return data.url;
  }
  
  // Otherwise, encode as JSON
  return JSON.stringify(qrData);
};

// Convert doc type to translation key (e.g., "journal_entry" -> "journalEntry")
const getDocTypeKey = (type: QRDocType): string => {
  const keyMap: Record<QRDocType, string> = {
    invoice: 'invoice',
    payment: 'payment',
    receipt: 'receipt',
    journal_entry: 'journalEntry',
    account: 'account',
    customer: 'customer',
    supplier: 'supplier',
    order: 'order',
    tenant: 'tenant',
    fund: 'fund',
  };
  return keyMap[type] || type;
};

export function QRCodeGenerator({
  data,
  size = 120,
  showLabel = true,
  showActions = true,
  variant = 'default',
  className,
  onScan,
}: QRCodeGeneratorProps) {
  const { t, direction, language } = useLanguage();
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  const qrValue = useMemo(() => generateQRValue(data), [data]);
  const qrUrl = useMemo(() => generateQRUrl(data), [data]);
  const docTypeKey = getDocTypeKey(data.type);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      toast.success(t('qrCode.copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(t('common.error'));
    }
  };

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = size * 2;
      canvas.height = size * 2;
      ctx?.drawImage(img, 0, 0, size * 2, size * 2);
      
      const link = document.createElement('a');
      link.download = `qr-${data.type}-${data.number || data.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success(t('qrCode.download'));
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${data.number || data.id}</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column;
              align-items: center; 
              justify-content: center; 
              min-height: 100vh;
              font-family: Arial, sans-serif;
            }
            .qr-container { text-align: center; }
            .qr-label { margin-top: 10px; font-size: 14px; color: #666; }
            .qr-number { font-size: 18px; font-weight: bold; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${svg.outerHTML}
            <div class="qr-label">${t(`qrCode.docTypes.${docTypeKey}`)}</div>
            <div class="qr-number">${data.number || data.id}</div>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t(`qrCode.docTypes.${docTypeKey}`)} - ${data.number || data.id}`,
          url: qrUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopy();
    }
  };

  // Compact variant - just the QR with tooltip
  if (variant === 'compact') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className={cn("gap-2", className)}>
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">QR</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end">
          <div className="flex flex-col items-center gap-3">
            <div ref={qrRef}>
              <QRCodeSVG
                value={qrValue}
                size={size}
                level="M"
                includeMargin={false}
              />
            </div>
            {showLabel && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  {t('qrCode.scanWithMobile')}
                </p>
                <p className="text-sm font-medium">{data.number || data.id}</p>
              </div>
            )}
            {showActions && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleShare}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Inline variant - small QR inline
  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center gap-2", className)} ref={qrRef}>
        <QRCodeSVG
          value={qrValue}
          size={40}
          level="L"
          includeMargin={false}
        />
        {showLabel && (
          <span className="text-xs text-muted-foreground">{data.number || data.id}</span>
        )}
      </div>
    );
  }

  // Card variant - full card with all info
  if (variant === 'card') {
    return (
      <Card className={cn("w-fit", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            {t('qrCode.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <div ref={qrRef} className="bg-white p-2 rounded-lg">
            <QRCodeSVG
              value={qrValue}
              size={size}
              level="M"
              includeMargin={false}
            />
          </div>
          
          <div className="text-center">
            <Badge variant="outline" className="mb-1">
              {t(`qrCode.docTypes.${docTypeKey}`)}
            </Badge>
            <p className="text-sm font-mono font-bold text-primary">
              {data.number || data.id}
            </p>
            {data.date && (
              <p className="text-xs text-muted-foreground">{data.date}</p>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Smartphone className="w-3 h-3" />
            <span>{t('qrCode.scanWithMobile')}</span>
          </div>

          {showActions && (
            <div className="flex gap-1 border-t pt-3 w-full justify-center">
              <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8 px-2">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handlePrint} className="h-8 px-2">
                <Printer className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShare} className="h-8 px-2">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div ref={qrRef} className="bg-white p-2 rounded-lg border">
        <QRCodeSVG
          value={qrValue}
          size={size}
          level="M"
          includeMargin={false}
        />
      </div>
      
      {showLabel && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {t('qrCode.title')}
          </p>
          <p className="text-sm font-mono font-bold">{data.number || data.id}</p>
        </div>
      )}

      {showActions && (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 w-7 p-0">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} className="h-7 w-7 p-0">
            <Download className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handlePrint} className="h-7 w-7 p-0">
            <Printer className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default QRCodeGenerator;
