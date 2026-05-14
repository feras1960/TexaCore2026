import { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { WebRTCWidget } from '../pages/WebRTCWidgetsPage';
import { Check, Copy, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCompany } from '@/hooks/useCompany';

interface WebRTCSnippetModalProps {
    isOpen: boolean;
    onClose: () => void;
    widgetData: WebRTCWidget;
}

export function WebRTCSnippetModal({ isOpen, onClose, widgetData }: WebRTCSnippetModalProps) {
    const { t, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';
    const [copied, setCopied] = useState(false);

    // Calculate the tenant prefix assuming it's the first 8 characters of companyId
    const tenantPrefix = companyId ? companyId.substring(0, 8) : 'TENANT';

    // This snippet simulates how a user would embed the WebRTC widget
    const snippetCode = `<!-- TexaCore PBX WebRTC Click-to-Call Widget -->
<script>
  window.TexaCoreWebRTCConfig = {
    widgetId: "${widgetData.id}",
    themeColor: "${widgetData.theme_color}",
    buttonText: "${widgetData.button_text}",
    pbxDomain: "pbx.texacore.ai",
    tenantPrefix: "${tenantPrefix}",
    targetDestination: "${widgetData.target_destination}"
  };
</script>
<script src="https://cdn.texacore.com/widgets/webrtc-call.js" async defer></script>
<!-- End TexaCore PBX WebRTC Click-to-Call Widget -->`;

    const handleCopy = () => {
        navigator.clipboard.writeText(snippetCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[650px]" dir={direction}>
                <DialogHeader>
                    <DialogTitle>{isRTL ? 'كود التضمين (WebRTC Snippet)' : 'WebRTC Embed Snippet'}</DialogTitle>
                    <DialogDescription>
                        {isRTL 
                            ? 'قم بنسخ هذا الكود ولصقه في موقعك الإلكتروني. سيظهر زر اتصال يمكن الزوار من التحدث إليك مجاناً عبر المتصفح.' 
                            : 'Copy and paste this code into your website. A call button will appear allowing visitors to speak to you for free via their browser.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {widgetData.allowed_domains && widgetData.allowed_domains.length > 0 ? null : (
                        <Alert variant="destructive" className="bg-orange-50 text-orange-800 border-orange-200">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <AlertDescription className="text-xs ms-2">
                                {isRTL 
                                    ? 'تحذير أمني: لم تقم بتحديد نطاقات مسموحة. يمكن لأي شخص نسخ هذا الكود واستخدامه للاتصال بمقسمك من أي موقع آخر.' 
                                    : 'Security Warning: No allowed domains specified. Anyone can copy this code and call your PBX from any other website.'}
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
