import { useEffect, useState } from 'react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export function useSupabase(pbxExtension: string) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const supabaseUrl = 'https://wzkklenfsaepegymfxfz.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2tsZW5mc2FlcGVneW1meGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTIxNzcsImV4cCI6MjA4NDMyODE3N30.ATYSK_WvOfbqEaInbg5nKau-wgixF0lIGaue3m8AJtI';

  useEffect(() => {
    const sb = createClient(supabaseUrl, supabaseKey);
    setClient(sb);

    // Channel 1: ERP Sync (config + dial from ERP)
    const syncChannel = sb.channel('pbx_softphone_sync', {
      config: { presence: { key: 'desktop_' + (pbxExtension || 'unconfigured') } }
    });

    syncChannel
      .on('broadcast', { event: 'softphone-config' }, (payload) => {
        console.log('[Realtime] Received softphone config!', payload);
        const data = payload.payload;
        if (data.domain && data.extension && data.password) {
          localStorage.setItem('pbx_domain', data.domain);
          localStorage.setItem('pbx_ext', data.extension);
          localStorage.setItem('pbx_pass', data.password);
          window.location.reload();
        }
      })
      .on('broadcast', { event: 'dial' }, (payload) => {
        console.log('[Realtime] Received dial command!', payload);
        const data = payload.payload;
        if (data.number) {
           const event = new CustomEvent('softphone-dial', { detail: data.number });
           window.dispatchEvent(event);
        }
      })
      .on('broadcast', { event: 'web-call' }, (payload) => {
        console.log('[Realtime] Web call request received!', payload);
        const data = payload.payload;
        if (data) {
          const event = new CustomEvent('softphone-web-call', { detail: data });
          window.dispatchEvent(event);
        }
      })
      .on('broadcast', { event: 'hangup' }, () => {
        console.log('[Realtime] Hangup command received!');
        const event = new CustomEvent('softphone-hangup');
        window.dispatchEvent(event);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Connected to ERP Sync Channel');
          if (pbxExtension) {
            await syncChannel.track({
              type: 'desktop_softphone',
              extension: pbxExtension,
              status: 'online',
              connected_at: new Date().toISOString()
            });
          }
        }
      });

    // Channel 2: Web Visitors (incoming calls from landing page via presenceChannel)
    const visitorsChannel = sb.channel('pbx_visitors');
    
    visitorsChannel
      .on('broadcast', { event: 'web-call' }, (payload) => {
        console.log('[Realtime] Web call via pbx_visitors!', payload);
        const data = payload.payload;
        if (data) {
          const event = new CustomEvent('softphone-web-call', { detail: data });
          window.dispatchEvent(event);
        }
      })
      .on('broadcast', { event: 'web_call_request' }, (payload) => {
        console.log('[Realtime] Web call request (legacy)!', payload);
        const data = payload.payload;
        if (data) {
          const event = new CustomEvent('softphone-web-call', { detail: data });
          window.dispatchEvent(event);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Listening for web visitor calls on pbx_visitors');
        }
      });

    // Channel 3: Extra notify channel (backup)
    const notifyChannel = sb.channel('pbx_softphone_sync_notify');
    
    notifyChannel
      .on('broadcast', { event: 'web-call' }, (payload) => {
        console.log('[Realtime] Web call via notify channel!', payload);
        const data = payload.payload;
        if (data) {
          const event = new CustomEvent('softphone-web-call', { detail: data });
          window.dispatchEvent(event);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Listening on notify channel');
        }
      });

    setChannel(syncChannel);

    return () => {
      sb.removeChannel(syncChannel);
      sb.removeChannel(visitorsChannel);
      sb.removeChannel(notifyChannel);
    };
  }, [pbxExtension]);

  return { client, channel };
}
