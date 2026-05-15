import { useEffect, useRef, useState, useCallback } from 'react';
import { UserAgent, Registerer, Inviter, SessionState, RegistererState, Invitation, Session } from 'sip.js';
import { useCallHistory } from './useCallHistory';

export function useSipEngine(remoteOverride?: string) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'connected' | 'ended' | 'ringing'>('idle');
  const [activeNumber, setActiveNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  
  const { addCallRecord } = useCallHistory();
  const callStartTimeRef = useRef<number>(0);
  const callDirectionRef = useRef<'inbound' | 'outbound'>('outbound');
  
  const overrideRef = useRef<string | undefined>();
  useEffect(() => { overrideRef.current = remoteOverride; }, [remoteOverride]);
  
  const uaRef = useRef<UserAgent | null>(null);
  const registererRef = useRef<Registerer | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Ringtone generator
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const startRingtone = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    
    const playChime = () => {
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    };

    playChime();
    ringtoneIntervalRef.current = setInterval(playChime, 3000);
  };

  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  };

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.autoplay = true;

    connectSip();

    return () => {
      if (registererRef.current) {
        try { registererRef.current.dispose(); } catch(e) {}
      }
      if (uaRef.current) {
        try { uaRef.current.stop(); } catch(e) {}
      }
      stopRingtone();
    };
  }, []);

  const handleCallEnd = () => {
    setCallState('idle');
    stopRingtone();
    const duration = callStartTimeRef.current > 0 
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) 
      : 0;
      
    if (activeNumber) {
      addCallRecord({
        number: overrideRef.current || activeNumber,
        direction: duration === 0 && callDirectionRef.current === 'inbound' ? 'missed' : callDirectionRef.current,
        duration: duration
      });
    }
    
    setActiveNumber('');
    setIsMuted(false);
    setIsOnHold(false);
    callStartTimeRef.current = 0;
  };

  const connectSip = useCallback(async () => {
    // Cleanup previous UA if exists
    if (uaRef.current) {
      try {
        if (registererRef.current) {
          await registererRef.current.dispose();
          registererRef.current = null;
        }
        await uaRef.current.stop();
        uaRef.current = null;
      } catch (e) {
        console.warn('[SIP] Cleanup error (safe to ignore):', e);
      }
    }

    const domain = localStorage.getItem('pbx_domain') || import.meta.env.VITE_PBX_DOMAIN || 'pbx.texacore.ai';
    const extension = localStorage.getItem('pbx_ext') || import.meta.env.VITE_SIP_USERNAME || '100';
    const password = localStorage.getItem('pbx_pass') || import.meta.env.VITE_SIP_PASSWORD || 'TexaCore2026Pbx100';

    if (!domain || !extension || !password) {
      console.warn('[SIP] Missing PBX credentials');
      return;
    }

    const wssServer = `wss://${domain}:8089/ws`;
    const uri = UserAgent.makeURI(`sip:${extension}@${domain}`);
    if (!uri) return;

    console.log(`[SIP] Connecting to ${wssServer} as ${extension}...`);

    const ua = new UserAgent({
      uri,
      authorizationUsername: extension,
      authorizationPassword: password,
      transportOptions: {
        server: wssServer,
        connectionTimeout: 10,
        keepAliveInterval: 15,
      },
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionConfiguration: {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        }
      },
      delegate: {
        onInvite: (invitation: Invitation) => {
          const number = invitation.remoteIdentity.uri.user || 'Unknown';
          const sipDisplayName = invitation.remoteIdentity.displayName;
          
          let callId = number;
          if (sipDisplayName && sipDisplayName.startsWith('WEB|')) {
             callId = sipDisplayName; // use WEB|... as the identifier
          } else if (sipDisplayName) {
             callId = `${sipDisplayName} (${number})`;
          }
          
          console.log(`[SIP] 📞 Incoming call from: ${callId}`);
          setActiveNumber(callId);
          setCallState('ringing');
          callDirectionRef.current = 'inbound';
          callStartTimeRef.current = 0;
          sessionRef.current = invitation;
          
          startRingtone();
          
          try {
            new Notification('مكالمة واردة 📞', {
              body: `اتصال من: ${number}`,
            });
          } catch(e) {
            console.error("Notif error:", e);
          }
          
          invitation.stateChange.addListener((state) => {
            if (state === SessionState.Established) {
              setCallState('connected');
              stopRingtone();
              callStartTimeRef.current = Date.now();
              setupRemoteAudio(invitation);
            } else if (state === SessionState.Terminated) {
              handleCallEnd();
            }
          });
        }
      }
    });

    uaRef.current = ua;

    try {
      await ua.start();
      console.log('[SIP] ✅ UserAgent started');

      // --- Auto-reconnect on transport disconnect ---
      const transport = ua.transport as any;
      if (transport && typeof transport.onDisconnect === 'function') {
        // sip.js >=0.20 style
        const originalOnDisconnect = transport.onDisconnect.bind(transport);
        transport.onDisconnect = (error?: Error) => {
          originalOnDisconnect(error);
          console.warn('[SIP] ⚠️ Transport disconnected:', error?.message);
          setIsRegistered(false);
          setTimeout(() => {
            console.log('[SIP] 🔄 Attempting reconnect...');
            connectSip();
          }, 3000);
        };
      } else if (transport) {
        // Fallback: poll WebSocket state
        const wsCheckInterval = setInterval(() => {
          const ws = transport.ws || transport._ws;
          if (ws && ws.readyState > 1) { // CLOSING or CLOSED
            console.warn('[SIP] ⚠️ WebSocket closed, reconnecting...');
            setIsRegistered(false);
            clearInterval(wsCheckInterval);
            setTimeout(() => connectSip(), 3000);
          }
        }, 5000);
      }

      const reg = new Registerer(ua, { expires: 120 });
      registererRef.current = reg;
      
      reg.stateChange.addListener((regState) => {
        const registered = regState === RegistererState.Registered;
        setIsRegistered(registered);
        console.log(`[SIP] Registration: ${regState}${registered ? ' ✅' : ''}`);
        
        // Auto re-register if lost
        if (regState === RegistererState.Unregistered) {
          console.warn('[SIP] ⚠️ Registration lost — will re-register in 3s');
          setTimeout(async () => {
            try {
              if (registererRef.current && uaRef.current) {
                await registererRef.current.register();
                console.log('[SIP] ✅ Re-registered successfully');
              }
            } catch (e) {
              console.warn('[SIP] Re-register failed, full reconnect in 5s');
              setTimeout(() => connectSip(), 5000);
            }
          }, 3000);
        }
      });

      await reg.register();
      console.log('[SIP] ✅ Registered successfully as', extension);
    } catch (err) {
      console.error('[SIP] ❌ Connect error:', err);
      setIsRegistered(false);
      // Retry on failure
      setTimeout(() => {
        console.log('[SIP] 🔄 Retrying connection...');
        connectSip();
      }, 5000);
    }
  }, []);

  const setupRemoteAudio = (session: Session) => {
    const pc = session.sessionDescriptionHandler?.peerConnection;
    if (pc) {
      const receivers = pc.getReceivers();
      const audioReceiver = receivers.find((r: any) => r.track?.kind === 'audio');
      if (audioReceiver?.track && audioRef.current) {
        audioRef.current.srcObject = new MediaStream([audioReceiver.track]);
        audioRef.current.play().catch(e => console.warn('Audio play failed', e));
      }
    }
  };

  const makeCall = async (target: string) => {
    if (!uaRef.current || !target) return;
    
    const domain = localStorage.getItem('pbx_domain') || 'pbx.texacore.ai';
    const uri = UserAgent.makeURI(`sip:${target}@${domain}`);
    if (!uri) return;

    const inviter = new Inviter(uaRef.current, uri, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false }
      }
    });

    sessionRef.current = inviter;
    setActiveNumber(target);
    callDirectionRef.current = 'outbound';
    callStartTimeRef.current = 0;
    setCallState('connecting');

    inviter.stateChange.addListener((state) => {
      if (state === SessionState.Established) {
        setCallState('connected');
        callStartTimeRef.current = Date.now();
        setupRemoteAudio(inviter);
      } else if (state === SessionState.Terminated) {
        handleCallEnd();
      }
    });

    try {
      await inviter.invite();
    } catch (err) {
      console.error('Call failed', err);
      handleCallEnd();
    }
  };

  const answerCall = async () => {
    if (sessionRef.current && sessionRef.current instanceof Invitation) {
      try {
        stopRingtone();
        await sessionRef.current.accept({
          sessionDescriptionHandlerOptions: {
            constraints: { audio: true, video: false }
          }
        });
      } catch (e) {
        console.error('Answer failed', e);
        handleCallEnd();
      }
    }
  };

  const hangupCall = async () => {
    if (sessionRef.current) {
      if (sessionRef.current.state === SessionState.Established) {
        await sessionRef.current.bye();
      } else if (sessionRef.current instanceof Inviter) {
        await sessionRef.current.cancel();
      } else if (sessionRef.current instanceof Invitation) {
        await sessionRef.current.reject();
      }
    }
    handleCallEnd();
  };

  const toggleMute = () => {
    const session = sessionRef.current;
    if (session?.sessionDescriptionHandler) {
      const pc = (session.sessionDescriptionHandler as any).peerConnection;
      if (pc) {
        pc.getSenders().forEach((sender: any) => {
          if (sender.track?.kind === 'audio') {
            sender.track.enabled = !sender.track.enabled;
            setIsMuted(!sender.track.enabled);
          }
        });
      }
    }
  };

  const toggleHold = async () => {
    const session = sessionRef.current;
    if (!session) return;
    if (isOnHold) {
      await session.invite({ sessionDescriptionHandlerModifiers: [] });
    } else {
      await session.invite({
        sessionDescriptionHandlerModifiers: [
          (desc: any) => { 
             // Simple hold modifier, modifying SDP to sendonly
             desc.sdp = desc.sdp.replace(/a=sendrecv/g, 'a=sendonly');
             return Promise.resolve(desc);
          }
        ]
      });
    }
    setIsOnHold(!isOnHold);
  };

  const sendDTMF = (digit: string) => {
    const session = sessionRef.current;
    if (session?.sessionDescriptionHandler) {
      (session.sessionDescriptionHandler as any).sendDtmf(digit);
    }
  };

  const transferCall = async (target: string) => {
    if (sessionRef.current) {
      const domain = localStorage.getItem('pbx_domain') || 'pbx.texacore.ai';
      const targetURI = UserAgent.makeURI(`sip:${target}@${domain}`);
      if (targetURI) {
        await sessionRef.current.refer(targetURI);
        handleCallEnd();
      }
    }
  };

  return {
    isRegistered,
    callState,
    activeNumber,
    isMuted,
    isOnHold,
    makeCall,
    answerCall,
    hangupCall,
    toggleMute,
    toggleHold,
    sendDTMF,
    transferCall
  };
}
