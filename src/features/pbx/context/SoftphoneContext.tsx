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
  makeCall: (targetNumber: string) => void;
  answerCall: () => void;
  hangupCall: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  transferCall: (targetNumber: string) => void;
}

// ─── Configuration ────────────────────────────────────────────
const PBX_CONFIG = {
  domain: import.meta.env.VITE_PBX_DOMAIN || 'pbx.texacore.ai',
  port: import.meta.env.VITE_PBX_WSS_PORT || '8089',
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
        connectionTimeout: 5,
        keepAliveInterval: 8,
        keepAliveDebounce: 3,
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
          // Go straight to full rebuild — don't waste time on stale reconnect
          if (!isRebuildingRef.current) {
            setTimeout(() => fullRebuild(), 50);
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
    if (isRebuildingRef.current || isDisposingRef.current) return;
    if (!navigator.onLine) {
      console.log('[Softphone] ⏳ Offline — will rebuild when online');
      return;
    }

    isRebuildingRef.current = true;
    const attempt = ++rebuildRetryRef.current;

    if (attempt > 10) {
      setState(prev => ({ ...prev, error: 'تعذر الاتصال بالسنترال' }));
      isRebuildingRef.current = false;
      setTimeout(() => { rebuildRetryRef.current = 0; isRebuildingRef.current = false; fullRebuild(); }, 30000);
      return;
    }

    console.log(`[Softphone] 🔄 Rebuild #${attempt}`);
    setState(prev => ({ ...prev, isRegistered: false, error: attempt > 1 ? 'جاري إعادة الاتصال...' : null }));

    // Teardown old — nullify refs FIRST to prevent races
    const oldReg = registererRef.current;
    const oldUA = userAgentRef.current;
    registererRef.current = null;
    userAgentRef.current = null;

    if (oldReg) { try { oldReg.dispose(); } catch (_) {} }
    if (oldUA) {
      isDisposingRef.current = true;
      try {
        const t = (oldUA as any).transport;
        // Kill keepAlive interval to stop WS spam
        if (t?._keepAliveInterval) { clearInterval(t._keepAliveInterval); t._keepAliveInterval = undefined; }
        const ws = t?.ws || t?._ws;
        if (ws && ws.readyState !== WebSocket.CLOSED) ws.close();
        // Fire-and-forget — don't await (SIP timers take 32s!)
        oldUA.stop().catch(() => {});
      } catch (_) {}
      // Brief pause to let WS close event fire
      await new Promise(r => setTimeout(r, 50));
      isDisposingRef.current = false;
    }

    // Build new
    try {
      const newUA = buildNewUA();
      if (!newUA) throw new Error('No UA');
      userAgentRef.current = newUA;
      await newUA.start();
      await registerUA(newUA);
      console.log('[Softphone] ✅ Connected!');
      setState(prev => ({ ...prev, error: null }));
      rebuildRetryRef.current = 0;
    } catch (e: any) {
      console.warn(`[Softphone] Rebuild #${attempt} failed:`, e.message);
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 15000);
      setTimeout(() => { isRebuildingRef.current = false; fullRebuild(); }, delay);
      return;
    }
    isRebuildingRef.current = false;
  }, [buildNewUA, registerUA]);

  // ─── Initialize SIP.js UserAgent ───────────────────────────
  useEffect(() => {
    if (!user) return;

    // Reset flags (HMR / StrictMode safe)
    isDisposingRef.current = false;
    isRebuildingRef.current = false;
    isReconnectingRef.current = false;
    rebuildRetryRef.current = 0;

    const sipUsername = import.meta.env.VITE_SIP_USERNAME || '100';
    const sipPassword = import.meta.env.VITE_SIP_PASSWORD || '';
    if (!sipPassword) { console.warn('[Softphone] No SIP password.'); return; }

    sipConfigRef.current = { username: sipUsername, password: sipPassword };

    const ua = buildNewUA();
    if (!ua) { console.error('[Softphone] Failed to create UA'); return; }
    userAgentRef.current = ua;

    ua.start()
      .then(() => { console.log('[Softphone] UA started'); return registerUA(ua); })
      .catch(err => {
        console.error('[Softphone] Start failed:', err);
        setState(prev => ({ ...prev, error: 'جاري إعادة الاتصال بالسنترال...' }));
        setTimeout(() => { isRebuildingRef.current = false; fullRebuild(); }, 2000);
      });

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
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const t = (userAgentRef.current as any)?.transport;
      const ws = t?.ws || t?._ws;
      if (!ws || ws.readyState !== WebSocket.OPEN) triggerRebuild('👁 Tab visible + WS dead');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    const conn = (navigator as any).connection;
    if (conn) conn.addEventListener('change', handleNetChange);

    return () => {
      isDisposingRef.current = true;
      isRebuildingRef.current = true;
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

  return (
    <SoftphoneContext.Provider value={{
      ...state,
      makeCall,
      answerCall,
      hangupCall,
      toggleMute,
      toggleHold,
      transferCall,
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
