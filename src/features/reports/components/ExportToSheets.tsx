/**
 * 📊 ExportToSheets — Button component to export data to Google Sheets
 */
import { useState } from 'react';
import { FileSpreadsheet, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cloudSupabase } from '@/lib/supabase';

interface Props {
  cloudCompanyId: string;
  title: string;
  headers: string[];
  rows: (string | number)[][];
  isAr?: boolean;
  className?: string;
}

export function ExportToSheets({ cloudCompanyId, title, headers, rows, isAr, className }: Props) {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await cloudSupabase.functions.invoke('google-integration', {
        body: {
          action: 'export_sheet',
          company_id: cloudCompanyId,
          title: `${title} — ${new Date().toLocaleDateString()}`,
          headers,
          rows,
        },
      });
      if (error) throw error;
      toast({
        title: isAr ? '✅ تم التصدير' : '✅ Exported to Sheets',
        description: (
          <a href={data?.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 underline">
            {isAr ? 'فتح الملف' : 'Open Sheet'} <ExternalLink className="w-3 h-3" />
          </a>
        ),
      });
    } catch (err: any) {
      toast({ title: '❌ Error', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" className={`gap-1.5 text-green-700 border-green-200 hover:bg-green-50 ${className || ''}`}
      onClick={handleExport} disabled={exporting}>
      {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
      {isAr ? 'تصدير لـ Sheets' : 'Export to Sheets'}
    </Button>
  );
}
