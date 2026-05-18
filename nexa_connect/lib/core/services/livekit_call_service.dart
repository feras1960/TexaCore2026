import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:livekit_client/livekit_client.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/env.dart';

/// حالات المكالمة
enum LiveCallState { idle, outgoingRinging, incomingRinging, connecting, connected, ended }

/// معلومات المكالمة النشطة
class LiveCallInfo {
  final String callId;
  final String remoteUserId;
  final String remoteName;
  final bool isOutgoing;
  final DateTime startTime;

  LiveCallInfo({
    required this.callId,
    required this.remoteUserId,
    required this.remoteName,
    required this.isOutgoing,
    required this.startTime,
  });

  String get roomName => 'call_$callId';
}

/// خدمة مكالمات 1↔1 — مستقلة تماماً عن PTT
/// 
/// تملك غرفة LiveKit خاصة بها (منفصلة عن غرفة PTT)
/// هذا يسمح بإجراء مكالمة خاصة بدون فصل قناة PTT
class LiveKitCallService extends ChangeNotifier {
  final SupabaseClient _client;
  final String userId;
  final String displayName;

  LiveKitCallService(this._client, this.userId, this.displayName);

  // ═══════════════════════════════════
  // غرفة LiveKit خاصة بالمكالمات (منفصلة عن PTT)
  // ═══════════════════════════════════

  Room? _callRoom;
  LocalParticipant? _localParticipant;

  // ═══════════════════════════════════
  // State
  // ═══════════════════════════════════

  LiveCallState _state = LiveCallState.idle;
  LiveCallState get state => _state;

  LiveCallInfo? _activeCall;
  LiveCallInfo? get activeCall => _activeCall;

  bool _isMuted = false;
  bool get isMuted => _isMuted;

  bool _isVideoEnabled = false;
  bool get isVideoEnabled => _isVideoEnabled;

  int _callDuration = 0;
  int get callDuration => _callDuration;
  Timer? _durationTimer;

  RealtimeChannel? _signalChannel;
  Timer? _ringTimer;
  static const _ringTimeoutSeconds = 30;

  // Video access
  Room? get room => _callRoom;
  List<RemoteParticipant> get remoteParticipants =>
      _callRoom?.remoteParticipants.values.toList() ?? [];

  // ═══════════════════════════════════
  // Initialize — الاشتراك في إشارات المكالمات
  // ═══════════════════════════════════

  void initialize() {
    _signalChannel?.unsubscribe();
    
    debugPrint('[Call] 📡 Subscribing to call signals for $userId');
    _signalChannel = _client
        .channel('call_signal_$userId')
        .onBroadcast(event: 'call_invite', callback: _handleIncomingCall)
        .onBroadcast(event: 'call_accepted', callback: _handleCallAccepted)
        .onBroadcast(event: 'call_rejected', callback: _handleCallRejected)
        .onBroadcast(event: 'call_ended', callback: _handleCallEnded)
        .subscribe((status, [error]) {
          debugPrint('[Call] 📡 Signal channel: $status');
        });
  }

  // ═══════════════════════════════════
  // Token Generation (مستقل)
  // ═══════════════════════════════════

  Future<String?> _getToken(String roomName) async {
    try {
      final response = await _client.functions.invoke(
        'livekit-token',
        body: {'identity': userId, 'room': roomName},
      );
      if (response.status == 200 && response.data != null) {
        final data = response.data is String ? jsonDecode(response.data) : response.data;
        return data['token'] as String?;
      }
    } catch (e) {
      debugPrint('[Call] ❌ Token error: $e');
    }
    return null;
  }

  // ═══════════════════════════════════
  // بدء مكالمة (المتصل)
  // ═══════════════════════════════════

  Future<bool> makeCall(String targetUserId, String targetName) async {
    if (_state != LiveCallState.idle) {
      debugPrint('[Call] ⚠️ Already in call');
      return false;
    }

    final callId = DateTime.now().millisecondsSinceEpoch.toString();
    _activeCall = LiveCallInfo(
      callId: callId,
      remoteUserId: targetUserId,
      remoteName: targetName,
      isOutgoing: true,
      startTime: DateTime.now(),
    );
    _state = LiveCallState.outgoingRinging;
    notifyListeners();

    debugPrint('[Call] 📞 Calling $targetName ($targetUserId)...');

    try {
      final targetChannel = _client.channel('call_signal_$targetUserId');
      await targetChannel.subscribe();
      await Future.delayed(const Duration(milliseconds: 300));
      await targetChannel.sendBroadcastMessage(
        event: 'call_invite',
        payload: {
          'call_id': callId,
          'caller_id': userId,
          'caller_name': displayName,
        },
      );
      debugPrint('[Call] 📨 Invite sent');
      await Future.delayed(const Duration(milliseconds: 500));
      targetChannel.unsubscribe();
    } catch (e) {
      debugPrint('[Call] ❌ Failed to send invite: $e');
      _endCallCleanup('failed');
      return false;
    }

    _ringTimer = Timer(Duration(seconds: _ringTimeoutSeconds), () {
      if (_state == LiveCallState.outgoingRinging) _endCallCleanup('missed');
    });

    return true;
  }

  // ═══════════════════════════════════
  // استقبال مكالمة
  // ═══════════════════════════════════

  void _handleIncomingCall(Map<String, dynamic> payload) {
    if (_state != LiveCallState.idle) return;
    final callId = payload['call_id'] as String?;
    final callerId = payload['caller_id'] as String?;
    final callerName = payload['caller_name'] as String? ?? 'مستخدم';
    if (callId == null || callerId == null) return;

    debugPrint('[Call] 📲 Incoming from $callerName');
    _activeCall = LiveCallInfo(
      callId: callId, remoteUserId: callerId, remoteName: callerName,
      isOutgoing: false, startTime: DateTime.now(),
    );
    _state = LiveCallState.incomingRinging;
    notifyListeners();

    _ringTimer = Timer(Duration(seconds: _ringTimeoutSeconds), () {
      if (_state == LiveCallState.incomingRinging) _endCallCleanup('missed');
    });
  }

  // ═══════════════════════════════════
  // الرد / الرفض
  // ═══════════════════════════════════

  Future<void> acceptCall() async {
    if (_state != LiveCallState.incomingRinging || _activeCall == null) return;
    _ringTimer?.cancel();
    _state = LiveCallState.connecting;
    notifyListeners();

    debugPrint('[Call] ✅ Accepting call');
    await _sendSignal(_activeCall!.remoteUserId, 'call_accepted', {
      'call_id': _activeCall!.callId,
      'accepter_id': userId,
      'accepter_name': displayName,
    });
    await _joinCallRoom();
  }

  Future<void> rejectCall() async {
    if (_state != LiveCallState.incomingRinging || _activeCall == null) return;
    debugPrint('[Call] ❌ Rejecting call');
    await _sendSignal(_activeCall!.remoteUserId, 'call_rejected', {
      'call_id': _activeCall!.callId,
    });
    _endCallCleanup('rejected');
  }

  void _handleCallAccepted(Map<String, dynamic> payload) {
    if (payload['call_id'] != _activeCall?.callId) return;
    _ringTimer?.cancel();
    _state = LiveCallState.connecting;
    notifyListeners();
    _joinCallRoom();
  }

  void _handleCallRejected(Map<String, dynamic> payload) {
    if (payload['call_id'] != _activeCall?.callId) return;
    _endCallCleanup('rejected');
  }

  void _handleCallEnded(Map<String, dynamic> payload) {
    if (payload['call_id'] != _activeCall?.callId) return;
    _endCallCleanup('ended');
  }

  // ═══════════════════════════════════
  // الانضمام لغرفة LiveKit المستقلة
  // ═══════════════════════════════════

  Future<void> _joinCallRoom() async {
    if (_activeCall == null) return;
    final roomName = _activeCall!.roomName;

    debugPrint('[Call] 🔗 Joining call room: $roomName (independent from PTT)');

    final token = await _getToken(roomName);
    if (token == null) {
      debugPrint('[Call] ❌ No token');
      _endCallCleanup('failed');
      return;
    }

    try {
      // إنشاء غرفة مستقلة خاصة بالمكالمات
      _callRoom = Room(
        roomOptions: const RoomOptions(
          adaptiveStream: true,
          dynacast: true,
          defaultAudioCaptureOptions: AudioCaptureOptions(
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          ),
          defaultCameraCaptureOptions: CameraCaptureOptions(
            maxFrameRate: 30,
          ),
        ),
      );

      await _callRoom!.connect(Env.livekitUrl, token);
      _localParticipant = _callRoom!.localParticipant;

      // تشغيل الميكروفون
      await _localParticipant!.setMicrophoneEnabled(true);

      _state = LiveCallState.connected;
      _callDuration = 0;
      _durationTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        _callDuration++;
        notifyListeners();
      });

      // الاستماع لأحداث الغرفة
      _callRoom!.createListener()
        ..on<ParticipantConnectedEvent>((e) {
          debugPrint('[Call] 👤 ${e.participant.identity} joined');
          notifyListeners();
        })
        ..on<ParticipantDisconnectedEvent>((e) {
          debugPrint('[Call] 👤 ${e.participant.identity} left (duration: $_callDuration s)');
          // فقط أنهِ المكالمة إذا كنا متصلين فعلاً لأكثر من 3 ثوانٍ
          // لتجنب الفصل المبكر أثناء إعداد الغرفة
          if (_callDuration > 3 && _state == LiveCallState.connected) {
            _endCallCleanup('ended');
          }
        })
        ..on<TrackSubscribedEvent>((e) {
          debugPrint('[Call] 🎵 Track subscribed: ${e.track.kind}');
          notifyListeners();
        })
        ..on<RoomDisconnectedEvent>((e) {
          debugPrint('[Call] 🔌 Room disconnected');
          if (_state == LiveCallState.connected) {
            _endCallCleanup('ended');
          }
        });

      debugPrint('[Call] ✅ Connected — voice active (independent room)');
    } catch (e) {
      debugPrint('[Call] ❌ Join error: $e');
      _endCallCleanup('failed');
    }
    notifyListeners();
  }

  // ═══════════════════════════════════
  // إنهاء المكالمة
  // ═══════════════════════════════════

  Future<void> endCall() async {
    if (_activeCall == null) return;
    debugPrint('[Call] 📴 Ending call...');
    await _sendSignal(_activeCall!.remoteUserId, 'call_ended', {
      'call_id': _activeCall!.callId,
    });
    _endCallCleanup('answered');
  }

  // ═══════════════════════════════════
  // Mute / Video
  // ═══════════════════════════════════

  Future<void> toggleMute() async {
    _isMuted = !_isMuted;
    await _localParticipant?.setMicrophoneEnabled(!_isMuted);
    debugPrint('[Call] ${_isMuted ? "🔇 Muted" : "🎤 Unmuted"}');
    notifyListeners();
  }

  Future<void> toggleVideo() async {
    _isVideoEnabled = !_isVideoEnabled;
    await _localParticipant?.setCameraEnabled(_isVideoEnabled);
    debugPrint('[Call] ${_isVideoEnabled ? "📹 Video ON" : "📷 Video OFF"}');
    notifyListeners();
  }

  // ═══════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════

  void _endCallCleanup(String status) {
    _ringTimer?.cancel();
    _durationTimer?.cancel();

    final call = _activeCall;
    final duration = _callDuration;

    // فصل الغرفة المستقلة
    if (_callRoom != null) {
      _callRoom!.disconnect();
      _callRoom = null;
      _localParticipant = null;
    }

    _state = LiveCallState.ended;
    _isMuted = false;
    _isVideoEnabled = false;
    notifyListeners();

    if (call != null) _saveCallLog(call, duration, status);

    Future.delayed(const Duration(seconds: 1), () {
      _state = LiveCallState.idle;
      _activeCall = null;
      _callDuration = 0;
      notifyListeners();
    });
  }

  // ═══════════════════════════════════
  // Helpers
  // ═══════════════════════════════════

  Future<void> _sendSignal(String targetId, String event, Map<String, dynamic> payload) async {
    try {
      final ch = _client.channel('call_signal_$targetId');
      await ch.subscribe();
      await Future.delayed(const Duration(milliseconds: 300));
      await ch.sendBroadcastMessage(event: event, payload: payload);
      await Future.delayed(const Duration(milliseconds: 300));
      ch.unsubscribe();
    } catch (e) {
      debugPrint('[Call] ⚠️ Signal error: $e');
    }
  }

  Future<void> _saveCallLog(LiveCallInfo call, int duration, String status) async {
    try {
      await _client.from('pbx_call_logs').insert({
        'caller': call.isOutgoing ? userId : call.remoteUserId,
        'callee': call.isOutgoing ? call.remoteUserId : userId,
        'direction': call.isOutgoing ? 'outbound' : 'inbound',
        'duration_seconds': duration,
        'status': status,
        'call_date': call.startTime.toUtc().toIso8601String(),
      });
      debugPrint('[Call] ✅ Log saved ($status, ${duration}s)');
    } catch (e) {
      debugPrint('[Call] ⚠️ Log error: $e');
    }
  }

  bool get isInCall => _state != LiveCallState.idle && _state != LiveCallState.ended;

  String get durationText {
    final m = (_callDuration ~/ 60).toString().padLeft(2, '0');
    final s = (_callDuration % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  void dispose() {
    _ringTimer?.cancel();
    _durationTimer?.cancel();
    _signalChannel?.unsubscribe();
    _callRoom?.disconnect();
    super.dispose();
  }
}
