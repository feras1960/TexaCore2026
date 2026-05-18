import 'package:flutter/foundation.dart';
import 'package:sip_ua/sip_ua.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:js_util' as js_util;
import '../config/env.dart';

/// Call state enum for clearer state management
enum NexaCallState { idle, ringing, connecting, connected, ended }

/// Call direction
enum CallDirection { inbound, outbound }

/// Active call info
class ActiveCall {
  final String remoteNumber;
  final CallDirection direction;
  final DateTime startTime;
  Call? sipCall;

  ActiveCall({
    required this.remoteNumber,
    required this.direction,
    required this.startTime,
    this.sipCall,
  });

  @override
  String toString() => 'ActiveCall($remoteNumber, ${direction.name})';
}

class SipService extends ChangeNotifier implements SipUaHelperListener {
  final SIPUAHelper _helper = SIPUAHelper();

  // --- Debug log (visible on-screen for mobile debugging) ---
  final List<String> debugLogs = [];
  void _log(String msg) {
    debugPrint(msg);
    debugLogs.add('${DateTime.now().toString().substring(11, 19)} $msg');
    if (debugLogs.length > 50) debugLogs.removeAt(0);
    notifyListeners();
  }

  // --- State ---
  String registrationState = 'NONE'; // NONE, PROGRESS, REGISTERED, FAILED
  bool get isRegistered => registrationState == 'REGISTERED';

  NexaCallState callState = NexaCallState.idle;
  ActiveCall? activeCall;
  ActiveCall? heldCall;  // Second call (on hold)
  bool isMuted = false;
  bool isOnHold = false;
  bool isPttConference = false;

  /// Current SIP extension (e.g., '101', '102')
  String? get sipExtension => _lastUsername;

  /// Whether there is a held call (for UI)
  bool get hasHeldCall => heldCall != null;

  /// Whether we are in a multi-call scenario (Add Call mode)
  bool get isMultiCall => activeCall != null && heldCall != null;

  /// Talkie Status setting (for muting PTT)
  bool isTalkieSilent = false;

  void setTalkieSilent(bool silent) {
    isTalkieSilent = silent;
    if (kIsWeb) {
      _pttAudioElement?.muted = silent;
    }
    // On native, we would mute the remote stream via WebRTC
    // But since this is primarily a Web app, we rely on _pttAudioElement
    debugPrint('[SIP-PTT] Talkie silent mode: $silent');
  }

  /// Whether we are in transfer-consultation mode
  bool _isTransferConsultation = false;
  bool get isTransferConsultation => _isTransferConsultation;

  /// Track which call is the "second" one being set up
  bool _settingUpSecondCall = false;

  // Audio renderers for WebRTC
  final RTCVideoRenderer remoteRenderer = RTCVideoRenderer();
  final RTCVideoRenderer localRenderer = RTCVideoRenderer();
  bool _renderersInitialized = false;

  // Config stored for reconnect
  String? _lastServer;
  String? _lastUsername;
  String? _lastPassword;

  String get currentUsername => _lastUsername ?? '101';

  // Callback for call log (will be wired to Supabase in provider)
  void Function(ActiveCall call, int durationSeconds)? onCallEnded;

  SipService() {
    _helper.addSipUaHelperListener(this);
    _initRenderers();
  }

  Future<void> _initRenderers() async {
    await remoteRenderer.initialize();
    await localRenderer.initialize();
    _renderersInitialized = true;
    debugPrint('[SIP] 🔊 Audio renderers initialized');
  }

  // ===== REGISTRATION =====

  Future<void> register({
    String? server,
    String? username,
    String? password,
  }) async {
    final domain = server ?? Env.pbxDomain;
    final ext = username ?? '101';
    final pass = password ?? 'TexaCore2026Pbx101';

    // Store for reconnect
    _lastServer = domain;
    _lastUsername = ext;
    _lastPassword = pass;

    registrationState = 'PROGRESS';
    notifyListeners();

    try {
      final UaSettings settings = UaSettings();
      settings.transportType = TransportType.WS;
      settings.webSocketUrl = 'wss://$domain:${Env.pbxWssPort}/ws';
      settings.webSocketSettings.allowBadCertificate = true;
      settings.uri = 'sip:$ext@$domain';
      settings.authorizationUser = ext;
      settings.password = pass;
      settings.displayName = 'Nexa Connect ($ext)';
      settings.userAgent = 'NexaConnect/1.0 Flutter';
      settings.register = true;
      settings.register_expires = 120;
      settings.dtmfMode = DtmfMode.RFC2833;
      settings.iceServers = [
        {'urls': 'stun:pbx.texacore.ai:3478'},
        {
          'urls': 'turn:pbx.texacore.ai:3478?transport=udp',
          'username': 'nexaturn',
          'credential': 'NexaTurn2026!',
        },
        {
          'urls': 'turns:pbx.texacore.ai:5349?transport=tcp',
          'username': 'nexaturn',
          'credential': 'NexaTurn2026!',
        },
      ];

      await _helper.start(settings);
      debugPrint(
          '[SIP] ✅ Helper started, connecting to wss://$domain:${Env.pbxWssPort}/ws as $ext');
    } catch (e) {
      debugPrint('[SIP] ❌ Registration error: $e');
      registrationState = 'FAILED';
      notifyListeners();
      _scheduleReconnect();
    }
  }

  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 3;

  void _scheduleReconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      debugPrint('[SIP] ⛔ Max reconnect attempts reached ($_maxReconnectAttempts). Stopped.');
      return;
    }
    _reconnectAttempts++;
    Future.delayed(Duration(seconds: 5 * _reconnectAttempts), () {
      if (registrationState == 'FAILED' || registrationState == 'NONE') {
        debugPrint('[SIP] 🔄 Retrying registration (attempt $_reconnectAttempts/$_maxReconnectAttempts)...');
        register(
          server: _lastServer,
          username: _lastUsername,
          password: _lastPassword,
        );
      }
    });
  }

  void stop() {
    _helper.stop();
    registrationState = 'NONE';
    callState = NexaCallState.idle;
    activeCall = null;
    isMuted = false;
    isOnHold = false;
    isSpeakerOn = false;
    notifyListeners();
  }

  // ===== AUDIO CONTROLS =====
  
  bool isSpeakerOn = false;

  void toggleSpeaker() {
    isSpeakerOn = !isSpeakerOn;
    try {
      Helper.setSpeakerphoneOn(isSpeakerOn);
      _log('[SIP] 🔊 Speaker toggled natively to: $isSpeakerOn');
    } catch (e) {
      _log('[SIP] ⚠️ setSpeakerphoneOn might not be supported on web: $e');
    }
    
    _applyWebVolume();
    notifyListeners();
  }

  void _applyWebVolume() {
    if (!kIsWeb) return;
    
    // Simulate earpiece (0.4) vs speakerphone (1.0) on web
    final double targetVolume = isSpeakerOn ? 1.0 : 0.4;
    try {
      final elements = html.document.querySelectorAll('audio, video');
      for (var el in elements) {
        if (el is html.MediaElement) {
          el.volume = targetVolume;
        }
      }
      _log('[SIP] 🔊 Web Volume adjusted to: $targetVolume');
    } catch (e) {
      _log('[SIP] ⚠️ Could not adjust web volume: $e');
    }
  }

  // ===== OUTGOING CALLS =====

  Future<void> makeCall(String target) async {
    if (callState != NexaCallState.idle || !isRegistered) {
      _log('[SIP] ⚠️ Cannot call: state=$callState, registered=$isRegistered');
      return;
    }

    callState = NexaCallState.connecting;
    activeCall = ActiveCall(
      remoteNumber: target,
      direction: CallDirection.outbound,
      startTime: DateTime.now(),
    );
    notifyListeners();

    try {
      // Acquire media stream FIRST — critical for iOS Safari
      _log('[SIP] 🎤 Acquiring microphone...');
      MediaStream? localStream;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          'audio': true,
          'video': false,
        });
        _log('[SIP] 🎤 ✅ Mic OK (${localStream.getTracks().length} tracks)');
      } catch (micError) {
        _log('[SIP] 🎤 ❌ Mic error: $micError');
        _endCall();
        return;
      }

      _log('[SIP] 📞 Calling $target via helper.call()...');
      final success = await _helper.call(
        'sip:$target@${Env.pbxDomain}',
        voiceOnly: true,
        mediaStream: localStream,
      );
      _log('[SIP] helper.call() returned: $success');
      if (!success) {
        _log('[SIP] ❌ Call initiation failed');
        for (final track in localStream.getTracks()) {
          track.stop();
        }
        _endCall();
      } else {
        _log('[SIP] ✅ Call initiated, waiting for state callbacks...');
        // Fallback: On iOS Safari, the CONFIRMED callback may not fire
        Future.delayed(const Duration(seconds: 3), () {
          if (callState == NexaCallState.connecting && isRegistered) {
            _log('[SIP] ⏱ Fallback: forcing connected (iOS workaround)');
            callState = NexaCallState.connected;
            if (activeCall != null) {
              activeCall = ActiveCall(
                remoteNumber: activeCall!.remoteNumber,
                direction: activeCall!.direction,
                startTime: DateTime.now(),
                sipCall: activeCall!.sipCall,
              );
            }
            notifyListeners();
          }
        });
      }
    } catch (e) {
      _log('[SIP] ❌ Make call error: $e');
      _endCall();
    }
  }

  // ===== HOLD AND DIAL (Add Call) =====

  /// Place the current active call on hold and dial a new number
  Future<void> holdAndDial(String target) async {
    if (activeCall?.sipCall == null || !isRegistered) {
      debugPrint('[SIP] ⚠️ Cannot holdAndDial: no active call or not registered');
      return;
    }

    // Step 1: Put current call on hold
    try {
      activeCall!.sipCall!.hold();
      isOnHold = true;
      debugPrint('[SIP] ⏸ Held call with ${activeCall!.remoteNumber}');
    } catch (e) {
      debugPrint('[SIP] ❌ Hold error: $e');
      return;
    }

    // Step 2: Move active call to heldCall
    heldCall = activeCall;

    // Step 3: Start new call
    _settingUpSecondCall = true;
    activeCall = ActiveCall(
      remoteNumber: target,
      direction: CallDirection.outbound,
      startTime: DateTime.now(),
    );
    callState = NexaCallState.connecting;
    notifyListeners();

    try {
      final success = await _helper.call(
        'sip:$target@${Env.pbxDomain}',
        voiceOnly: true,
      );
      if (!success) {
        debugPrint('[SIP] ❌ Second call failed, resuming held call');
        _resumeHeldCall();
      } else {
        debugPrint('[SIP] 📞 Second call to $target...');
      }
    } catch (e) {
      debugPrint('[SIP] ❌ Second call error: $e, resuming held call');
      _resumeHeldCall();
    }
  }

  /// Resume the held call if the second call fails
  void _resumeHeldCall() {
    if (heldCall != null) {
      activeCall = heldCall;
      heldCall = null;
      _settingUpSecondCall = false;
      try {
        activeCall!.sipCall!.unhold();
        isOnHold = false;
      } catch (_) {}
      callState = NexaCallState.connected;
      notifyListeners();
      debugPrint('[SIP] ▶ Resumed held call with ${activeCall!.remoteNumber}');
    } else {
      _endCall();
    }
  }

  // ===== SWAP CALLS =====

  /// Swap between active and held calls
  void swapCalls() {
    if (activeCall == null || heldCall == null) {
      debugPrint('[SIP] ⚠️ Cannot swap: need two calls');
      return;
    }

    try {
      // Hold the current active call
      activeCall!.sipCall!.hold();
      // Unhold the held call
      heldCall!.sipCall!.unhold();
    } catch (e) {
      debugPrint('[SIP] ❌ Swap error: $e');
      return;
    }

    // Swap the references
    final temp = activeCall;
    activeCall = heldCall;
    heldCall = temp;
    isOnHold = false;
    isMuted = false;

    debugPrint('[SIP] 🔄 Swapped: active=${activeCall!.remoteNumber}, held=${heldCall!.remoteNumber}');
    notifyListeners();
  }

  // ===== MERGE CALLS (3-way Conference via ConfBridge) =====

  /// Merge both calls into a 3-way conference
  /// This works by transferring both calls to a ConfBridge room
  Future<void> mergeCalls() async {
    if (activeCall?.sipCall == null || heldCall?.sipCall == null) {
      debugPrint('[SIP] ⚠️ Cannot merge: need two calls');
      return;
    }

    // Create a unique conference room name
    final confRoom = 'conf_${DateTime.now().millisecondsSinceEpoch}';
    debugPrint('[SIP] 🔗 Merging into ConfBridge: $confRoom');

    try {
      // Transfer both calls to the conference room
      activeCall!.sipCall!.refer('sip:$confRoom@${Env.pbxDomain}');
      heldCall!.sipCall!.unhold();
      heldCall!.sipCall!.refer('sip:$confRoom@${Env.pbxDomain}');

      debugPrint('[SIP] ✅ Both calls transferred to conference $confRoom');

      // Clean up our state — the calls are now in the conference
      heldCall = null;
      _settingUpSecondCall = false;
      _isTransferConsultation = false;
      _endCall();
    } catch (e) {
      debugPrint('[SIP] ❌ Merge error: $e');
    }
  }

  // ===== ATTENDED TRANSFER =====

  /// Start an attended (consultative) transfer:
  /// Hold current call → dial the transfer target → user talks to target
  /// → then call completeAttendedTransfer() to finish
  Future<void> startAttendedTransfer(String target) async {
    _isTransferConsultation = true;
    await holdAndDial(target);
  }

  /// Complete the attended transfer — connects the held caller to the active party
  void completeAttendedTransfer() {
    if (activeCall?.sipCall == null || heldCall?.sipCall == null) {
      debugPrint('[SIP] ⚠️ Cannot complete transfer: need two calls');
      return;
    }

    try {
      // Use REFER with Replaces to connect the two parties
      final callId = heldCall!.sipCall!.id;
      activeCall!.sipCall!.refer(
        'sip:${heldCall!.remoteNumber}@${Env.pbxDomain}?Replaces=$callId',
      );
      debugPrint('[SIP] ↗️ Attended transfer completed');
    } catch (e) {
      debugPrint('[SIP] ❌ Attended transfer error: $e, trying blind fallback');
      // Fallback: blind transfer the held call to the active party's number
      try {
        heldCall!.sipCall!.unhold();
        heldCall!.sipCall!.refer('sip:${activeCall!.remoteNumber}@${Env.pbxDomain}');
      } catch (_) {}
    }

    // Clean up
    heldCall = null;
    _isTransferConsultation = false;
    _settingUpSecondCall = false;
    _endCall();
  }

  /// Cancel the attended transfer — hang up the consultation call, resume held
  void cancelAttendedTransfer() {
    if (activeCall?.sipCall != null) {
      try {
        activeCall!.sipCall!.hangup();
      } catch (_) {}
    }
    _isTransferConsultation = false;
    _settingUpSecondCall = false;
    _resumeHeldCall();
  }

  // ===== HANG UP SECOND CALL (keep held) =====

  /// Hang up the active call and resume the held one
  void hangupAndResume() {
    if (activeCall?.sipCall != null) {
      try {
        activeCall!.sipCall!.hangup();
        debugPrint('[SIP] 📴 Hung up ${activeCall!.remoteNumber}');
      } catch (_) {}
    }
    _settingUpSecondCall = false;
    _isTransferConsultation = false;
    _resumeHeldCall();
  }

  /// PTT Conference call — completely invisible to call UI
  Call? _pttCall; // Separate from activeCall
  MediaStream? _pttLocalStream; // Mic stream for PTT
  
  Future<void> makePttCall(String room) async {
    if (_pttCall != null || !isRegistered) {
      debugPrint('[SIP-PTT] ⚠️ Cannot join: pttCall active or not registered');
      return;
    }

    isPttConference = true;
    // DON'T change callState — keep it idle so UI ignores this

    try {
      // 1. Acquire microphone FIRST
      debugPrint('[SIP-PTT] 🎤 Acquiring microphone for PTT...');
      _pttLocalStream = await navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': false,
      });
      debugPrint('[SIP-PTT] 🎤 ✅ Mic acquired (${_pttLocalStream!.getAudioTracks().length} tracks)');

      // 2. Start with mic MUTED locally (listen-only mode)
      //    Asterisk has startmuted=no, so we control mute via track.enabled
      for (final track in _pttLocalStream!.getAudioTracks()) {
        track.enabled = false;
      }
      debugPrint('[SIP-PTT] 🔇 Mic tracks disabled (listen-only)');

      // 3. Join ConfBridge with our mic stream
      final success = await _helper.call(
        'sip:ptt_$room@${Env.pbxDomain}',
        voiceOnly: true,
        mediaStream: _pttLocalStream,
      );
      if (!success) {
        debugPrint('[SIP-PTT] ❌ Join failed');
        _stopPttLocalStream();
        isPttConference = false;
      } else {
        debugPrint('[SIP-PTT] 📡 Joining ConfBridge: ptt_$room (mic muted locally)');
      }
    } catch (e) {
      debugPrint('[SIP-PTT] ❌ Error: $e');
      _stopPttLocalStream();
      isPttConference = false;
    }
  }

  bool isPttMicLive = false;

  /// Hangup PTT conference
  void hangupPtt() {
    if (_pttCall != null) {
      try {
        _pttCall!.hangup();
      } catch (_) {}
    }
    isPttMicLive = false;
    _stopPttLocalStream();
    // Release renderers
    try {
      localRenderer.srcObject = null;
      remoteRenderer.srcObject = null;
    } catch (_) {}
    // Remove hidden audio element
    _pttAudioElement?.remove();
    _pttAudioElement = null;
    debugPrint('[SIP-PTT] 📴 ConfBridge disconnected, mic released');
  }

  /// Stop and release PTT mic stream
  void _stopPttLocalStream() {
    try {
      if (_pttLocalStream != null) {
        for (final track in _pttLocalStream!.getTracks()) {
          track.stop();
        }
        _pttLocalStream = null;
        debugPrint('[SIP-PTT] 🎤✅ PTT mic stream released');
      }
    } catch (e) {
      debugPrint('[SIP-PTT] ⚠️ Error releasing PTT stream: $e');
    }
  }

  /// Mute PTT — disable mic tracks locally (Asterisk still sees us as active)
  void pttMute() {
    isPttMicLive = false;
    if (_pttLocalStream != null) {
      for (final track in _pttLocalStream!.getAudioTracks()) {
        track.enabled = false;
      }
    }
    debugPrint('[SIP-PTT] 🔇 Mic tracks disabled');
  }

  /// Unmute PTT — enable mic tracks locally (audio flows to ConfBridge)
  void pttUnmute() {
    isPttMicLive = true;
    if (_pttLocalStream != null) {
      for (final track in _pttLocalStream!.getAudioTracks()) {
        track.enabled = true;
      }
      debugPrint('[SIP-PTT] 🔊 Mic tracks ENABLED — LIVE');
    } else {
      debugPrint('[SIP-PTT] ⚠️ No local stream to unmute!');
    }
  }

  bool get hasPttCall => _pttCall != null;

  // ===== INCOMING CALLS =====

  Future<void> answerCall() async {
    if (activeCall?.sipCall == null) return;

    try {
      activeCall!.sipCall!.answer(_helper.buildCallOptions(true));
      debugPrint('[SIP] ✅ Answering call');
    } catch (e) {
      debugPrint('[SIP] ❌ Answer error: $e');
    }
  }

  // ===== HANGUP =====

  Future<void> hangup() async {
    if (activeCall?.sipCall != null) {
      try {
        activeCall!.sipCall!.hangup();
        debugPrint('[SIP] 📴 Hangup');
      } catch (e) {
        debugPrint('[SIP] ❌ Hangup error: $e');
      }
    }
    _endCall();
  }

  // ===== MUTE =====

  void toggleMute() {
    if (activeCall?.sipCall == null) return;

    isMuted = !isMuted;

    if (isMuted) {
      activeCall!.sipCall!.mute();
    } else {
      activeCall!.sipCall!.unmute();
    }

    debugPrint('[SIP] ${isMuted ? "🔇 Muted" : "🔊 Unmuted"}');
    notifyListeners();
  }

  // ===== HOLD =====

  void toggleHold() {
    if (activeCall?.sipCall == null) return;

    isOnHold = !isOnHold;

    if (isOnHold) {
      activeCall!.sipCall!.hold();
    } else {
      activeCall!.sipCall!.unhold();
    }

    debugPrint('[SIP] ${isOnHold ? "⏸ On Hold" : "▶ Resumed"}');
    notifyListeners();
  }

  // ===== DTMF =====

  void sendDTMF(String digit) {
    if (activeCall?.sipCall != null) {
      activeCall!.sipCall!.sendDTMF(digit);
      debugPrint('[SIP] 🔢 DTMF: $digit');
    }
  }

  // ===== TRANSFER =====

  void transferCall(String target) {
    if (activeCall?.sipCall != null) {
      activeCall!.sipCall!.refer('sip:$target@${Env.pbxDomain}');
      debugPrint('[SIP] ↗️ Transferring to $target');
      _endCall();
    }
  }

  // ===== INTERNAL: End call and log =====

  void _endCall() {
    final call = activeCall;
    if (call != null) {
      final duration = DateTime.now().difference(call.startTime).inSeconds;
      onCallEnded?.call(call, duration);
    }

    // If there's a held call, resume it instead of going idle
    if (heldCall != null) {
      debugPrint('[SIP] 📴 Active call ended, resuming held call');
      _resumeHeldCall();
      return;
    }

    // Stop all media tracks (release microphone/camera)
    try {
      final localStream = localRenderer.srcObject;
      if (localStream != null) {
        for (final track in localStream.getTracks()) {
          track.stop();
        }
        debugPrint('[SIP] 🎤 Local stream tracks stopped');
      }
      final remoteStream = remoteRenderer.srcObject;
      if (remoteStream != null) {
        for (final track in remoteStream.getTracks()) {
          track.stop();
        }
        debugPrint('[SIP] 🔊 Remote stream tracks stopped');
      }
    } catch (e) {
      debugPrint('[SIP] ⚠️ Error stopping tracks: $e');
    }

    // Clean up renderers
    localRenderer.srcObject = null;
    remoteRenderer.srcObject = null;

    callState = NexaCallState.idle;
    activeCall = null;
    heldCall = null;
    isMuted = false;
    isOnHold = false;
    isPttConference = false;
    _settingUpSecondCall = false;
    _isTransferConsultation = false;
    notifyListeners();
    debugPrint('[SIP] 📴 Call ended — all resources released');
  }

  // ===== Media Stream Handler =====

  void _handleMediaStream(CallState state) {
    final stream = state.stream;
    if (stream == null) {
      debugPrint('[SIP] ⚠️ STREAM event but stream is null, originator=${state.originator}');
      return;
    }

    if (state.originator == Originator.local) {
      localRenderer.srcObject = stream;
      debugPrint('[SIP] 🎤 Local stream attached (${stream.getAudioTracks().length} audio tracks)');
    } else if (state.originator == Originator.remote) {
      // Assign to renderer (needed for audio playback), wrapped in try-catch
      try {
        remoteRenderer.srcObject = stream;
      } catch (e) {
        debugPrint('[SIP] ⚠️ remoteRenderer.srcObject error (non-fatal): $e');
      }
      debugPrint('[SIP] 🔊 Remote stream attached (${stream.getAudioTracks().length} audio tracks)');
      
      // For PTT: also try explicit audio element
      if (isPttConference) {
        _playPttAudio(stream);
      }
    }
    notifyListeners();
  }

  /// Play PTT conference audio through a hidden <audio> element
  /// Note: Even without this, audio plays automatically via WebRTC peer connection
  void _playPttAudio(MediaStream stream) {
    try {
      // Try to get the underlying JS MediaStream for explicit audio control
      dynamic jsMediaStream;
      try { jsMediaStream = js_util.getProperty(stream, 'jsStream'); } catch (_) {}
      jsMediaStream ??= (() { try { return js_util.getProperty(stream, '_jsStream'); } catch (_) { return null; } })();
      jsMediaStream ??= (() { try { return js_util.getProperty(stream, 'stream'); } catch (_) { return null; } })();
      
      if (jsMediaStream == null) {
        debugPrint('[SIP-PTT] ℹ️ JS MediaStream not accessible — audio plays via WebRTC automatically');
        return; // Audio still works through WebRTC peer connection
      }
      
      // Remove old audio element if exists
      _pttAudioElement?.remove();
      
      final audioEl = html.AudioElement()
        ..autoplay = true
        ..muted = isTalkieSilent;
      js_util.setProperty(audioEl, 'srcObject', jsMediaStream);
      html.document.body?.append(audioEl);
      _pttAudioElement = audioEl;
      debugPrint('[SIP-PTT] 🔊 Audio auto-play started via explicit element');
    } catch (e) {
      debugPrint('[SIP-PTT] ℹ️ Audio element setup skipped: $e — audio plays via WebRTC');
    }
  }

  /// Called on any user gesture in the Talkie screen to ensure iOS/Safari allows audio playback
  void ensurePttAudioPlaying() {
    try {
      if (_pttAudioElement != null && _pttAudioElement!.paused) {
        debugPrint('[SIP-PTT] ▶️ Resuming audio playback after user gesture');
        _pttAudioElement!.play();
      }
    } catch (e) {
      debugPrint('[SIP-PTT] ⚠️ Could not resume audio: $e');
    }
  }

  html.AudioElement? _pttAudioElement;

  // ===== SipUaHelperListener — Registration =====

  @override
  void registrationStateChanged(RegistrationState state) {
    debugPrint('[SIP] Registration state: ${state.state}');

    switch (state.state) {
      case RegistrationStateEnum.REGISTERED:
        registrationState = 'REGISTERED';
        break;
      case RegistrationStateEnum.UNREGISTERED:
        registrationState = 'NONE';
        // Auto re-register after 3s
        Future.delayed(const Duration(seconds: 3), () {
          if (registrationState == 'NONE') {
            debugPrint('[SIP] 🔄 Re-registering...');
            try {
              _helper.register();
            } catch (_) {
              _scheduleReconnect();
            }
          }
        });
        break;
      case RegistrationStateEnum.REGISTRATION_FAILED:
        registrationState = 'FAILED';
        _scheduleReconnect();
        break;
      default:
        registrationState = 'PROGRESS';
    }
    notifyListeners();
  }

  // ===== SipUaHelperListener — Call State =====

  @override
  void callStateChanged(Call call, CallState state) {
    _log('[SIP] 📱 State: ${state.state} | cause: ${state.cause?.cause} | orig: ${state.originator}');

    // ── PTT Conference: handle silently, no UI updates ──
    if (isPttConference) {
      switch (state.state) {
        case CallStateEnum.CALL_INITIATION:
          _pttCall = call;
          // Mic tracks already disabled in makePttCall() — no Asterisk mute needed
          break;
        case CallStateEnum.ACCEPTED:
        case CallStateEnum.CONFIRMED:
          _pttCall = call;
          debugPrint('[SIP-PTT] ✅ ConfBridge connected (mic locally ${isPttMicLive ? "LIVE" : "muted"})');
          break;
        case CallStateEnum.STREAM:
          _handleMediaStream(state);
          break;
        case CallStateEnum.ENDED:
        case CallStateEnum.FAILED:
          debugPrint('[SIP-PTT] 📴 ConfBridge disconnected');
          _pttCall = null;
          isPttConference = false;
          break;
        default:
          break;
      }
      return; // Don't touch callState or notifyListeners
    }

    // ── Regular calls: full UI handling ──
    // Determine if this event is for the second (new) call or the held/active call
    final isSecondCallEvent = _settingUpSecondCall && 
        heldCall != null && 
        activeCall?.sipCall == null &&
        state.state == CallStateEnum.CALL_INITIATION;

    switch (state.state) {
      case CallStateEnum.CALL_INITIATION:
        if (_settingUpSecondCall && heldCall != null) {
          // This is the second call being set up
          activeCall = ActiveCall(
            remoteNumber: activeCall?.remoteNumber ?? 'Unknown',
            direction: CallDirection.outbound,
            startTime: DateTime.now(),
            sipCall: call,
          );
          callState = NexaCallState.connecting;
          _settingUpSecondCall = false;
        } else {
          callState = NexaCallState.connecting;
          if (activeCall != null) {
            activeCall!.sipCall = call;
          }
        }
        break;

      case CallStateEnum.PROGRESS:
      case CallStateEnum.CONNECTING:
        callState = NexaCallState.connecting;
        break;

      case CallStateEnum.ACCEPTED:
      case CallStateEnum.CONFIRMED:
        callState = NexaCallState.connected;
        if (activeCall != null) {
          activeCall!.sipCall = call;
          // Reset start time to when call was actually connected
          activeCall = ActiveCall(
            remoteNumber: activeCall!.remoteNumber,
            direction: activeCall!.direction,
            startTime: DateTime.now(),
            sipCall: call,
          );
        }
        _applyWebVolume();
        break;

      case CallStateEnum.ENDED:
      case CallStateEnum.FAILED:
        // Check if the ended call is the held call
        if (heldCall?.sipCall == call) {
          debugPrint('[SIP] 📴 Held call ended');
          final heldCallInfo = heldCall!;
          final duration = DateTime.now().difference(heldCallInfo.startTime).inSeconds;
          onCallEnded?.call(heldCallInfo, duration);
          heldCall = null;
          _isTransferConsultation = false;
          notifyListeners();
          return;
        }
        _endCall();
        return; // _endCall already calls notifyListeners

      case CallStateEnum.STREAM:
        _handleMediaStream(state);
        break;

      case CallStateEnum.HOLD:
        if (!hasHeldCall) isOnHold = true;
        break;

      case CallStateEnum.UNHOLD:
        isOnHold = false;
        break;

      case CallStateEnum.MUTED:
        isMuted = true;
        break;

      case CallStateEnum.UNMUTED:
        isMuted = false;
        break;

      // Incoming call
      case CallStateEnum.NONE:
        break;

      default:
        break;
    }

    // Handle incoming call detection
    if (state.state == CallStateEnum.CALL_INITIATION &&
        call.direction == 'INCOMING') {
      _handleIncomingCall(call);
      return;
    }

    notifyListeners();
  }

  void _handleIncomingCall(Call call) {
    if (callState != NexaCallState.idle &&
        callState != NexaCallState.connecting) {
      // Already in a call — reject
      call.hangup();
      return;
    }

    final remoteNumber = call.remote_identity ?? 'Unknown';
    callState = NexaCallState.ringing;
    activeCall = ActiveCall(
      remoteNumber: remoteNumber,
      direction: CallDirection.inbound,
      startTime: DateTime.now(),
      sipCall: call,
    );
    debugPrint('[SIP] 📞 Incoming call from $remoteNumber');
    notifyListeners();
  }

  // ===== SipUaHelperListener — Transport =====

  @override
  void transportStateChanged(TransportState state) {
    debugPrint('[SIP] Transport: ${state.state}');

    if (state.state == TransportStateEnum.DISCONNECTED) {
      debugPrint('[SIP] ⚠️ Transport disconnected, will reconnect...');
      registrationState = 'NONE';
      notifyListeners();
      _scheduleReconnect();
    }
  }

  @override
  void onNewMessage(SIPMessageRequest msg) {
    debugPrint('[SIP] 📨 Message received');
  }

  @override
  void onNewNotify(Notify ntf) {
    debugPrint('[SIP] 🔔 Notify received');
  }

  @override
  void onNewReinvite(ReInvite event) {
    debugPrint('[SIP] 🔄 Re-INVITE received');
    // Auto-accept re-invites (for hold/unhold from remote side)
    event.accept?.call(_helper.buildCallOptions(true));
  }

  @override
  void dispose() {
    _helper.removeSipUaHelperListener(this);
    stop();
    super.dispose();
  }
}
