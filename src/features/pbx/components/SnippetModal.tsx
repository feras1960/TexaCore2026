import { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { WebCallback } from '../pages/WebCallbacksPage';
import { Check, Copy, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SnippetModalProps {
    isOpen: boolean;
    onClose: () => void;
    callbackData: WebCallback;
}

export function SnippetModal({ isOpen, onClose, callbackData }: SnippetModalProps) {
    const { t, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const [copied, setCopied] = useState(false);

    // This snippet simulates how a user would embed the widget
    const snippetCode = `<!-- TexaCore PBX Web Callback Widget -->
<script>
  window.TexaCoreCallbackConfig = {
    widgetId: "${callbackData.id}",
    themeColor: "${callbackData.theme_color}",
    title: "${callbackData.title_text}",
    description: "${callbackData.description_text}",
    endpoint: "https://wzkklenfsaepegymfxfz.supabase.co/functions/v1/pbx-web-callback"
  };
</script>
<script src="https://cdn.texacore.com/widgets/callback.js" async defer></script>
<!-- End TexaCore PBX Web Callback Widget -->`;

    const handleCopy = () => {
        navigator.clipboard.writeText(snippetCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px]" dir={direction}>
                <DialogHeader>
                    <DialogTitle>{isRTL ? 'كود التضمين (Snippet)' : 'Embed Snippet'}</DialogTitle>
                    <DialogDescription>
                        {isRTL 
                            ? 'قم بنسخ الكود التالي ولصقه في قسم <head> أو قبل نهاية <body> في موقعك الإلكتروني.' 
                            : 'Copy and paste the following code into the <head> or right before the closing <body> tag of your website.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {callbackData.allowed_domains && callbackData.allowed_domains.length > 0 ? null : (
                        <Alert variant="destructive" className="bg-orange-50 text-orange-800 border-orange-200">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <AlertDescription className="text-xs ms-2">
                                {isRTL 
                                    ? 'تحذير أمني: لم تقم بتحديد نطاقات مسموحة. يمكن لأي شخص نسخ هذا الكود واستخدامه في موقعه واستنزاف رصيدك.' 
                                    : 'Security Warning: No allowed domains specified. Anyone can copy this code and use it on their website, which may abuse your balance.'}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="relative">
                        <pre className="p-4 bg-slate-950 text-slate-50 text-xs rounded-lg overflow-x-auto font-mono leading-relaxed" dir="ltr">
                            <code>{snippetCode}</code>
                        </pre>
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            className="absolute top-2 right-2 h-8 px-3 bg-white/10 hover:bg-white/20 text-white border-none"
                            onClick={handleCopy}
                        >
                            {copied ? <Check className="w-3.5 h-3.5 me-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 me-1.5" />}
                            {copied ? (isRTL ? 'تم النسخ' : 'Copied') : (isRTL ? 'نسخ الكود' : 'Copy')}
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{isRTL ? 'إغلاق' : 'Close'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
