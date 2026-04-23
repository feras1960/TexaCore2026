/**
 * ⚠️ License Expiry Banner — Shows warning when license is about to expire
 * Only shown in self-hosted mode
 */
import { useState, useEffect } from 'react';
import { isSelfHosted } from '@/lib/supabase';
import { AlertTriangle, X, Clock } from 'lucide-react';

declare global {
  interface Window {
    __TEXACORE_CONFIG__?: {
      mode?: string;
      [key: string]: any;
    };
  }
}

export function LicenseExpiryBanner() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [tier, setTier] = useState('');

  useEffect(() => {
    if (!isSelfHosted) return;

    // Read license from nginx-injected config or /etc/texacore/license.json
    try {
      const configStr = localStorage.getItem('texacore_license');
      if (configStr) {
        const license = JSON.parse(configStr);
        if (license.expires_at) {
          const days = Math.ceil((new Date(license.expires_at).getTime() - Date.now()) / 86400000);
          setDaysLeft(days);
          setTier(license.tier || '');
        }
      }
    } catch { /* ignore */ }

    // Also try fetching from health endpoint
    fetch('/health')
      .then(r => r.json())
      .then(data => {
        if (data.license?.expires_at) {
          const days = Math.ceil((new Date(data.license.expires_at).getTime() - Date.now()) / 86400000);
          setDaysLeft(days);
          setTier(data.license.tier || '');
          // Cache it
          localStorage.setItem('texacore_license', JSON.stringify(data.license));
        }
      })
      .catch(() => {});
  }, []);

  // Don't show if not self-hosted, dismissed, or > 7 days left
  if (!isSelfHosted || dismissed || daysLeft === null || daysLeft > 7) return null;

  const isExpired = daysLeft <= 0;
  const bgColor = isExpired
    ? 'bg-red-600'
    : daysLeft <= 3
    ? 'bg-orange-500'
    : 'bg-yellow-500';

  return (
    <div className={`${bgColor} text-white px-4 py-2 flex items-center justify-between text-sm z-50 relative`}>
      <div className="flex items-center gap-2">
        {isExpired ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
        <span>
          {isExpired
            ? `⚠️ انتهت صلاحية الترخيص${tier === 'trial' ? ' التجريبي' : ''}. يرجى تجديد الاشتراك للاستمرار.`
            : `⏰ ينتهي الترخيص${tier === 'trial' ? ' التجريبي' : ''} خلال ${daysLeft} يوم. جدّد الآن لتجنب الانقطاع.`
          }
        </span>
      </div>
      {!isExpired && (
        <button onClick={() => setDismissed(true)} className="hover:bg-white/20 rounded p-1">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
