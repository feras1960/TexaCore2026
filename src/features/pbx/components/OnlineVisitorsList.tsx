import React, { useEffect, useState, useRef } from 'react';
import { cloudSupabase } from '@/lib/supabase';
import { Globe, PhoneCall, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
}

export function OnlineVisitorsList() {
  const [visitors, setVisitors] = useState<VisitorPresence[]>([]);
  const [callingUuid, setCallingUuid] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
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
            // Only keep the most recent state for this uuid
            activeVisitors.push(presenceList[0]);
          }
        }
        
        // Sort by most recent timestamp
        activeVisitors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setVisitors(activeVisitors);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Visitor joined', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Visitor left', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to PBX Visitors presence');
        }
      });

    return () => {
      pbxRealtimeClient.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

  const handleCallVisitor = async (visitor: VisitorPresence) => {
    setCallingUuid(visitor.uuid);
    toast.loading('جاري إرسال طلب الاتصال للزائر...', { id: 'call-visitor' });

    try {
      if (!channelRef.current) {
        throw new Error('القناة غير متصلة');
      }
      
      // Send a broadcast to the specific visitor using their UUID via the active subscribed channel
      await channelRef.current.send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: {
          to_uuid: visitor.uuid,
          agent_ext: '700' // Changed to 700 (Ring Group) to prevent Asterisk 403 Forbidden for guests
        }
      });
      
      toast.success('تم إرسال الطلب بنجاح! المتصفح سيرن لديه الآن.', { id: 'call-visitor' });
    } catch (error) {
      console.error('Error broadcasting call to visitor:', error);
      toast.error('حدث خطأ أثناء إرسال الطلب.', { id: 'call-visitor' });
    } finally {
      setTimeout(() => setCallingUuid(null), 3000);
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-500" />
          زوار الموقع المتصلين
        </h3>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
          {visitors.length} نشط
        </Badge>
      </div>

      {visitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <Globe className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">لا يوجد زوار متصلين بالموقع حالياً</p>
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
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-mono text-gray-500">
                    {visitor.uuid.split('-')[0]}...
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatTime(visitor.timestamp)}
                  </span>
                  <span className="truncate max-w-[120px] text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                    {visitor.url}
                  </span>
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
