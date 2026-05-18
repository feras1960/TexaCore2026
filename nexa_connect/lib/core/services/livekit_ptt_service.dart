import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/env.dart';
import 'livekit_service.dart';

/// NexaTalkie PTT Service — Built on LiveKit
/// 
/// يحل محل SIP ConfBridge لخدمة التوكي ووكي:
///   Press PTT → mic enabled in LiveKit Room → real-time audio to all
///   Release   → mic disabled → stay connected (listening)
///   Leave     → disconnect from Room
class LiveKitPttService extends ChangeNotifier {
  final LiveKitService _livekit;
  final SupabaseClient _client;
  final String userId;

  // ═══════════════════════════════════
  // State
  // ═══════════════════════════════════
  
  PttState state = PttState.disconnected;
  String? _activeChannelId;
  String? _activeRoomName;
  String? currentTalkerName;
  int talkDurationSeconds = 0;
  Timer? _talkTimer;
  
  // Channels from DB
  List<PttChannel> channels = [];
  bool isLoading = true;

  // Realtime for signaling
  RealtimeChannel? _realtimeChannel;

  LiveKitPttService(this._livekit, this._client, this.userId);

  // ═══════════════════════════════════
  // Data Loading
  // ═══════════════════════════════════
  
  Future<void> loadChannels() async {
    try {
      final data = await _client
          .from('nexa_ptt_channels')
          .select('*, nexa_ptt_members(count)')
          .order('created_at');

      final list = data as List<dynamic>? ?? [];
      channels = list.map((json) => PttChannel.fromJson(json as Map<String, dynamic>)).toList();
      
      // إذا لم توجد قنوات، أنشئ قنوات افتراضية
      if (channels.isEmpty) {
        await _createDefaultChannels();
      }
      
      isLoading = false;
      notifyListeners();
      debugPrint('[LiveKit PTT] ✅ Loaded ${channels.length} channels');
    } catch (e) {
      isLoading = false;
      notifyListeners();
      debugPrint('[LiveKit PTT] ❌ Load error: $e');
    }
  }

  Future<void> _createDefaultChannels() async {
    try {
      await _client.from('nexa_ptt_channels').insert([
        {
          'name': 'فريق المستودع',
          'type': 'group',
          'conference_room': 'warehouse',
          'created_by': userId,
        },
        {
          'name': 'فريق المبيعات',
          'type': 'group', 
          'conference_room': 'sales',
          'created_by': userId,
        },
      ]);
      // Reload
      final data = await _client
          .from('nexa_ptt_channels')
          .select()
          .order('created_at');
      channels = (data as List).map((j) => PttChannel.fromJson(j)).toList();
      debugPrint('[LiveKit PTT] ✅ Created default channels');
    } catch (e) {
      debugPrint('[LiveKit PTT] ⚠️ Default channels error: $e');
    }
  }

  // ═══════════════════════════════════
  // Channel Management
  // ═══════════════════════════════════

  Future<String?> createChannel(String name, String type) async {
    try {
      final room = name.toLowerCase().replaceAll(RegExp(r'[^\w]'), '_');
      final result = await _client.from('nexa_ptt_channels').insert({
        'name': name,
        'type': type,
        'conference_room': room,
        'created_by': userId,
      }).select('id').single();
      await loadChannels();
      return result['id'] as String?;
    } catch (e) {
      debugPrint('[LiveKit PTT] ❌ Create channel error: $e');
      return null;
    }
  }

  Future<void> sendInvitation({
    required String type,
    String? toUserId,
    String? toPhone,
    String? channelId,
    String? channelName,
    String? message,
    String? fromName,
  }) async {
    try {
      await _client.rpc('nexa_send_ptt_invitation', params: {
        'p_type': type,
        'p_from_user_id': userId,
        'p_from_user_name': fromName ?? 'NexaTalkie User',
        'p_to_user_id': toUserId,
        'p_to_phone': toPhone,
        'p_channel_id': channelId,
        'p_channel_name': channelName,
        'p_message': message,
      });
    } catch (e) {
      debugPrint('[LiveKit PTT] ❌ Send invite error: $e');
    }
  }

  // ═══════════════════════════════════
  // Join/Leave Channel (LiveKit Room)
  // ═══════════════════════════════════

  /// الانضمام لقناة PTT (الاتصال بغرفة LiveKit)
  Future<bool> joinChannel(PttChannel channel) async {
    if (state != PttState.disconnected) {
      await leaveChannel();
    }

    _activeChannelId = channel.id;
    _activeRoomName = 'ptt_${channel.conferenceRoom}';
    state = PttState.connecting;
    notifyListeners();

    try {
      // 1. الاتصال بغرفة LiveKit
      final success = await _livekit.connectToRoom(
        identity: userId,
        roomName: _activeRoomName!,
      );

      if (!success) {
        state = PttState.disconnected;
        notifyListeners();
        debugPrint('[LiveKit PTT] ❌ Failed to join room');
        return false;
      }

      // 2. الاشتراك في Realtime Signaling
      _subscribeToChannel(channel);

      // 3. تحديث حالة التواجد
      _updateOnlineStatus(true);

      state = PttState.listening;
      notifyListeners();
      debugPrint('[LiveKit PTT] 📡 Joined channel: ${channel.name} (room: $_activeRoomName)');
      return true;
    } catch (e) {
      state = PttState.disconnected;
      _activeChannelId = null;
      _activeRoomName = null;
      notifyListeners();
      debugPrint('[LiveKit PTT] ❌ Join error: $e');
      return false;
    }
  }

  /// مغادرة القناة الحالية
  Future<void> leaveChannel() async {
    if (state == PttState.talking) {
      stopTalking();
    }

    // قطع الاتصال من LiveKit
    await _livekit.disconnect();

    // تحديث حالة التواجد
    _updateOnlineStatus(false);

    // إلغاء الاشتراك من Realtime
    _realtimeChannel?.unsubscribe();
    _realtimeChannel = null;

    _activeChannelId = null;
    _activeRoomName = null;
    currentTalkerName = null;
    talkDurationSeconds = 0;
    _talkTimer?.cancel();
    state = PttState.disconnected;
    notifyListeners();
    debugPrint('[LiveKit PTT] 📴 Left channel');
  }

  // ═══════════════════════════════════
  // PTT — Press to Talk
  // ═══════════════════════════════════

  /// بدء التحدث (تشغيل الميكروفون)
  Future<void> startTalking() async {
    if (state != PttState.listening) return;
    if (currentTalkerName != null) {
      debugPrint('[LiveKit PTT] 🔒 Locked — $currentTalkerName is talking');
      return;
    }

    // تشغيل الميكروفون في LiveKit
    await _livekit.enableMicrophone();

    state = PttState.talking;
    talkDurationSeconds = 0;
    
    // مؤقت مدة التحدث
    _talkTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      talkDurationSeconds++;
      notifyListeners();
    });

    // بث إشارة "أنا أتحدث" عبر Realtime
    _realtimeChannel?.sendBroadcastMessage(
      event: 'ptt_talking',
      payload: {
        'user_id': userId,
        'user_name': 'User', // سيُحدّث لاحقاً من Auth
        'is_talking': true,
      },
    );

    notifyListeners();
    debugPrint('[LiveKit PTT] 🎤 Talking...');
  }

  /// إيقاف التحدث (كتم الميكروفون)
  Future<void> stopTalking() async {
    if (state != PttState.talking) return;

    // كتم الميكروفون في LiveKit
    await _livekit.disableMicrophone();

    _talkTimer?.cancel();
    final duration = talkDurationSeconds;
    state = PttState.listening;

    // بث إشارة "توقفت عن التحدث"
    _realtimeChannel?.sendBroadcastMessage(
      event: 'ptt_talking',
      payload: {
        'user_id': userId,
        'is_talking': false,
        'duration_seconds': duration,
      },
    );

    // حفظ نشاط PTT في DB
    try {
      if (_activeChannelId != null && duration > 0) {
        await _client.from('nexa_ptt_activity').insert({
          'channel_id': _activeChannelId,
          'user_id': userId,
          'action': 'talk_end',
          'duration_ms': duration * 1000,
        });
      }
    } catch (_) {}

    talkDurationSeconds = 0;
    notifyListeners();
    debugPrint('[LiveKit PTT] 🔇 Stopped talking (${duration}s)');
  }

  // ═══════════════════════════════════
  // Realtime Signaling
  // ═══════════════════════════════════

  void _subscribeToChannel(PttChannel channel) {
    _realtimeChannel?.unsubscribe();
    
    // Use 'ptt_signal_' prefix to avoid conflict with screen's 'nexatalkie_' channel
    _realtimeChannel = _client
        .channel('ptt_signal_${channel.conferenceRoom}')
        .onBroadcast(
          event: 'ptt_talking',
          callback: (payload) {
            final senderId = payload['user_id'] as String?;
            if (senderId == userId) return; // تجاهل رسائلي الخاصة

            final isTalking = payload['is_talking'] as bool? ?? false;
            if (isTalking) {
              currentTalkerName = payload['user_name'] as String? ?? 'متحدث';
              if (state == PttState.listening) {
                state = PttState.receiving;
              }
            } else {
              currentTalkerName = null;
              if (state == PttState.receiving) {
                state = PttState.listening;
              }
            }
            notifyListeners();
          },
        )
        .onBroadcast(
          event: 'ptt_new_message',
          callback: (payload) {
            // رسالة صوتية جديدة — يمكن تحديث التاريخ
            notifyListeners();
          },
        )
        .subscribe();
  }

  // ═══════════════════════════════════
  // Online Status
  // ═══════════════════════════════════

  Future<void> _updateOnlineStatus(bool isOnline) async {
    if (_activeChannelId == null) return;
    // Skip for guest/unauthenticated users — DB requires auth
    try {
      await _client
          .from('nexa_ptt_members')
          .upsert({
            'channel_id': _activeChannelId!,
            'user_id': userId,
            'is_online': isOnline,
            'is_talking': false,
            'last_active_at': DateTime.now().toUtc().toIso8601String(),
          }, onConflict: 'channel_id,user_id');
    } catch (e) {
      debugPrint('[LiveKit PTT] ⚠️ Online status update skipped: $e');
    }
  }

  // ═══════════════════════════════════
  // Helpers
  // ═══════════════════════════════════

  String? get activeChannelId => _activeChannelId;
  bool get isConnected => state != PttState.disconnected;
  bool get isTalking => state == PttState.talking;
  bool get isLocked => currentTalkerName != null && state != PttState.talking;
  
  int get participantCount => _livekit.participantCount;

  PttChannel? get activeChannel {
    if (_activeChannelId == null) return null;
    try {
      return channels.firstWhere((c) => c.id == _activeChannelId);
    } catch (_) {
      return null;
    }
  }

  @override
  void dispose() {
    leaveChannel();
    super.dispose();
  }
}

// ═══════════════════════════════════
// Enums & Models
// ═══════════════════════════════════

enum PttState {
  disconnected,
  connecting,
  listening,
  talking,
  receiving,
}

class PttChannel {
  final String id;
  final String name;
  final String type;
  final String conferenceRoom;
  final String? avatarUrl;
  final int memberCount;
  final int onlineCount;
  final String? createdBy;

  PttChannel({
    required this.id,
    required this.name,
    required this.type,
    required this.conferenceRoom,
    this.avatarUrl,
    this.memberCount = 0,
    this.onlineCount = 0,
    this.createdBy,
  });

  factory PttChannel.fromJson(Map<String, dynamic> json) {
    // Handle member count from nested query or direct field
    int members = 0;
    if (json['nexa_ptt_members'] != null) {
      final m = json['nexa_ptt_members'];
      if (m is List && m.isNotEmpty && m[0]['count'] != null) {
        members = m[0]['count'] as int;
      }
    } else if (json['member_count'] != null) {
      members = json['member_count'] as int;
    }

    return PttChannel(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String? ?? 'group',
      conferenceRoom: json['conference_room'] as String,
      avatarUrl: json['avatar_url'] as String?,
      memberCount: members,
      onlineCount: json['online_count'] as int? ?? 0,
      createdBy: json['created_by'] as String?,
    );
  }

  String get typeIcon => type == 'buddy' ? '🤝' : '👥';
}
