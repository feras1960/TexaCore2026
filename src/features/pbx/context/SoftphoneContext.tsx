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
  error: string | null;
}

interface SoftphoneContextType extends SoftphoneState {
  makeCall: (targetNumber: string) => void;
  answerCall: () => void;
  hangupCall: () => void;
  toggleMute: () => void;
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

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const doReconnect = useCallback(() => {
    const ua = userAgentRef.current;
    if (!ua || isReconnectingRef.current) return;

    isReconnectingRef.current = true;
    const attempt = ++reconnectAttemptRef.current;
    // Exponential backoff: 1s, 2s, 4s, 8s (max)
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);

    console.log(`[Softphone] Reconnect attempt #${attempt} in ${delay}ms...`);

    clearReconnectTimer();
    reconnectTimerRef.current = setTimeout(async () => {
      try {
        await ua.reconnect();
        console.log('[Softphone] ✅ Reconnected to WebSocket');
        await registererRef.current?.register();
        console.log('[Softphone] ✅ Re-registered');
        reconnectAttemptRef.current = 0; // Reset on success
      } catch (e: any) {
        console.warn(`[Softphone] ❌ Reconnect #${attempt} failed:`, e.message);
        // Keep trying
        isReconnectingRef.current = false;
        doReconnect();
        return;
      }
      isReconnectingRef.current = false;
    }, delay);
  }, [clearReconnectTimer]);

  // ─── Full Rebuild (for network switch) ─────────────────────
  const fullRebuild = useCallback(async () => {
    console.log('[Softphone] 🔄 Network changed — smart reconnect');
    const ua = userAgentRef.current;
    if (!ua) return;

    clearReconnectTimer();
    isReconnectingRef.current = false;
    reconnectAttemptRef.current = 0;

    setState(prev => ({ ...prev, isRegistered: false }));

    // Wait a moment for the new network to stabilize
    await new Promise(r => setTimeout(r, 800));

    // Strategy: just reconnect the transport (don't kill the UA)
    // This preserves any active call sessions
    try {
      await ua.reconnect();
      console.log('[Softphone] ✅ Transport reconnected on new network');
      await registererRef.current?.register();
      console.log('[Softphone] ✅ Re-registered on new network');

      // If there's an active call, re-setup the media
      // (the old ICE candidates may be stale on the new network)
      const activeSession = stateRef.current.activeCall;
      if (activeSession && activeSession.state === SessionState.Established) {
        console.log('[Softphone] 📞 Active call detected — refreshing media...');
        try {
          const sdh = activeSession.sessionDescriptionHandler as any;
          const pc = sdh?.peerConnection as RTCPeerConnection;
          if (pc) {
            // Request ICE restart to get fresh candidates for new network
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            console.log('[Softphone] ✅ ICE restart initiated for active call');
          }
          // Re-setup remote audio element
          setTimeout(() => setupRemoteMedia(activeSession), 500);
        } catch (e: any) {
          console.warn('[Softphone] Media refresh failed:', e.message);
        }
      }
    } catch (e: any) {
      console.warn('[Softphone] Smart reconnect failed, trying full rebuild...', e.message);
      // Only if reconnect fails, do a full stop/start (will kill active calls)
      try {
        registererRef.current?.unregister().catch(() => {});
        await ua.stop();
      } catch { /* ignore */ }
      await new Promise(r => setTimeout(r, 500));
      try {
        await ua.start();
        await registererRef.current?.register();
        console.log('[Softphone] ✅ Full rebuild complete');
      } catch {
        doReconnect();
      }
    }
  }, [clearReconnectTimer, doReconnect, setupRemoteMedia]);

  // ─── Initialize SIP.js UserAgent ───────────────────────────
  useEffect(() => {
    if (!user) return;

    const sipUsername = import.meta.env.VITE_SIP_USERNAME || '100';
    const sipPassword = import.meta.env.VITE_SIP_PASSWORD || 'TexaCore2026Pbx100';

    if (!sipPassword) {
      console.warn('[Softphone] No SIP password configured.');
      return;
    }

    const uri = UserAgent.makeURI(`sip:${sipUsername}@${PBX_CONFIG.domain}`);
    if (!uri) {
      console.error('[Softphone] Failed to create SIP URI');
      return;
    }

    const options: UserAgentOptions = {
      authorizationPassword: sipPassword,
      authorizationUsername: sipUsername,
      transportOptions: {
        server: PBX_CONFIG.websocketUrl,
        // ─── Aggressive reconnect settings ─────────────
        connectionTimeout: 8,           // 8 seconds to connect
        keepAliveInterval: 15,           // Ping every 15s (detect drops faster)
        keepAliveDebounce: 5,            // Debounce 5s
      },
      uri: uri,
      // ─── WebRTC media options: ICE/STUN for NAT traversal ──
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionConfiguration: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
          ],
          // ICE candidate pool for faster reconnection
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
        // Handle disconnect events — trigger fast reconnect
        onDisconnect: (error?: Error) => {
          console.warn('[Softphone] ⚠️ Transport disconnected:', error?.message);
          setState(prev => ({ ...prev, isRegistered: false }));
          // Start progressive reconnect immediately
          isReconnectingRef.current = false;
          reconnectAttemptRef.current = 0;
          doReconnect();
        },
      },
    };

    const ua = new UserAgent(options);
    userAgentRef.current = ua;

    ua.start()
      .then(() => {
        console.log('[Softphone] UserAgent started');
        const registerer = new Registerer(ua, {
          expires: 120,     // Register for 2 minutes (refresh more often)
          extraHeaders: [],
        });
        registererRef.current = registerer;

        registerer.stateChange.addListener((newState) => {
          const registered = newState === RegistererState.Registered;
          setState(prev => ({ ...prev, isRegistered: registered }));
          if (registered) {
            reconnectAttemptRef.current = 0; // Reset counter on successful register
          }
          console.log(`[Softphone] Registration state: ${newState}`);
        });

        return registerer.register();
      })
      .catch(error => {
        console.error('[Softphone] Failed to start:', error);
        setState(prev => ({ ...prev, error: 'Failed to connect to PBX' }));
        // Try reconnecting even on initial failure
        doReconnect();
      });

    // ─── Network Change Detection ────────────────────────────
    // When browser goes online after being offline
    const handleOnline = () => {
      console.log('[Softphone] 🌐 Network ONLINE — triggering full rebuild');
      fullRebuild();
    };

    const handleOffline = () => {
      console.log('[Softphone] 📴 Network OFFLINE');
      clearReconnectTimer();
      setState(prev => ({ ...prev, isRegistered: false }));
    };

    // Detect network type changes (WiFi → Mobile, etc.)
    const handleConnectionChange = () => {
      const conn = (navigator as any).connection;
      console.log(`[Softphone] 🔀 Network changed: type=${conn?.type}, effectiveType=${conn?.effectiveType}`);
      // Full rebuild to get fresh ICE candidates for the new network
      fullRebuild();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // NetworkInformation API (Chrome/Edge/Android)
    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener('change', handleConnectionChange);
    }

    return () => {
      clearReconnectTimer();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) {
        conn.removeEventListener('change', handleConnectionChange);
      }
      registererRef.current?.unregister().catch(() => {});
      ua.stop().catch(() => {});
      userAgentRef.current = null;
      registererRef.current = null;
    };
  }, [user, attachSessionListeners, doReconnect, fullRebuild, clearReconnectTimer]);

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

  return (
    <SoftphoneContext.Provider value={{
      ...state,
      makeCall,
      answerCall,
      hangupCall,
      toggleMute,
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
