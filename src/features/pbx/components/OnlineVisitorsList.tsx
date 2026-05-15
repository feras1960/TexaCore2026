import React, { useEffect, useState, useRef } from 'react';
import { Globe, PhoneCall, Clock, CheckCircle2, Smartphone, Monitor, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSoftphone } from '../context/SoftphoneContext';
import { createClient } from '@supabase/supabase-js';

// إنشاء عميل خاص بسحاب سوبابيز لضمان عمل الاتصال لحظياً (Realtime) 
// لتخطي أي تعطيل يحدث في البيئة المحلية للعميل الافتراضي
const pbxRealtimeClient = createClient(
  import.meta.env.VITE_CLOUD_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_CLOUD_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface VisitorPresence {
  uuid: string;
  status: 'online' | 'offline';
  url: string;
  timestamp: string;
  device?: string;
  browser?: string;
  page_title?: string;
  referrer?: string;
  ip?: string;
  country?: string;
}

function ResolvedCountryBadge({ ip }: { ip: string }) {
  const [info, setInfo] = useState<{ country: string; flag: string } | null>(null);

  useEffect(() => {
    if (!ip || ip === 'unknown' || ip === 'غير معروف' || ip === '') return;
    
    // Use ipapi.co to resolve the IP to a country
    fetch(`https://ipapi.co/${ip}/json/`)
      .then(r => r.json())
      .then(d => {
        if (d.country_name) {
          const flag = d.country
            ? String.fromCodePoint(...[...d.country.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
            : '🌍';
          setInfo({ country: d.country_name, flag });
        }
      })
      .catch(() => {});
  }, [ip]);

  if (!info) return null;

  return (
    <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded animate-in fade-in">
      {info.flag} {info.country}
    </span>
  );
}

export function OnlineVisitorsList() {
  const [visitors, setVisitors] = useState<VisitorPresence[]>([]);
  const [callingUuid, setCallingUuid] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const channelRef = useRef<any>(null);
  const { isDesktopConnected, dialViaDesktop } = useSoftphone();

  useEffect(() => {
    const channel = pbxRealtimeClient.channel('pbx_visitors');
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeVisitors: VisitorPresence[] = [];
        
        console.log('[PBX-Visitors] Presence sync, raw state:', JSON.stringify(state));
        
        for (const id in state) {
          // @ts-ignore
          const presenceList = state[id] as VisitorPresence[];
          if (presenceList.length > 0) {
            activeVisitors.push(presenceList[0]);
          }
        }
        
        // Sort by most recent timestamp
        activeVisitors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setVisitors(activeVisitors);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[PBX-Visitors] ✅ Visitor joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[PBX-Visitors] 🔴 Visitor left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        console.log('[PBX-Visitors] Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('error');
        }
      });

    return () => {
      pbxRealtimeClient.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

  const handleReconnect = () => {
    setConnectionStatus('connecting');
    if (channelRef.current) {
      pbxRealtimeClient.removeChannel(channelRef.current);
    }
    const channel = pbxRealtimeClient.channel('pbx_visitors');
    channelRef.current = channel;
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeVisitors: VisitorPresence[] = [];
        for (const id in state) {
          // @ts-ignore
          const presenceList = state[id] as VisitorPresence[];
          if (presenceList.length > 0) {
            activeVisitors.push(presenceList[0]);
          }
        }
        activeVisitors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setVisitors(activeVisitors);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[PBX-Visitors] ✅ Visitor joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[PBX-Visitors] 🔴 Visitor left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          toast.success('تم إعادة الاتصال بنجاح');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('error');
        }
      });
  };

  const handleCallVisitor = async (visitor: VisitorPresence) => {
    setCallingUuid(visitor.uuid);
    toast.loading('جاري إرسال طلب الاتصال للزائر...', { id: 'call-visitor' });

    try {
      if (!channelRef.current) {
        throw new Error('القناة غير متصلة');
      }
      
      // Send incoming_call to visitor's browser
      // The visitor's browser will then dial 700 on PBX → routes to ext 100 → softphone rings
      await channelRef.current.send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: {
          to_uuid: visitor.uuid,
          agent_ext: '100'
        }
      });
      
      toast.success(
        isDesktopConnected 
          ? 'تم إرسال الطلب! سيرن السوفت فون عند قبول الزائر.' 
          : 'تم إرسال الطلب! المتصفح سيرن لديه الآن.', 
        { id: 'call-visitor' }
      );
    } catch (error) {
      console.error('Error broadcasting call to visitor:', error);
      toast.error('حدث خطأ أثناء إرسال الطلب.', { id: 'call-visitor' });
    } finally {
      setTimeout(() => setCallingUuid(null), 3000);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const getDeviceIcon = (device?: string) => {
    if (device === 'mobile') return <Smartphone className="w-3.5 h-3.5 text-blue-500" />;
    return <Monitor className="w-3.5 h-3.5 text-gray-500" />;
  };

  const getStatusDot = () => {
    if (connectionStatus === 'connected') return 'bg-emerald-500';
    if (connectionStatus === 'connecting') return 'bg-yellow-500 animate-pulse';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-500" />
          زوار الموقع المتصلين
          <span className={`w-2 h-2 rounded-full ${getStatusDot()}`} title={connectionStatus} />
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleReconnect}
            title="إعادة اتصال"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
            {visitors.length} نشط
          </Badge>
        </div>
      </div>

      {visitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <Globe className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">لا يوجد زوار متصلين بالموقع حالياً</p>
          {connectionStatus === 'error' && (
            <Button variant="outline" size="sm" className="mt-3" onClick={handleReconnect}>
              <RefreshCw className="w-3.5 h-3.5 ml-1" /> إعادة الاتصال
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visitors.map((visitor) => (
            <div 
              key={visitor.uuid} 
              className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:border-emerald-200 hover:shadow-sm transition-all group"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {getDeviceIcon(visitor.device)}
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-sm font-semibold text-gray-700">
                    {visitor.device === 'mobile' ? 'زائر (جوال)' : 'زائر (كمبيوتر)'}
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    #{visitor.uuid.substring(0, 6)}
                  </span>
                  {visitor.browser && (
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                      {visitor.browser}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatTime(visitor.timestamp)}
                  </span>
                  <span className="truncate max-w-[120px] text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                    {visitor.url}
                  </span>
                  
                  {visitor.country && visitor.country !== '' && visitor.country !== 'غير معروف' ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      🌍 {visitor.country}
                    </span>
                  ) : visitor.ip && visitor.ip !== '' && visitor.ip !== 'غير معروف' ? (
                    <ResolvedCountryBadge ip={visitor.ip} />
                  ) : null}

                  {visitor.ip && visitor.ip !== '' && visitor.ip !== 'غير معروف' && (
                    <span className="font-mono text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                      IP: {visitor.ip}
                    </span>
                  )}
                </div>
              </div>

              <Button 
                size="sm" 
                variant={callingUuid === visitor.uuid ? "outline" : "default"}
                className={`h-8 gap-1.5 text-xs transition-all ${callingUuid === visitor.uuid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-900 text-white hover:bg-emerald-600'}`}
                onClick={() => handleCallVisitor(visitor)}
                disabled={callingUuid === visitor.uuid}
              >
                {callingUuid === visitor.uuid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> جاري الرنين
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-3.5 h-3.5" /> اتصال
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
