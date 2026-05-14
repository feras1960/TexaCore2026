import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSoftphone } from '../context/SoftphoneContext';
import {
  Phone, PhoneOff, PhoneCall, PhoneIncoming, PhoneOutgoing,
  Mic, MicOff, Volume2, X, Delete, Minimize2, Maximize2,
  Signal, SignalZero, Wifi, WifiOff, User, Clock, Hash,
  ChevronDown, ChevronUp, Settings, Circle, Pause, Play, PhoneForwarded
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';

// ─── Call Timer Hook ──────────────────────────────────────────
function useCallTimer(startTime: number | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  return elapsed >= 3600 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

// ─── DTMF Keypad Map ─────────────────────────────────────────
const KEYPAD = [
  { key: '1', sub: '' },
  { key: '2', sub: 'ABC' },
  { key: '3', sub: 'DEF' },
  { key: '4', sub: 'GHI' },
  { key: '5', sub: 'JKL' },
  { key: '6', sub: 'MNO' },
  { key: '7', sub: 'PQRS' },
  { key: '8', sub: 'TUV' },
  { key: '9', sub: 'WXYZ' },
  { key: '*', sub: '' },
  { key: '0', sub: '+' },
  { key: '#', sub: '' },
];

// ─── Softphone Widget ────────────────────────────────────────
export function SoftphoneWidget() {
  const {
    isRegistered, callState, remoteNumber, callStartTime,
    isMuted, isOnHold, error, callDirection,
    makeCall, answerCall, hangupCall, toggleMute, toggleHold, transferCall,
  } = useSoftphone();
  const { language } = useLanguage();
  const [dialNumber, setDialNumber] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Advanced features state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');

  const isRtl = language === 'ar';
  const timer = useCallTimer(callStartTime);
  const isInCall = callState !== 'idle' && callState !== 'ended';

  // Extension info from env
  const sipExtension = import.meta.env.VITE_SIP_USERNAME || '—';
  const pbxDomain = import.meta.env.VITE_PBX_DOMAIN || 'pbx.texacore.ai';

  // Status label
  const statusInfo = useMemo(() => {
    if (!isRegistered) return {
      label: isRtl ? 'غير متصل' : 'Disconnected',
      color: 'text-red-400',
      bg: 'bg-red-500',
      icon: WifiOff,
    };
    if (callState === 'connected') return {
      label: isRtl ? 'مكالمة نشطة' : 'In Call',
      color: 'text-green-400',
      bg: 'bg-green-500',
      icon: PhoneCall,
    };
    if (callState === 'ringing') return {
      label: isRtl ? 'اتصال وارد' : 'Incoming',
      color: 'text-amber-400',
      bg: 'bg-amber-500',
      icon: PhoneIncoming,
    };
    if (callState === 'connecting') return {
      label: isRtl ? 'جاري الاتصال' : 'Dialing',
      color: 'text-blue-400',
      bg: 'bg-blue-500',
      icon: PhoneOutgoing,
    };
    return {
      label: isRtl ? 'متصل — جاهز' : 'Online — Ready',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500',
      icon: Wifi,
    };
  }, [isRegistered, callState, isRtl]);

  // Auto-open on incoming call
  useEffect(() => {
    if (callState === 'ringing' && !isOpen) {
      setIsOpen(true);
      setIsCompact(false);
    }
    // Auto-clear states when call ends
    if (callState === 'idle') {
      setDialNumber('');
      setShowAdvanced(false);
      setIsTransferring(false);
      setTransferTarget('');
    }
  }, [callState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard input for dialpad
  useEffect(() => {
    if (!isOpen || isInCall) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^[0-9*#]$/.test(e.key)) setDialNumber(prev => prev + e.key);
      if (e.key === 'Backspace') setDialNumber(prev => prev.slice(0, -1));
      if (e.key === 'Enter' && dialNumber.trim()) handleDial();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isInCall, dialNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBackspace = useCallback(() => {
    setDialNumber(prev => prev.slice(0, -1));
  }, []);

  const handleDial = useCallback(() => {
    if (dialNumber.trim()) makeCall(dialNumber.trim());
  }, [dialNumber, makeCall]);

  // ═══ FAB — Floating Action Button ═══════════════════════════
  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 z-50 ${isRtl ? 'left-6' : 'right-6'}`} style={{ direction: 'ltr' }}>
        <button
          onClick={() => setIsOpen(true)}
          className="group relative"
        >
          {/* Pulse ring for active call */}
          {isInCall && (
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-40" />
          )}
          <div className={`relative p-4 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${
            isInCall
              ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
              : isRegistered
                ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white hover:from-slate-700 hover:to-slate-800'
                : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
          }`}>
            <Phone className="w-6 h-6" />
            {/* Status dot */}
            <span className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${statusInfo.bg}`} />
          </div>
          {/* Tooltip with extension & status */}
          <div className={`absolute bottom-full ${isRtl ? 'left-0' : 'right-0'} mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}>
            <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
              <div className="font-bold">Ext. {sipExtension}</div>
              <div className={statusInfo.color}>{statusInfo.label}</div>
            </div>
          </div>
        </button>
      </div>
    );
  }

  // ═══ Compact Mode (mini bar for active calls) ═══════════════
  if (isCompact && isInCall) {
    return (
      <div className={`fixed bottom-6 z-50 ${isRtl ? 'left-6' : 'right-6'}`} style={{ direction: 'ltr' }}>
        <div className="bg-slate-900 rounded-2xl shadow-2xl w-72 overflow-hidden border border-slate-700">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isOnHold ? 'bg-orange-500/20' : callState === 'connected' ? 'bg-green-500/20' : 'bg-amber-500/20'
              }`}>
                {isOnHold ? (
                  <Pause className="w-5 h-5 text-orange-400" />
                ) : callState === 'connected' ? (
                  <PhoneCall className="w-5 h-5 text-green-400 animate-pulse" />
                ) : (
                  <PhoneOutgoing className="w-5 h-5 text-amber-400 animate-pulse" />
                )}
              </div>
              <div>
                <p className="text-white font-bold text-sm" dir="ltr">{remoteNumber}</p>
                <p className="text-green-400 font-mono text-xs tabular-nums">{timer}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className={`p-2 rounded-full ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'}`}>
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button onClick={hangupCall} className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600">
                <PhoneOff className="w-4 h-4" />
              </button>
              <button onClick={() => setIsCompact(false)} className="p-2 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ Full Panel ═════════════════════════════════════════════
  return (
    <div className={`fixed bottom-6 z-50 ${isRtl ? 'left-6' : 'right-6'}`} style={{ direction: 'ltr' }}>
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-80 overflow-hidden border border-slate-700/50 animate-in fade-in slide-in-from-bottom-4 duration-200">

        {/* ─── Header ─────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isRegistered ? 'bg-emerald-500/20' : 'bg-red-500/20'
              }`}>
                <statusInfo.icon className={`w-4 h-4 ${statusInfo.color}`} />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm leading-tight">TexaCore PBX</h3>
                <p className={`text-[11px] leading-tight ${statusInfo.color}`}>{statusInfo.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {isInCall && (
                <button
                  onClick={() => setIsCompact(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  title="Minimize"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Extension & Server Info Bar */}
          <div className="mt-2.5 flex items-center justify-between bg-slate-950/50 rounded-lg px-3 py-2">
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <Hash className="w-3 h-3 text-slate-500" />
                <span className="text-slate-300 font-mono font-bold">{sipExtension}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Signal className="w-3 h-3 text-slate-500" />
                <span className="text-slate-400 truncate max-w-[120px]">{pbxDomain}</span>
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${isRegistered ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-red-400'}`} />
          </div>
        </div>

        {/* ─── Error Banner ─────────────────────────────── */}
        {error && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center gap-2">
            <Circle className="w-2 h-2 text-red-400 fill-red-400 flex-shrink-0" />
            <span className="text-red-400 text-xs font-medium truncate">{error}</span>
          </div>
        )}

        {/* ─── Body ─────────────────────────────────────── */}
        <div className="p-4">

          {/* ═══ IDLE: Dialpad ═══ */}
          {callState === 'idle' && (
            <div className="flex flex-col gap-3">
              {/* Number Display */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={isRtl ? 'أدخل الرقم...' : 'Enter number...'}
                  className="w-full text-center text-2xl font-bold py-3 px-10 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono tracking-wider"
                  value={dialNumber}
                  onChange={(e) => setDialNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDial()}
                  dir="ltr"
                />
                {dialNumber && (
                  <button
                    onClick={handleBackspace}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Numpad Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {KEYPAD.map(({ key, sub }) => (
                  <button
                    key={key}
                    onClick={() => setDialNumber(prev => prev + key)}
                    className="group bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl py-3 flex flex-col items-center justify-center transition-all duration-100 select-none border border-slate-700/50 hover:border-slate-600"
                  >
                    <span className="text-white text-lg font-bold leading-none">{key}</span>
                    {sub && <span className="text-slate-500 text-[9px] mt-0.5 tracking-[0.2em] font-medium">{sub}</span>}
                  </button>
                ))}
              </div>

              {/* Call Button */}
              <button
                onClick={handleDial}
                disabled={!dialNumber.trim() || !isRegistered}
                className="mt-1 w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 active:from-emerald-700 active:to-green-700 text-white py-3.5 rounded-xl flex justify-center items-center gap-2 font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
              >
                <Phone className="w-5 h-5" />
                {isRtl ? 'اتصال' : 'Call'}
              </button>

              {/* Quick Dials */}
              <div className="flex justify-center gap-1.5 mt-1">
                <button 
                  onClick={() => { setDialNumber('200'); makeCall('200'); }} 
                  disabled={!isRegistered}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-[10px] font-bold text-slate-300 rounded-lg transition-all border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isRtl ? 'المبيعات' : 'Sales'}
                </button>
                <button 
                  onClick={() => { setDialNumber('300'); makeCall('300'); }} 
                  disabled={!isRegistered}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-[10px] font-bold text-slate-300 rounded-lg transition-all border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isRtl ? 'الدعم الفني' : 'Support'}
                </button>
                <button 
                  onClick={() => { setDialNumber('400'); makeCall('400'); }} 
                  disabled={!isRegistered}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-[10px] font-bold text-slate-300 rounded-lg transition-all border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isRtl ? 'الإدارة' : 'Mgmt'}
                </button>
              </div>
            </div>
          )}

          {/* ═══ RINGING: Incoming Call ═══ */}
          {callState === 'ringing' && (
            <div className="flex flex-col items-center gap-4 py-4">
              {/* Avatar */}
              <div className="relative">
                <div className="absolute inset-[-8px] bg-emerald-500/20 rounded-full animate-ping" />
                <div className="absolute inset-[-4px] bg-emerald-500/10 rounded-full animate-pulse" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center relative z-10 shadow-xl shadow-emerald-500/30">
                  <User className="w-10 h-10 text-white" />
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-2xl font-bold text-white font-mono tracking-wider" dir="ltr">
                  {remoteNumber || 'Unknown'}
                </h3>
                <p className="text-emerald-400 text-sm mt-1 animate-pulse">
                  {isRtl ? '📞 اتصال وارد...' : '📞 Incoming Call...'}
                </p>
              </div>

              <div className="flex gap-6 mt-2">
                <button
                  onClick={hangupCall}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-500/40 transition-all hover:scale-110"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>
                <button
                  onClick={answerCall}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-500/40 transition-all hover:scale-110 animate-bounce"
                >
                  <Phone className="w-7 h-7" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ CONNECTING: Outgoing ═══ */}
          {callState === 'connecting' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
                <PhoneOutgoing className="w-10 h-10 text-white animate-pulse" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white font-mono tracking-wider" dir="ltr">
                  {remoteNumber}
                </h3>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-blue-400 text-sm ml-2">
                    {isRtl ? 'جاري الاتصال' : 'Calling'}
                  </span>
                </div>
              </div>
              <button
                onClick={hangupCall}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-500/30 transition-all hover:scale-110 mt-2"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          )}

          {/* ═══ CONNECTED: Active Call ═══ */}
          {callState === 'connected' && (
            <div className="flex flex-col items-center gap-4 py-3">
              {/* Call info card */}
              <div className="w-full bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white font-mono truncate" dir="ltr">
                      {remoteNumber}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-emerald-400 text-xs">
                        {callDirection === 'inbound' ? (isRtl ? 'وارد' : 'Inbound') : (isRtl ? 'صادر' : 'Outbound')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-mono font-bold text-xl tabular-nums">{timer}</p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="text-slate-500 text-[10px]">
                        {isRtl ? 'مدة المكالمة' : 'Duration'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Call Controls */}
              <div className="flex justify-center gap-4 w-full py-2">
                <button
                  onClick={toggleMute}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                    isMuted
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  <span className="text-[10px] font-medium">{isMuted ? (isRtl ? 'كتم' : 'Muted') : (isRtl ? 'ميكروفون' : 'Mic')}</span>
                </button>
                <button
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
                  title="Speaker"
                >
                  <Volume2 className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{isRtl ? 'مكبر الصوت' : 'Speaker'}</span>
                </button>
                <button
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
                  title="Keypad"
                >
                  <Hash className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{isRtl ? 'لوحة' : 'Keypad'}</span>
                </button>
              </div>

              {/* Advanced Options Toggle */}
              <div className="w-full">
                <button
                  onClick={() => {
                    setShowAdvanced(!showAdvanced);
                    setIsTransferring(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {isRtl ? 'خيارات إضافية' : 'Advanced Options'}
                  {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {/* Advanced Options Panel */}
                {showAdvanced && (
                  <div className="mt-2 mb-3 bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 animate-in slide-in-from-top-2 fade-in duration-200">
                    {!isTransferring ? (
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={toggleHold}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-[72px] transition-all ${
                            isOnHold
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          {isOnHold ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                          <span className="text-[10px] font-medium">{isOnHold ? (isRtl ? 'استئناف' : 'Resume') : (isRtl ? 'انتظار' : 'Hold')}</span>
                        </button>
                        <button
                          onClick={() => setIsTransferring(true)}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-[72px] bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
                        >
                          <PhoneForwarded className="w-5 h-5" />
                          <span className="text-[10px] font-medium">{isRtl ? 'تحويل' : 'Transfer'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs font-medium text-slate-300">{isRtl ? 'تحويل المكالمة إلى:' : 'Transfer call to:'}</span>
                          <button onClick={() => setIsTransferring(false)} className="text-slate-500 hover:text-slate-300">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={isRtl ? 'رقم التحويلة...' : 'Extension...'}
                            value={transferTarget}
                            onChange={(e) => setTransferTarget(e.target.value.replace(/\D/g, ''))}
                            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                            dir="ltr"
                            autoFocus
                          />
                          <button
                            onClick={() => transferTarget && transferCall(transferTarget)}
                            disabled={!transferTarget}
                            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            {isRtl ? 'تحويل' : 'Send'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* End Call */}
              <button
                onClick={hangupCall}
                className="w-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white py-3 rounded-xl flex justify-center items-center gap-2 font-bold text-sm shadow-lg shadow-red-500/25 transition-all"
              >
                <PhoneOff className="w-5 h-5" />
                {isRtl ? 'إنهاء المكالمة' : 'End Call'}
              </button>
            </div>
          )}
        </div>

        {/* ─── Footer ─────────────────────────────────── */}
        <div className="bg-slate-950/50 border-t border-slate-800 px-4 py-2 flex items-center justify-between">
          <span className="text-slate-500 text-[10px]">
            Ext. {sipExtension} • {isRegistered ? 'WSS ✓' : 'WSS ✗'}
          </span>
          <span className="text-slate-600 text-[10px]">
            TexaCore PBX v1.0
          </span>
        </div>
      </div>
    </div>
  );
}
