import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { UserAgent, UserAgentOptions, Inviter, SessionState, Session, Invitation, Registerer, RegistererState } from 'sip.js';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────
interface SoftphoneState {
  isRegistered: boolean;
  activeCall: Session | null;
  callState: 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended';
  remoteNumber: string;
  callDirection: 'inbound' | 'outbound' | null;
  callStartTime: number | null;
  isMuted: boolean;
  isOnHold: boolean;
  error: string | null;
}

interface SoftphoneContextType extends SoftphoneState {
  isDesktopConnected: boolean;
  linkDesktopSoftphone: () => void;
  makeCall: (targetNumber: string) => void;
  dialViaDesktop: (targetNumber: string) => void;
  answerCall: () => void;
  hangupCall: () => void;
  toggleMute: () => void;
  transferCall: (targetNumber: string) => void;
  toggleHold: () => void;
  desktopCallState: { state: string; remoteNumber: string; duration: number } | null;
  hangupDesktopCall: () => void;
  notifyDesktopOfWebCall: (visitorId: string, deviceType: string) => void;
}

// ─── Configuration ────────────────────────────────────────────
const PBX_CONFIG = {
  domain: import.meta.env.VITE_PBX_DOMAIN || 'pbx.texacore.ai',
  port: import.meta.env.VITE_PBX_WSS_PORT || '8089',
  username: import.meta.env.VITE_SIP_USERNAME || '100',
  password: import.meta.env.VITE_SIP_PASSWORD || '',
  get websocketUrl() {
    return `wss://${this.domain}:${this.port}/ws`;
  },
};

const SoftphoneContext = createContext<SoftphoneContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────
export function SoftphoneProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userAgentRef = useRef<UserAgent | null>(null);
  const registererRef = useRef<Registerer | null>(null);
  const [state, setState] = useState<SoftphoneState>({
    isRegistered: false,
    activeCall: null,
    callState: 'idle',
    remoteNumber: '',
    callDirection: null,
    callStartTime: null,
    isMuted: false,
    isOnHold: false,
    error: null,
  });

  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Keep a ref to state for use in callbacks that can't re-render
  const stateRef = useRef(state);
  stateRef.current = state;

  // ─── Setup Remote Audio (SIP.js v0.21+ API) ─────────────────
  const setupRemoteMedia = useCallback((session: Session) => {
    const sdh = session.sessionDescriptionHandler as any;
    if (!sdh) {
      console.warn('[Softphone] No session description handler');
      return;
    }

    const pc = sdh.peerConnection as RTCPeerConnection;
    if (!pc) {
      console.warn('[Softphone] No peer connection');
      return;
    }

    // Listen for remote audio tracks
    pc.ontrack = (event: RTCTrackEvent) => {
      console.log('[Softphone] Got remote track:', event.track.kind);
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch((e) =>
          console.warn('[Softphone] Audio autoplay blocked:', e)
        );
      }
    };

    // Also check if tracks already exist (for late binding)
    const receivers = pc.getReceivers();
    const audioReceiver = receivers.find(r => r.track?.kind === 'audio');
    if (audioReceiver?.track && remoteAudioRef.current) {
      const stream = new MediaStream([audioReceiver.track]);
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.play().catch(() => {});
    }

    // Store local stream reference for mute/unmute
    const senders = pc.getSenders();
    const audioSender = senders.find(s => s.track?.kind === 'audio');
    if (audioSender?.track) {
      localStreamRef.current = new MediaStream([audioSender.track]);
    }
  }, []);

  // ─── Handle Session State Changes ──────────────────────────
  const attachSessionListeners = useCallback((session: Session, direction: 'inbound' | 'outbound') => {
    session.stateChange.addListener((newState: SessionState) => {
      console.log(`[Softphone] Session state: ${newState}`);
      switch (newState) {
        case SessionState.Establishing:
          setState(prev => ({ ...prev, callState: 'connecting' }));
          break;
        case SessionState.Established:
          setState(prev => ({
            ...prev,
            callState: 'connected',
            callStartTime: Date.now(),
          }));
          // Give a tiny delay for peerConnection to stabilize
          setTimeout(() => setupRemoteMedia(session), 200);
          break;
        case SessionState.Terminated:
          setState(prev => ({
            ...prev,
            activeCall: null,
            callState: 'idle',
            remoteNumber: '',
            callDirection: null,
            callStartTime: null,
            isMuted: false,
            isOnHold: false,
            error: null,
          }));
          localStreamRef.current = null;
          break;
      }
    });
  }, [setupRemoteMedia]);

  // ─── Reconnection Engine ────────────────────────────────────
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const isReconnectingRef = useRef(false);
  const isRebuildingRef = useRef(false);
  const isDisposingRef = useRef(false);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // ─── Create fresh UA + Registerer (used for init & rebuild) ──
  const sipConfigRef = useRef<{ username: string; password: string } | null>(null);
  const buildNewUA = useCallback(() => {
    const cfg = sipConfigRef.current;
    if (!cfg) return null;

    const uri = UserAgent.makeURI(`sip:${cfg.username}@${PBX_CONFIG.domain}`);
    if (!uri) return null;

    const ua = new UserAgent({
      authorizationPassword: cfg.password,
      authorizationUsername: cfg.username,
      transportOptions: {
        server: PBX_CONFIG.websocketUrl,
        connectionTimeout: 15,
        keepAliveInterval: 15, // Reduced from 25 to 15 to prevent strict NAT/proxy timeouts
        keepAliveDebounce: 10,
      },
      uri,
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionConfiguration: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
          ],
          iceCandidatePoolSize: 2,
        },
      },
      delegate: {
        onInvite: (invitation: Invitation) => {
          const caller = invitation.remoteIdentity.uri.user || 'Unknown';
          console.log('[Softphone] Incoming call from', caller);
          setState(prev => ({
            ...prev,
            activeCall: invitation,
            callState: 'ringing',
            remoteNumber: caller,
            callDirection: 'inbound',
          }));
          attachSessionListeners(invitation, 'inbound');
        },
        onDisconnect: (error?: Error) => {
          // Skip if we're intentionally disposing
          if (isDisposingRef.current) return;
          console.warn('[Softphone] ⚠️ Transport disconnected:', error?.message);
          
          setState(prev => ({ ...prev, isRegistered: false }));
          // Rebuild connection if disconnected unexpectedly
          if (!isRebuildingRef.current) {
            setTimeout(() => fullRebuild(), 1000);
          }
        },
      },
    });

    return ua;
  }, [attachSessionListeners]);

  const registerUA = useCallback(async (ua: UserAgent) => {
    const registerer = new Registerer(ua, { expires: 120 });
    registererRef.current = registerer;

    registerer.stateChange.addListener((newState) => {
      const registered = newState === RegistererState.Registered;
      setState(prev => ({ ...prev, isRegistered: registered }));
      console.log(`[Softphone] Registration state: ${newState}`);
    });

    await registerer.register();
  }, []);

  // ─── Full Rebuild (single reconnection strategy) ────────────
  const rebuildRetryRef = useRef(0);

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const fullRebuild = useCallback(async () => {
    // ═══ Browser SIP Registration Disabled ═══
    // Desktop softphone handles all SIP traffic.
    return;
  }, [buildNewUA, registerUA]);



  // ─── Initialize SIP.js UserAgent ───────────────────────────
  useEffect(() => {
    if (!user) return;

    // ⚡ TEST OVERRIDE: Prevent Softphone from starting if disabled
    if (localStorage.getItem('DISABLE_SOFTPHONE') === 'true') {
      console.log('[Softphone] Disabled via localStorage flag (DISABLE_SOFTPHONE=true). Remove flag to re-enable.');
      return;
    }

    // Reset flags (HMR / StrictMode safe)
    isDisposingRef.current = false;
    isRebuildingRef.current = false;
    isReconnectingRef.current = false;
    rebuildRetryRef.current = 0;

    const sipUsername = import.meta.env.VITE_SIP_USERNAME || '100';
    const sipPassword = import.meta.env.VITE_SIP_PASSWORD || '';
    if (!sipPassword) { console.warn('[Softphone] No SIP password.'); return; }

    // ═══ Skip browser SIP registration — Desktop Softphone handles all SIP calls ═══
    // The ERP browser should NOT register as a SIP endpoint because:
    // 1. The desktop softphone (Electron) is the primary SIP client for ext 100
    // 2. If both register, PBX randomly routes calls to either one
    // 3. The ERP communicates with the desktop via Supabase Realtime (dialViaDesktop)
    console.log('[Softphone] Browser SIP registration SKIPPED — Desktop softphone handles SIP calls.');
    console.log('[Softphone] Use Realtime (dialViaDesktop) to trigger calls via desktop app.');
    
    // Store config for Realtime-based desktop integration (linkDesktopSoftphone)
    sipConfigRef.current = { username: sipUsername, password: sipPassword };

    // ─── Network events ──────────────────────────────────────
    const triggerRebuild = (label: string) => {
      console.log(`[Softphone] ${label}`);
      rebuildRetryRef.current = 0;
      isRebuildingRef.current = false;
      setTimeout(() => fullRebuild(), 300);
    };
    const handleOnline = () => triggerRebuild('🌐 Online');
    const handleOffline = () => {
      console.log('[Softphone] 📴 Offline');
      setState(prev => ({ ...prev, isRegistered: false, error: 'لا يوجد اتصال بالإنترنت' }));
    };
    const handleNetChange = () => triggerRebuild('🔀 Network changed');
    
    // ─── Smart Tab Visibility Handler ─────────────────────────
    // When switching back to the tab, the browser needs time to restore
    // the WebSocket connection. We give a 1.5s grace period before checking.
    let visibilityTimer: ReturnType<typeof setTimeout> | null = null;
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') {
        // Tab going to background — clear any pending check
        if (visibilityTimer) { clearTimeout(visibilityTimer); visibilityTimer = null; }
        return;
      }
      
      // Tab became visible — wait briefly for browser to restore WS
      if (visibilityTimer) clearTimeout(visibilityTimer);
      visibilityTimer = setTimeout(async () => {
        visibilityTimer = null;
        const ua = userAgentRef.current;
        if (!ua) return;
        
        const t = (ua as any).transport;
        const ws = t?.ws || t?._ws;
        const wsAlive = ws && ws.readyState === WebSocket.OPEN;
        
        if (wsAlive) {
          // WS is still open — just verify registration
          console.log('[Softphone] 👁 Tab visible — WS alive, checking registration');
          const reg = registererRef.current;
          if (reg && reg.state !== RegistererState.Registered) {
            try { await reg.register(); } catch (_) {}
          }
          return;
        }
        
        // WS is dead — try soft reconnect first (transport.connect)
        console.log('[Softphone] 👁 Tab visible — WS dead, attempting soft reconnect...');
        
        // During an active call, try harder to reconnect without rebuilding
        if (stateRef.current.callState !== 'idle' && stateRef.current.callState !== 'ended') {
          console.log('[Softphone] ⚠️ Active call detected — trying transport reconnect only');
          try {
            if (t && typeof t.connect === 'function') {
              await t.connect();
              console.log('[Softphone] ✅ Transport reconnected during call');
              return;
            }
          } catch (_) {
            console.warn('[Softphone] Transport reconnect failed during call');
          }
          return; // Don't rebuild during a call
        }
        
        // No active call — try transport.connect first, then rebuild if needed
        try {
          if (t && typeof t.connect === 'function') {
            await t.connect();
            // Re-register after reconnect
            const reg = registererRef.current;
            if (reg) {
              try { await reg.register(); } catch (_) {}
            }
            console.log('[Softphone] ✅ Soft reconnect succeeded');
            return;
          }
        } catch (e) {
          console.log('[Softphone] Soft reconnect failed, doing full rebuild');
        }
        
        // Last resort: full rebuild
        triggerRebuild('👁 Tab visible + WS dead (after soft reconnect failed)');
      }, 1500); // 1.5s grace period for browser to restore WS
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    const conn = (navigator as any).connection;
    if (conn) conn.addEventListener('change', handleNetChange);

    return () => {
      isDisposingRef.current = true;
      isRebuildingRef.current = true;
      if (visibilityTimer) clearTimeout(visibilityTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (conn) conn.removeEventListener('change', handleNetChange);
      try { registererRef.current?.dispose(); } catch (_) {}
      try { userAgentRef.current?.stop(); } catch (_) {}
      userAgentRef.current = null;
      registererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ─── Make Outbound Call ────────────────────────────────────
  const makeCall = useCallback(async (targetNumber: string) => {
    const ua = userAgentRef.current;
    if (!ua) {
      setState(prev => ({ ...prev, error: 'Phone not connected' }));
      return;
    }

    const targetURI = UserAgent.makeURI(`sip:${targetNumber}@${PBX_CONFIG.domain}`);
    if (!targetURI) {
      setState(prev => ({ ...prev, error: 'Invalid number' }));
      return;
    }

    try {
      const inviter = new Inviter(ua, targetURI, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false,
          },
        },
        // Request audio codecs that Asterisk can handle
        earlyMedia: true,
      });

      setState(prev => ({
        ...prev,
        activeCall: inviter,
        callState: 'connecting',
        remoteNumber: targetNumber,
        callDirection: 'outbound',
        error: null,
      }));

      attachSessionListeners(inviter, 'outbound');
      await inviter.invite();
    } catch (error) {
      console.error('[Softphone] Call failed:', error);
      setState(prev => ({
        ...prev,
        activeCall: null,
        callState: 'idle',
        remoteNumber: '',
        callDirection: null,
        error: 'Call failed',
      }));
    }
  }, [attachSessionListeners]);

  // ─── Answer Incoming Call ──────────────────────────────────
  const answerCall = useCallback(async () => {
    if (!state.activeCall || !(state.activeCall instanceof Invitation)) return;

    try {
      await state.activeCall.accept({
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false,
          },
        },
      });
    } catch (error) {
      console.error('[Softphone] Answer failed:', error);
      setState(prev => ({ ...prev, error: 'Failed to answer call' }));
    }
  }, [state.activeCall]);

  // ─── Hangup / Reject Call ─────────────────────────────────
  const hangupCall = useCallback(async () => {
    if (!state.activeCall) return;

    try {
      if (state.activeCall instanceof Inviter) {
        if (state.activeCall.state === SessionState.Established) {
          await state.activeCall.bye();
        } else if (
          state.activeCall.state === SessionState.Initial ||
          state.activeCall.state === SessionState.Establishing
        ) {
          await state.activeCall.cancel();
        }
      } else if (state.activeCall instanceof Invitation) {
        if (state.activeCall.state === SessionState.Established) {
          await state.activeCall.bye();
        } else if (state.activeCall.state === SessionState.Initial) {
          await state.activeCall.reject();
        }
      }
    } catch (error) {
      console.error('[Softphone] Hangup error:', error);
    }

    setState(prev => ({
      ...prev,
      activeCall: null,
      callState: 'idle',
      remoteNumber: '',
      callDirection: null,
      callStartTime: null,
      isMuted: false,
      isOnHold: false,
      error: null,
    }));
  }, [state.activeCall]);

  // ─── Toggle Mute ──────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const session = state.activeCall;
    if (!session) return;

    const sdh = session.sessionDescriptionHandler as any;
    const pc = sdh?.peerConnection as RTCPeerConnection;
    if (!pc) return;

    const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio');
    if (audioSender?.track) {
      audioSender.track.enabled = !audioSender.track.enabled;
      setState(prev => ({ ...prev, isMuted: !audioSender.track!.enabled }));
    }
  }, [state.activeCall]);

  // ─── Toggle Hold ───────────────────────────────────────────
  const toggleHold = useCallback(async () => {
    const session = state.activeCall;
    if (!session || session.state !== SessionState.Established) return;

    try {
      const isCurrentlyOnHold = state.isOnHold;
      const holdModifier = (description: RTCSessionDescriptionInit) => {
        if (!description.sdp) return Promise.resolve(description);
        // If putting on hold, change sendrecv to sendonly (or inactive).
        // If unholding, change sendonly/inactive back to sendrecv.
        if (!isCurrentlyOnHold) {
          description.sdp = description.sdp.replace(/a=sendrecv/g, 'a=sendonly');
        } else {
          description.sdp = description.sdp.replace(/a=sendonly/g, 'a=sendrecv');
          description.sdp = description.sdp.replace(/a=inactive/g, 'a=sendrecv');
        }
        return Promise.resolve(description);
      };

      await session.invite({
        sessionDescriptionHandlerModifiers: [holdModifier],
      });

      setState(prev => ({ ...prev, isOnHold: !prev.isOnHold }));
    } catch (error) {
      console.error('[Softphone] Hold/Unhold failed:', error);
      setState(prev => ({ ...prev, error: 'فشل في وضع المكالمة على الانتظار' }));
    }
  }, [state.activeCall, state.isOnHold]);

  // ─── Transfer Call (Blind Transfer) ────────────────────────
  const transferCall = useCallback(async (targetNumber: string) => {
    const session = state.activeCall;
    if (!session || session.state !== SessionState.Established) return;

    const targetURI = UserAgent.makeURI(`sip:${targetNumber}@${PBX_CONFIG.domain}`);
    if (!targetURI) {
      setState(prev => ({ ...prev, error: 'رقم غير صحيح للتحويل' }));
      return;
    }

    try {
      await session.refer(targetURI);
      console.log(`[Softphone] Call transferred to ${targetNumber}`);
      // The session will automatically terminate once transfer is accepted by PBX
    } catch (error) {
      console.error('[Softphone] Transfer failed:', error);
      setState(prev => ({ ...prev, error: 'فشل في تحويل المكالمة' }));
    }
  }, [state.activeCall]);

  // ─── Desktop Softphone Integration ──────────────────────────
  const [isDesktopConnected, setIsDesktopConnected] = useState(false);
  const [desktopCallState, setDesktopCallState] = useState<{ state: string; remoteNumber: string; duration: number } | null>(null);
  const realtimeClientRef = useRef<any>(null);
  const syncChannelRef = useRef<any>(null);

  useEffect(() => {
    import('@supabase/supabase-js').then(({ createClient }) => {
      const pbxRealtimeClient = createClient(
        import.meta.env.VITE_CLOUD_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '',
        import.meta.env.VITE_CLOUD_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
      );
      
      realtimeClientRef.current = pbxRealtimeClient;
      
      const channel = pbxRealtimeClient.channel('pbx_softphone_sync');
      syncChannelRef.current = channel;
      
      channel.on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        let desktopFound = false;
        Object.keys(presenceState).forEach((key) => {
          const presences = presenceState[key] as any[];
          if (presences.some(p => p.type === 'desktop_softphone' && p.extension === PBX_CONFIG.username)) {
            desktopFound = true;
          }
        });
        setIsDesktopConnected(desktopFound);
        // Reset desktop call state if disconnected
        if (!desktopFound) setDesktopCallState(null);
      });

      channel.on('broadcast', { event: 'desktop_call_state' }, (payload) => {
        if (payload.payload) {
          setDesktopCallState(payload.payload);
        }
      });

      channel.subscribe((status: string) => {
        console.log('[SoftphoneContext] Sync channel status:', status);
      });
      
      return () => {
        pbxRealtimeClient.removeChannel(channel);
      };
    });
  }, []);

  const linkDesktopSoftphone = useCallback(() => {
    const channel = syncChannelRef.current;
    if (!channel) {
      console.error('[SoftphoneContext] Sync channel not ready');
      return;
    }
    
    const config = {
      domain: PBX_CONFIG.domain,
      extension: PBX_CONFIG.username,
      password: PBX_CONFIG.password
    };
    
    console.log('[SoftphoneContext] Sending config to Desktop App:', { domain: config.domain, extension: config.extension });
    
    channel.send({
      type: 'broadcast',
      event: 'softphone-config',
      payload: config
    }).then(() => {
      console.log('[SoftphoneContext] ✅ Config broadcast sent successfully');
    }).catch((err: any) => {
      console.error('[SoftphoneContext] ❌ Broadcast failed:', err);
    });
  }, []);

  const dialViaDesktop = useCallback((targetNumber: string) => {
    const channel = syncChannelRef.current;
    if (!channel) {
      console.error('[SoftphoneContext] Sync channel not ready for dial');
      return;
    }
    
    console.log('[SoftphoneContext] Sending dial command to Desktop:', targetNumber);
    
    channel.send({
      type: 'broadcast',
      event: 'dial',
      payload: { number: targetNumber }
    }).then(() => {
      console.log('[SoftphoneContext] ✅ Dial command sent to desktop softphone');
    }).catch((err: any) => {
      console.error('[SoftphoneContext] ❌ Dial broadcast failed:', err);
    });
  }, []);

  const hangupDesktopCall = useCallback(() => {
    const channel = syncChannelRef.current;
    if (!channel) return;
    
    channel.send({
      type: 'broadcast',
      event: 'hangup',
      payload: {}
    }).catch(console.error);
  }, []);

  const notifyDesktopOfWebCall = useCallback((visitorId: string, deviceType: string) => {
    const channel = syncChannelRef.current;
    if (!channel) return;
    
    channel.send({
      type: 'broadcast',
      event: 'web-call',
      payload: { visitor_id: visitorId, device_type: deviceType }
    }).catch(console.error);
  }, []);

  return (
    <SoftphoneContext.Provider value={{
      ...state,
      isDesktopConnected,
      linkDesktopSoftphone,
      makeCall,
      dialViaDesktop,
      answerCall,
      hangupCall,
      toggleMute,
      toggleHold,
      transferCall,
      desktopCallState,
      hangupDesktopCall,
      notifyDesktopOfWebCall,
    }}>
      {children}
      <audio ref={remoteAudioRef} autoPlay hidden />
    </SoftphoneContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────
export const useSoftphone = () => {
  const context = useContext(SoftphoneContext);
  if (context === undefined) {
    throw new Error('useSoftphone must be used within a SoftphoneProvider');
  }
  return context;
};
