import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSipEngine } from './hooks/useSipEngine';
import { useSupabase } from './hooks/useSupabase';
import Dialpad from './components/Dialpad';
import Settings from './components/Settings';
import UserStatusBar from './components/UserStatusBar';
import CallHistory from './components/CallHistory';
import Contacts from './components/Contacts';

export default function App() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'dialpad' | 'history' | 'contacts' | 'settings'>('dialpad');
  const [target, setTarget] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [showTransferMenu, setShowTransferMenu] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  
  const extension = localStorage.getItem('pbx_ext') || '';
  const { client, channel } = useSupabase(extension);

  const { 
    isRegistered, callState, activeNumber, isMuted, isOnHold, 
    makeCall, answerCall, hangupCall, toggleMute, toggleHold, transferCall 
  } = useSipEngine(
      // We pass the actual remote number so it saves into call history correctly
      (target.startsWith('WEB|')) ? target : undefined
  );

  // Use target if activeNumber is webrtc_guest, as Asterisk drops the display name
  const actualRemoteNumber = activeNumber === 'webrtc_guest' && target.startsWith('WEB|') 
    ? target 
    : activeNumber;

  // Sync call state back to ERP
  useEffect(() => {
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'desktop_call_state',
        payload: { state: callState, remoteNumber: actualRemoteNumber, duration: callDuration }
      }).catch(console.error);
    }
  }, [callState, actualRemoteNumber, callDuration, channel]);

  const formatActiveNumber = (num: string) => {
    if (num && num.startsWith('WEB|')) {
      const parts = num.split('|');
      const dev = parts[1] === 'mobile' ? t('app.mobile') : t('app.pc');
      const countryCode = parts[2];
      const ip = parts[3];
      const shortId = parts[4] || parts[2] || 'مجهول'; // fallback to older formats

      let flag = '🌍';
      if (countryCode && countryCode.length === 2) {
        flag = String.fromCodePoint(...[...countryCode.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
      }

      // Format: 🇮🇪 زائر موقع (كمبيوتر) - 192.168.1.1
      if (ip && ip.length > 5) {
         return `${flag} ${t('app.webVisitor')} (${dev}) - ${ip}`;
      } else {
         return `${flag} ${t('app.webVisitor')} (${dev}) - ${shortId}`;
      }
    }
    return num;
  };

  useEffect(() => {
    if (callState === 'idle') {
      setTarget('');
      setCallDuration(0);
      setShowTransferMenu(false);
      setTransferTarget('');
      setIsCallMinimized(false);
    }
  }, [callState]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'connected') {
      interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [callState]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (callState !== 'idle') {
        e.preventDefault();
        e.returnValue = ''; // Shows the browser confirmation dialog
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [callState]);

  useEffect(() => {
    const handleRemoteDial = async (e: any) => {
      const number = e.detail;
      if (callState === 'idle') {
        setActiveTab('dialpad');
        setTarget(number);
        setTimeout(() => makeCall(number), 500);
      }
    };
    window.addEventListener('softphone-dial', handleRemoteDial);
    return () => window.removeEventListener('softphone-dial', handleRemoteDial);
  }, [callState, makeCall]);

  // Listen for web visitor call requests (from landing page)
  useEffect(() => {
    const handleWebCall = (e: any) => {
      const data = e.detail;
      console.log('[App] Web call request:', data);
      if (callState === 'idle') {
        // Show notification
        new Notification('📞 مكالمة من الموقع', {
          body: `زائر جديد يريد التحدث معك`,
        });
        // Set the number and show it
        const cc = data.country_code || 'XX';
        const ip = data.ip || '0.0.0.0';
        const callerInfo = data.visitor_id ? `WEB|${data.device_type || 'web'}|${cc}|${ip}|${data.visitor_id.substring(0,6)}` : 'زائر ويب';
        setActiveTab('dialpad');
        setTarget(callerInfo);
      }
    };
    window.addEventListener('softphone-web-call', handleWebCall);
    return () => window.removeEventListener('softphone-web-call', handleWebCall);
  }, [callState]);

  // Listen for hangup requests from ERP
  useEffect(() => {
    const handleRemoteHangup = () => {
      if (callState !== 'idle') {
        console.log('[App] Remote hangup requested from ERP');
        hangupCall();
      }
    };
    window.addEventListener('softphone-hangup', handleRemoteHangup);
    return () => window.removeEventListener('softphone-hangup', handleRemoteHangup);
  }, [callState, hangupCall]);

  const handleCall = async () => {
    if (callState === 'idle' && target) await makeCall(target);
  };

  const handleDigit = (digit: string) => setTarget(prev => prev + digit);
  const handleBackspace = () => setTarget(prev => prev.slice(0, -1));

  // Keyboard support - type digits, backspace, Enter to call
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (callState !== 'idle' || activeTab !== 'dialpad') return;
      if (/^[0-9*#]$/.test(e.key)) {
        e.preventDefault();
        setTarget(prev => prev + e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setTarget(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter' && target) {
        e.preventDefault();
        makeCall(target);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callState, activeTab, target, makeCall]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div className="app-container">
      <UserStatusBar extension={extension} isRegistered={isRegistered} onSettingsClick={() => setActiveTab('settings')} />
      
      {callState !== 'idle' && isCallMinimized && (
        <div className="active-call-banner" onClick={() => setIsCallMinimized(false)}>
          <div className="banner-content">
            <div className="blinking-circle"></div>
            <span>{t('app.activeCall')}: {formatActiveNumber(actualRemoteNumber)} ({formatTime(callDuration)})</span>
          </div>
          <span>{t('app.return')}</span>
        </div>
      )}

      <main className="main-content">
        {activeTab === 'dialpad' && (callState === 'idle' || isCallMinimized) && (
          <div className="dialpad-container">
            <div className="number-display">
              <span className="number-text">{target || '\u200B'}</span>
            </div>
            <Dialpad onDigit={handleDigit} onCall={handleCall} onBackspace={handleBackspace} />
          </div>
        )}

        {callState !== 'idle' && !isCallMinimized && (
          <div className="call-screen">
            <button className="minimize-call-btn" onClick={() => setIsCallMinimized(true)} title="تصغير">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/></svg>
            </button>
            <div className="caller-avatar">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            <div className="caller-number" dir="ltr">{formatActiveNumber(actualRemoteNumber)}</div>
            {callState === 'connected' && <div className="call-timer">{formatTime(callDuration)}</div>}
            <div className={`call-status-label ${callState === 'ringing' ? 'ringing' : ''}`}>
              {callState === 'connecting' && t('app.connecting')}
              {callState === 'ringing' && t('app.ringing')}
              {callState === 'connected' && t('app.connected')}
            </div>

            {callState === 'connected' && (
              <div className="call-controls">
                <button className={`control-btn ${isMuted ? 'active' : ''}`} onClick={toggleMute}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    {isMuted ? <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/> : <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>}
                  </svg>
                  <span>{isMuted ? t('app.unmute') : t('app.mute')}</span>
                </button>
                <button className={`control-btn ${isOnHold ? 'active' : ''}`} onClick={toggleHold}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    {isOnHold ? <path d="M8 5v14l11-7z"/> : <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>}
                  </svg>
                  <span>{isOnHold ? t('app.resume') : t('app.hold')}</span>
                </button>
                <button className="control-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                  <span>DTMF</span>
                </button>
                <button className={`control-btn ${showTransferMenu ? 'active' : ''}`} onClick={() => setShowTransferMenu(!showTransferMenu)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 11l5-5v14l-5-5v2c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h11c1.1 0 2 .9 2 2v5z"/></svg>
                  <span>{t('app.transfer')}</span>
                </button>
              </div>
            )}

            {showTransferMenu && (
              <div className="transfer-overlay">
                <h4>{t('app.transferTo')}</h4>
                <div className="quick-transfers">
                  <button className="quick-transfer-btn" onClick={() => { transferCall('100'); setShowTransferMenu(false); }}>100</button>
                  <button className="quick-transfer-btn" onClick={() => { transferCall('101'); setShowTransferMenu(false); }}>101</button>
                  <button className="quick-transfer-btn" onClick={() => { transferCall('102'); setShowTransferMenu(false); }}>102</button>
                  <button className="quick-transfer-btn" onClick={() => { transferCall('103'); setShowTransferMenu(false); }}>103</button>
                </div>
                <div className="manual-transfer">
                  <input 
                    type="text" 
                    placeholder={t('app.otherNumber')}
                    value={transferTarget}
                    onChange={(e) => setTransferTarget(e.target.value)}
                    dir="ltr"
                  />
                  <button className="transfer-submit-btn" onClick={() => {
                    if (transferTarget) {
                      transferCall(transferTarget);
                      setShowTransferMenu(false);
                      setTransferTarget('');
                    }
                  }}>{t('app.transferConfirm')}</button>
                </div>
              </div>
            )}

            <div className="call-end-area">
              {callState === 'ringing' && (
                <button className="end-call-btn answer-btn" onClick={answerCall}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
                </button>
              )}
              <button className="end-call-btn hangup-btn" onClick={hangupCall}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 01-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85a1 1 0 01-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (callState === 'idle' || isCallMinimized) && (
          <CallHistory onCall={(n) => { 
            if(n.startsWith('WEB|')) {
                const uuid = n.split('|')[2];
                if(client) {
                   client.channel('pbx_visitors').send({
                      type: 'broadcast', event: 'incoming_call', payload: { to_uuid: uuid, agent_ext: extension }
                   });
                   // Flash toast-like notification
                   new Notification('تم الطلب', { body: 'تم إرسال طلب اتصال لزائر الموقع.' });
                }
            } else {
                setTarget(n); setActiveTab('dialpad'); setTimeout(() => makeCall(n), 100); 
            }
          }} />
        )}
        {activeTab === 'contacts' && (callState === 'idle' || isCallMinimized) && (
          <Contacts onCall={(n) => { setTarget(n); setActiveTab('dialpad'); setTimeout(() => makeCall(n), 100); }} />
        )}
        {activeTab === 'settings' && (callState === 'idle' || isCallMinimized) && (
          <Settings onSave={() => window.location.reload()} />
        )}
      </main>
      
      <nav className="bottom-nav">
        {[
          { id: 'dialpad' as const, label: t('nav.dialpad'), icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 19a2 2 0 100-4 2 2 0 000 4zm-5-5a2 2 0 100-4 2 2 0 000 4zm5 0a2 2 0 100-4 2 2 0 000 4zm5 0a2 2 0 100-4 2 2 0 000 4zM7 9a2 2 0 100-4 2 2 0 000 4zm5 0a2 2 0 100-4 2 2 0 000 4zm5 0a2 2 0 100-4 2 2 0 000 4z"/></svg> },
          { id: 'history' as const, label: t('nav.history'), icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg> },
          { id: 'contacts' as const, label: t('nav.contacts'), icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5.9a2.1 2.1 0 110 4.2 2.1 2.1 0 010-4.2m0 9c2.97 0 6.1 1.46 6.1 2.1v1.1H5.9V17c0-.64 3.13-2.1 6.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/></svg> },
          { id: 'settings' as const, label: t('nav.settings'), icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.61 3.61 0 0112 15.6z"/></svg> },
        ].map(tab => (
          <button key={tab.id} className={`nav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
