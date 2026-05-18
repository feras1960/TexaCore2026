import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:livekit_client/livekit_client.dart';
import '../config/env.dart';

/// NexaConnect LiveKit Service
/// 
/// المحرك الأساسي للاتصالات الداخلية:
/// - PTT (توكي ووكي)
/// - مكالمات صوتية 1↔1
/// - مكالمات فيديو
/// - مكالمات جماعية
class LiveKitService extends ChangeNotifier {
  Room? _room;
  Room? get room => _room;
  LocalParticipant? _localParticipant;
  EventsListener<RoomEvent>? _listener;

  // ═══════════════════════════════════
  // State
  // ═══════════════════════════════════
  
  LiveKitConnectionState _connectionState = LiveKitConnectionState.disconnected;
  LiveKitConnectionState get connectionState => _connectionState;
  bool get isConnected => _connectionState == LiveKitConnectionState.connected;
  
  bool _isMicEnabled = false;
  bool get isMicEnabled => _isMicEnabled;
  
  bool _isCameraEnabled = false;
  bool get isCameraEnabled => _isCameraEnabled;
  
  String? _currentRoomName;
  String? get currentRoomName => _currentRoomName;
  
  List<RemoteParticipant> get remoteParticipants => 
      _room?.remoteParticipants.values.toList() ?? [];
  
  int get participantCount => 
      (_room?.remoteParticipants.length ?? 0) + (isConnected ? 1 : 0);

  // Debug logs
  final List<String> debugLogs = [];
  void _log(String msg) {
    debugPrint('[LiveKit] $msg');
    debugLogs.add('${DateTime.now().toString().substring(11, 19)} $msg');
    if (debugLogs.length > 50) debugLogs.removeAt(0);
    notifyListeners();
  }

  // ═══════════════════════════════════
  // Token Generation
  // ═══════════════════════════════════
  
  /// الحصول على Token من Supabase Edge Function
  Future<String?> getToken({
    required String identity,
    required String roomName,
    bool canPublish = true,
    bool canSubscribe = true,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${Env.supabaseUrl}/functions/v1/livekit-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${Env.supabaseAnonKey}',
        },
        body: jsonEncode({
          'identity': identity,
          'room': roomName,
          'canPublish': canPublish,
          'canSubscribe': canSubscribe,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _log('🔑 Token received for room: $roomName');
        return data['token'] as String;
      } else {
        _log('❌ Token error: ${response.body}');
        return null;
      }
    } catch (e) {
      _log('❌ Token request failed: $e');
      return null;
    }
  }

  /// اتصال سريع — يحصل على Token ويتصل بالغرفة تلقائياً
  Future<bool> connectToRoom({
    required String identity,
    required String roomName,
  }) async {
    final token = await getToken(identity: identity, roomName: roomName);
    if (token == null) return false;
    return connect(token, roomName: roomName);
  }

  // ═══════════════════════════════════
  // Connect to a Room
  // ═══════════════════════════════════
  
  /// الاتصال بغرفة LiveKit
  /// [token] — JWT Token يتم الحصول عليه من Edge Function
  /// [roomName] — اسم الغرفة (للعرض فقط)
  Future<bool> connect(String token, {String? roomName}) async {
    if (isConnected) {
      _log('⚠️ Already connected to ${_currentRoomName}');
      return true;
    }

    try {
      _connectionState = LiveKitConnectionState.connecting;
      _currentRoomName = roomName;
      notifyListeners();

      // إنشاء الغرفة مع إعدادات محسّنة
      _room = Room(
        roomOptions: const RoomOptions(
          adaptiveStream: true,      // جودة تلقائية حسب الشبكة
          dynacast: true,            // توفير الباندويث
          defaultAudioCaptureOptions: AudioCaptureOptions(
            echoCancellation: true,    // مانع الصدى
            noiseSuppression: true,    // كتم الضوضاء
            autoGainControl: true,     // التحكم التلقائي بالصوت
          ),
          defaultAudioPublishOptions: AudioPublishOptions(
            dtx: true,               // كتم عند الصمت (توفير بيانات)
          ),
          defaultVideoPublishOptions: VideoPublishOptions(
            simulcast: true,         // عدة جودات للفيديو
          ),
        ),
      );

      // الاستماع لأحداث الغرفة
      _setupRoomListeners();

      // الاتصال
      await _room!.connect(
        Env.livekitUrl,
        token,
        fastConnectOptions: FastConnectOptions(
          microphone: TrackOption(enabled: false), // البدء بميكروفون مغلق
          camera: TrackOption(enabled: false),     // البدء بكاميرا مغلقة
        ),
      );

      _localParticipant = _room!.localParticipant;
      _connectionState = LiveKitConnectionState.connected;
      _log('✅ Connected to room: ${_room!.name}');
      notifyListeners();
      return true;
    } catch (e) {
      _connectionState = LiveKitConnectionState.disconnected;
      _currentRoomName = null;
      _log('❌ Connection failed: $e');
      notifyListeners();
      return false;
    }
  }

  // ═══════════════════════════════════
  // Disconnect
  // ═══════════════════════════════════
  
  Future<void> disconnect() async {
    if (_room == null) return;
    
    try {
      await _room!.disconnect();
    } catch (e) {
      _log('⚠️ Disconnect error: $e');
    }
    
    _listener?.dispose();
    _listener = null;
    _room = null;
    _localParticipant = null;
    _connectionState = LiveKitConnectionState.disconnected;
    _currentRoomName = null;
    _isMicEnabled = false;
    _isCameraEnabled = false;
    _log('📴 Disconnected');
    notifyListeners();
  }

  // ═══════════════════════════════════
  // Microphone Control
  // ═══════════════════════════════════
  
  /// تشغيل/إيقاف الميكروفون
  Future<void> toggleMicrophone({bool? enabled}) async {
    if (_localParticipant == null) return;
    
    final shouldEnable = enabled ?? !_isMicEnabled;
    
    try {
      await _localParticipant!.setMicrophoneEnabled(shouldEnable);
      _isMicEnabled = shouldEnable;
      _log(shouldEnable ? '🎤 Mic ON' : '🔇 Mic OFF');
      notifyListeners();
    } catch (e) {
      _log('❌ Mic toggle error: $e');
    }
  }

  /// تشغيل الميكروفون (للـ PTT)
  Future<void> enableMicrophone() => toggleMicrophone(enabled: true);
  
  /// إيقاف الميكروفون (للـ PTT)
  Future<void> disableMicrophone() => toggleMicrophone(enabled: false);

  // ═══════════════════════════════════
  // Camera Control
  // ═══════════════════════════════════
  
  /// تشغيل/إيقاف الكاميرا
  Future<void> toggleCamera({bool? enabled}) async {
    if (_localParticipant == null) return;
    
    final shouldEnable = enabled ?? !_isCameraEnabled;
    
    try {
      await _localParticipant!.setCameraEnabled(shouldEnable);
      _isCameraEnabled = shouldEnable;
      _log(shouldEnable ? '📹 Camera ON' : '📷 Camera OFF');
      notifyListeners();
    } catch (e) {
      _log('❌ Camera toggle error: $e');
    }
  }

  /// تبديل الكاميرا الأمامية ↔ الخلفية
  bool _isFrontCamera = true;
  bool get isFrontCamera => _isFrontCamera;

  Future<void> switchCamera() async {
    if (_localParticipant == null || !_isCameraEnabled) return;

    try {
      // البحث عن video track الحالي
      final videoPub = _localParticipant!.videoTrackPublications
          .where((pub) => pub.track != null && pub.source == TrackSource.camera)
          .firstOrNull;
      
      if (videoPub?.track != null) {
        // استخدام Helper.switchCamera من LiveKit مباشرة
        final videoTrack = videoPub!.track as LocalVideoTrack;
        await videoTrack.setCameraPosition(
          _isFrontCamera ? CameraPosition.back : CameraPosition.front,
        );
        _isFrontCamera = !_isFrontCamera;
        _log(_isFrontCamera ? '📸 Front camera' : '📸 Back camera');
      } else {
        // fallback: إيقاف وإعادة تشغيل
        _isFrontCamera = !_isFrontCamera;
        await _localParticipant!.setCameraEnabled(false);
        await Future.delayed(const Duration(milliseconds: 200));
        final position = _isFrontCamera ? CameraPosition.front : CameraPosition.back;
        await _localParticipant!.setCameraEnabled(true, cameraCaptureOptions: CameraCaptureOptions(
          cameraPosition: position,
          maxFrameRate: 30,
        ));
      }
      notifyListeners();
    } catch (e) {
      _log('❌ Switch camera error: $e');
    }
  }

  // ═══════════════════════════════════
  // Room Event Listeners
  // ═══════════════════════════════════
  
  void _setupRoomListeners() {
    _listener = _room!.createListener();
    
    _listener!
      ..on<RoomDisconnectedEvent>((event) {
        _log('📴 Room disconnected');
        _connectionState = LiveKitConnectionState.disconnected;
        _isMicEnabled = false;
        _isCameraEnabled = false;
        notifyListeners();
      })
      ..on<ParticipantConnectedEvent>((event) {
        _log('👤 ${event.participant.identity} joined');
        notifyListeners();
      })
      ..on<ParticipantDisconnectedEvent>((event) {
        _log('👤 ${event.participant.identity} left');
        notifyListeners();
      })
      ..on<TrackPublishedEvent>((event) {
        _log('🎵 Track published by ${event.participant.identity}');
        notifyListeners();
      })
      ..on<TrackUnpublishedEvent>((event) {
        _log('🔇 Track unpublished by ${event.participant.identity}');
        notifyListeners();
      })
      ..on<ActiveSpeakersChangedEvent>((event) {
        // مؤشر المتحدث النشط — مهم جداً للـ PTT
        notifyListeners();
      })
      ..on<RoomReconnectingEvent>((_) {
        _log('🔄 Reconnecting...');
        _connectionState = LiveKitConnectionState.reconnecting;
        notifyListeners();
      })
      ..on<RoomReconnectedEvent>((_) {
        _log('✅ Reconnected');
        _connectionState = LiveKitConnectionState.connected;
        notifyListeners();
      });
  }

  // ═══════════════════════════════════
  // Active Speakers (للـ PTT)
  // ═══════════════════════════════════
  
  /// قائمة المتحدثين النشطين حالياً
  List<Participant> get activeSpeakers => _room?.activeSpeakers ?? [];
  
  /// هل يوجد شخص يتحدث الآن؟
  bool get hasSpeaker => activeSpeakers.isNotEmpty;
  
  /// اسم المتحدث الحالي
  String? get currentSpeakerName {
    if (activeSpeakers.isEmpty) return null;
    return activeSpeakers.isEmpty ? null : activeSpeakers.first.identity;
  }

  // ═══════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════
  
  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}

// ═══════════════════════════════════
// Enums
// ═══════════════════════════════════

enum LiveKitConnectionState {
  disconnected,
  connecting,
  connected,
  reconnecting,
}
