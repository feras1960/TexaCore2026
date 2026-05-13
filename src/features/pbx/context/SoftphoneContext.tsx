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
        // ─── Auto-reconnect on WebSocket drop ─────────────
        connectionTimeout: 10,        // 10 seconds to connect
        keepAliveInterval: 30,         // Send keep-alive every 30s
        keepAliveDebounce: 10,         // Debounce keep-alive by 10s
      },
      uri: uri,
      // ─── WebRTC media options: ICE/STUN for NAT traversal ──
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionConfiguration: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
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
        // Handle disconnect events
        onDisconnect: (error?: Error) => {
          console.warn('[Softphone] Transport disconnected:', error?.message);
          setState(prev => ({ ...prev, isRegistered: false }));
          // Auto-reconnect after 3 seconds
          setTimeout(() => {
            const ua = userAgentRef.current;
            if (ua) {
              console.log('[Softphone] Attempting reconnect...');
              ua.reconnect().then(() => {
                console.log('[Softphone] Reconnected, re-registering...');
                registererRef.current?.register().catch(() => {});
              }).catch((e) => {
                console.warn('[Softphone] Reconnect failed:', e.message);
              });
            }
          }, 3000);
        },
      },
    };

    const ua = new UserAgent(options);
    userAgentRef.current = ua;

    ua.start()
      .then(() => {
        console.log('[Softphone] UserAgent started');
        const registerer = new Registerer(ua, {
          expires: 300,   // Register for 5 minutes
          extraHeaders: [],
        });
        registererRef.current = registerer;

        registerer.stateChange.addListener((newState) => {
          const registered = newState === RegistererState.Registered;
          setState(prev => ({ ...prev, isRegistered: registered }));
          console.log(`[Softphone] Registration state: ${newState}`);
        });

        return registerer.register();
      })
      .catch(error => {
        console.error('[Softphone] Failed to start:', error);
        setState(prev => ({ ...prev, error: 'Failed to connect to PBX' }));
      });

    return () => {
      registererRef.current?.unregister().catch(() => {});
      ua.stop().catch(() => {});
      userAgentRef.current = null;
      registererRef.current = null;
    };
  }, [user, attachSessionListeners]);

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
