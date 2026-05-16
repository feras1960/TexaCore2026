import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:sip_ua/sip_ua.dart';
import '../config/env.dart';

/// NexaTalkie — Real-time PTT via Asterisk Conference Bridge
///
/// Flow:
///   Press PTT → SIP INVITE to conference room → mic unmuted → real-time audio
///   Release   → mic muted → stay connected (listening)
///   Leave     → SIP BYE → disconnect from conference
class NexaTalkieService extends ChangeNotifier {
  final SupabaseClient _client;
  final SIPUAHelper _sipHelper;
  final String userId;

  // State
  PttState state = PttState.disconnected;
  String? _activeChannelId;
  String? _activeConferenceRoom;
  Call? _conferenceCall;
  String? currentTalkerName;
  int talkDurationSeconds = 0;
  Timer? _talkTimer;

  // Channels
  List<PttChannel> channels = [];
  List<PttInvitation> pendingInvitations = [];
  bool isLoading = true;

  // Realtime
  RealtimeChannel? _realtimeChannel;

  NexaTalkieService(this._client, this._sipHelper, this.userId);

  // ═══════════════════════════════════
  // Data Loading
  // ═══════════════════════════════════

  Future<void> loadChannels() async {
    try {
      final data = await _client.rpc('nexa_get_ptt_channels', params: {
        'p_user_id': userId,
      });

      final list = data as List<dynamic>? ?? [];
      channels = list
          .map((json) => PttChannel.fromJson(json as Map<String, dynamic>))
          .toList();

      isLoading = false;
      notifyListeners();
      debugPrint('[NexaTalkie] ✅ Loaded ${channels.length} channels');
    } catch (e) {
      isLoading = false;
      notifyListeners();
      debugPrint('[NexaTalkie] ❌ Load error: $e');
    }
  }

  Future<void> loadInvitations() async {
    try {
      final data = await _client.rpc('nexa_get_ptt_invitations', params: {
        'p_user_id': userId,
      });

      final list = data as List<dynamic>? ?? [];
      pendingInvitations = list
          .map((json) => PttInvitation.fromJson(json as Map<String, dynamic>))
          .toList();
      notifyListeners();
      debugPrint('[NexaTalkie] 🔔 ${pendingInvitations.length} pending invitations');
    } catch (e) {
      debugPrint('[NexaTalkie] ❌ Load invitations error: $e');
    }
  }

  // ═══════════════════════════════════
  // Channel Management
  // ═══════════════════════════════════

  Future<String?> createChannel(String name, String type) async {
    try {
      final channelId = await _client.rpc('nexa_create_ptt_channel', params: {
        'p_name': name,
        'p_type': type,
        'p_created_by': userId,
      });
      await loadChannels();
      return channelId as String?;
    } catch (e) {
      debugPrint('[NexaTalkie] ❌ Create channel error: $e');
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
      debugPrint('[NexaTalkie] 📤 Invitation sent');
    } catch (e) {
      debugPrint('[NexaTalkie] ❌ Send invite error: $e');
    }
  }

  Future<void> respondToInvitation(String invitationId, bool accept,
      {String availability = 'always',
      String? scheduleStart,
      String? scheduleEnd,
      List<String>? scheduleDays}) async {
    try {
      await _client.rpc('nexa_respond_ptt_invitation', params: {
        'p_invitation_id': invitationId,
        'p_user_id': userId,
        'p_accept': accept,
        'p_availability': availability,
        'p_schedule_start': scheduleStart,
        'p_schedule_end': scheduleEnd,
        'p_schedule_days': scheduleDays,
      });

      if (accept) {
        await loadChannels();
      }
      await loadInvitations();
      debugPrint('[NexaTalkie] ${accept ? "✅ Accepted" : "❌ Rejected"} invitation');
    } catch (e) {
      debugPrint('[NexaTalkie] ❌ Respond error: $e');
    }
  }

  // ═══════════════════════════════════
  // Real-time PTT — Conference Bridge
  // ═══════════════════════════════════

  /// Join a PTT channel (connect to conference, start listening)
  Future<void> joinChannel(PttChannel channel) async {
    if (state != PttState.disconnected) {
      await leaveChannel();
    }

    _activeChannelId = channel.id;
    _activeConferenceRoom = channel.conferenceRoom;
    state = PttState.connecting;
    notifyListeners();

    try {
      // SIP INVITE to conference room (join muted)
      final target = 'sip:ptt_${channel.conferenceRoom}@${Env.pbxDomain}';
      await _sipHelper.call(target, voiceOnly: true);

      // Subscribe to realtime signaling
      _subscribeToChannel(channel.id);

      // Update online status
      await _client
          .from('nexa_ptt_members')
          .update({'is_online': true, 'last_active_at': DateTime.now().toUtc().toIso8601String()})
          .eq('channel_id', channel.id)
          .eq('user_id', userId);

      state = PttState.listening;
      notifyListeners();
      debugPrint('[NexaTalkie] 📡 Joined channel: ${channel.name}');
    } catch (e) {
      state = PttState.disconnected;
      notifyListeners();
      debugPrint('[NexaTalkie] ❌ Join error: $e');
    }
  }

  /// Leave current PTT channel
  Future<void> leaveChannel() async {
    if (_conferenceCall != null) {
      try {
        _conferenceCall!.hangup();
      } catch (_) {}
    }

    if (_activeChannelId != null) {
      // Update offline status
      try {
        await _client
            .from('nexa_ptt_members')
            .update({'is_online': false, 'is_talking': false})
            .eq('channel_id', _activeChannelId!)
            .eq('user_id', userId);
      } catch (_) {}

      // Broadcast leave
      _realtimeChannel?.sendBroadcastMessage(
        event: 'ptt_status',
        payload: {'user_id': userId, 'action': 'leave'},
      );
    }

    _realtimeChannel?.unsubscribe();
    _realtimeChannel = null;
    _conferenceCall = null;
    _activeChannelId = null;
    _activeConferenceRoom = null;
    _talkTimer?.cancel();
    talkDurationSeconds = 0;
    currentTalkerName = null;
    state = PttState.disconnected;
    notifyListeners();
    debugPrint('[NexaTalkie] 📴 Left channel');
  }

  /// Start talking (unmute in conference)
  void startTalking() {
    if (state != PttState.listening || _conferenceCall == null) return;

    // Unmute microphone
    _conferenceCall!.unmute();
    state = PttState.talking;
    talkDurationSeconds = 0;

    // Start timer
    _talkTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      talkDurationSeconds++;
      notifyListeners();
    });

    // Update DB
    _client
        .from('nexa_ptt_members')
        .update({'is_talking': true})
        .eq('channel_id', _activeChannelId!)
        .eq('user_id', userId)
        .then((_) {});

    // Broadcast talking
    _realtimeChannel?.sendBroadcastMessage(
      event: 'ptt_talking',
      payload: {
        'user_id': userId,
        'user_name': 'User',
        'is_talking': true,
      },
    );

    notifyListeners();
    debugPrint('[NexaTalkie] 🎤 Talking...');
  }

  /// Stop talking (mute in conference)
  void stopTalking() {
    if (state != PttState.talking || _conferenceCall == null) return;

    // Mute microphone
    _conferenceCall!.mute();
    _talkTimer?.cancel();
    state = PttState.listening;

    // Update DB
    _client
        .from('nexa_ptt_members')
        .update({'is_talking': false})
        .eq('channel_id', _activeChannelId!)
        .eq('user_id', userId)
        .then((_) {});

    // Broadcast stop
    _realtimeChannel?.sendBroadcastMessage(
      event: 'ptt_talking',
      payload: {
        'user_id': userId,
        'is_talking': false,
        'duration_seconds': talkDurationSeconds,
      },
    );

    // Log activity
    _client.from('nexa_ptt_activity').insert({
      'channel_id': _activeChannelId,
      'user_id': userId,
      'action': 'talk_end',
      'duration_ms': talkDurationSeconds * 1000,
    }).then((_) {});

    talkDurationSeconds = 0;
    notifyListeners();
    debugPrint('[NexaTalkie] 🔇 Stopped talking');
  }

  // ═══════════════════════════════════
  // Realtime Signaling
  // ═══════════════════════════════════

  void _subscribeToChannel(String channelId) {
    _realtimeChannel = _client
        .channel('nexatalkie_$channelId')
        .onBroadcast(
          event: 'ptt_talking',
          callback: (payload) {
            final isTalking = payload['is_talking'] as bool? ?? false;
            if (isTalking) {
              currentTalkerName = payload['user_name'] as String?;
              state = PttState.receiving;
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
          event: 'ptt_status',
          callback: (payload) {
            // Refresh channel data when members join/leave
            loadChannels();
          },
        )
        .subscribe();
  }

  // ═══════════════════════════════════
  // Helpers
  // ═══════════════════════════════════

  String? get activeChannelId => _activeChannelId;

  bool get isConnected => state != PttState.disconnected;

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
  final String? availability;
  final String? role;
  final List<dynamic>? talkingMembers;

  PttChannel({
    required this.id,
    required this.name,
    required this.type,
    required this.conferenceRoom,
    this.avatarUrl,
    this.memberCount = 0,
    this.onlineCount = 0,
    this.availability,
    this.role,
    this.talkingMembers,
  });

  factory PttChannel.fromJson(Map<String, dynamic> json) {
    return PttChannel(
      id: json['id'],
      name: json['name'],
      type: json['type'],
      conferenceRoom: json['conference_room'],
      avatarUrl: json['avatar_url'],
      memberCount: json['member_count'] ?? 0,
      onlineCount: json['online_count'] ?? 0,
      availability: json['availability'],
      role: json['role'],
      talkingMembers: json['talking_members'],
    );
  }

  bool get hasTalker =>
      talkingMembers != null && talkingMembers!.isNotEmpty;

  String get typeIcon => type == 'buddy' ? '🤝' : '👥';
}

class PttInvitation {
  final String id;
  final String type;
  final String? fromUserName;
  final String? channelName;
  final String? message;
  final int memberCount;
  final DateTime createdAt;

  PttInvitation({
    required this.id,
    required this.type,
    this.fromUserName,
    this.channelName,
    this.message,
    this.memberCount = 0,
    required this.createdAt,
  });

  factory PttInvitation.fromJson(Map<String, dynamic> json) {
    return PttInvitation(
      id: json['id'],
      type: json['type'],
      fromUserName: json['from_user_name'],
      channelName: json['channel_name'],
      message: json['message'],
      memberCount: json['member_count'] ?? 0,
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  String get typeIcon => type == 'buddy' ? '🤝' : '👥';
  String get displayName => channelName ?? fromUserName ?? 'Unknown';
}
