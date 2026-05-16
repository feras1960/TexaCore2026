import 'dart:async';
import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:easy_localization/easy_localization.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:js' as js;
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// ignore: depend_on_referenced_packages
import 'package:flutter_riverpod/legacy.dart';
import '../../../core/services/ptt_service.dart';
import '../../../core/providers/supabase_provider.dart';
import '../../../core/widgets/nexa_creation_wizard.dart';
import '../../shared/screens/wizard_step_members.dart';
import '../../../core/models/contact.dart';
import '../../../core/config/env.dart';
import '../../calls/providers/sip_provider.dart';
import '../widgets/ptt_button.dart';
import 'ptt_invitations_screen.dart';
import '../../../widgets/shared/floating_filter_bar.dart';
import '../providers/talkie_status_provider.dart';

/// Provider for NexaTalkie service
final nexaTalkieProvider = ChangeNotifierProvider<NexaTalkieService>((ref) {
  final client = ref.read(supabaseClientProvider);
  final userId = client.auth.currentUser?.id ?? Env.defaultUserId;
  final service = NexaTalkieService(client, null!, userId);
  service.loadChannels();
  service.loadInvitations();
  return service;
});

/// NexaTalkie Screen — dedicated tab for Push-to-Talk
class NexaTalkieScreen extends ConsumerStatefulWidget {
  const NexaTalkieScreen({super.key});

  @override
  ConsumerState<NexaTalkieScreen> createState() => _NexaTalkieScreenState();
}

class _NexaTalkieScreenState extends ConsumerState<NexaTalkieScreen>
    with SingleTickerProviderStateMixin, AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    // Join the default channel's ConfBridge silently on load so it's ready for instant PTT
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _joinConference(_selectedChannelIndex);
    });
  }
  // ─── State ───
  int _selectedChannelIndex = 0;
  bool _isTalking = false;
  int _talkSeconds = 0;
  Timer? _talkTimer;
  String? _currentTalker;
  bool _isConferenceConnected = false;
  String? _conferenceRoomId;
  bool _pttLocked = false; // locked when someone else is talking

  // ─── Supabase Realtime ───
  RealtimeChannel? _realtimeChannel;

  // ─── PTT History per channel (cloud synced) ───
  final Map<int, List<_PttHistoryItem>> _channelHistory = {};
  bool _isLoadingHistory = false;

  List<_PttHistoryItem> get _currentHistory {
    if (_selectedChannelIndex == -1) {
      final all = _channelHistory.values.expand((e) => e).toList();
      all.sort((a, b) => b.time.compareTo(a.time));
      return all;
    }
    return _channelHistory[_selectedChannelIndex] ?? [];
  }

  final List<Map<String, dynamic>> _mockChannels = [
    {
      'name': 'فريق المستودع',
      'type': 'group',
      'member_count': 8,
      'online_count': 3,
      'conference_room': 'warehouse',
      'has_talker': false,
      'talker_name': null,
    },
    {
      'name': 'فريق المبيعات',
      'type': 'group',
      'member_count': 5,
      'online_count': 2,
      'conference_room': 'sales',
      'has_talker': false,
      'talker_name': null,
    },
  ];

  // ─── Audio Recording (Web) — for history/review ───
  html.MediaRecorder? _mediaRecorder;
  List<html.Blob> _audioChunks = [];
  html.MediaStream? _micStream;

  // ─── Join ConfBridge on channel select ───
  void _joinConference(int channelIndex) {
    final room = channelIndex == -1 
        ? '9999' // Global broadcast
        : _mockChannels[channelIndex]['conference_room'] as String;
        
    if (_conferenceRoomId == room && _isConferenceConnected) return;

    // Leave previous conference if different
    if (_isConferenceConnected && _conferenceRoomId != room) {
      _leaveConference();
    }

    final sipService = ref.read(sipServiceProvider);
    if (!sipService.isRegistered) {
      debugPrint('[NexaTalkie] ⚠️ SIP not registered, cannot join conference');
      return;
    }

    // Dial ptt_{room} → Asterisk routes to ConfBridge
    _conferenceRoomId = room;
    sipService.makePttCall(room);
    _isConferenceConnected = true;
    debugPrint('[NexaTalkie] 📡 Joining ConfBridge: ptt_$room');

    // Subscribe to Realtime for talking status
    _subscribeToRealtime(room);
    // Load cloud history for this channel
    _loadCloudHistory(channelIndex);
    setState(() {});
  }

  void _leaveConference() {
    if (!_isConferenceConnected) return;
    final sipService = ref.read(sipServiceProvider);
    sipService.hangupPtt();
    _isConferenceConnected = false;
    _conferenceRoomId = null;
    _realtimeChannel?.unsubscribe();
    _realtimeChannel = null;
    debugPrint('[NexaTalkie] 📴 Left ConfBridge');
  }

  // ─── Supabase Realtime: who is talking ───
  void _subscribeToRealtime(String room) {
    _realtimeChannel?.unsubscribe();
    final client = ref.read(supabaseClientProvider);
    _realtimeChannel = client
        .channel('nexatalkie_$room')
        .onBroadcast(
          event: 'ptt_talking',
          callback: (payload) {
            final isTalking = payload['is_talking'] as bool? ?? false;
            final talkerName = payload['user_name'] as String?;
            final talkerId = payload['user_id'] as String?;
            final currentUserId = client.auth.currentUser?.id ?? Env.defaultUserId;
            // Ignore own broadcasts
            if (talkerId == currentUserId) return;
            setState(() {
              if (isTalking) {
                _currentTalker = talkerName ?? 'متحدث';
                _pttLocked = true; // Lock PTT for others
              } else {
                _currentTalker = null;
                _pttLocked = false;
              }
            });
          },
        )
        .onBroadcast(
          event: 'ptt_new_message',
          callback: (payload) {
            // New voice message from another user — refresh history
            _loadCloudHistory(_selectedChannelIndex);
          },
        )
        .onBroadcast(
          event: 'call_alert',
          callback: (payload) {
            final toUserId = payload['to_user_id'] as String?;
            final currentUserId = client.auth.currentUser?.id ?? Env.defaultUserId;
            if (toUserId != null && toUserId != currentUserId) return;
            // Someone is pinging us!
            final fromName = payload['from_name'] as String? ?? 'مستخدم';
            _playSound('chirp');
            _playSound('chirp'); // Double chirp for alert
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('📻 $fromName يطلبك على القناة!'),
                  backgroundColor: const Color(0xFF3B82F6),
                  duration: const Duration(seconds: 5),
                  action: SnackBarAction(
                    label: 'رد',
                    textColor: Colors.white,
                    onPressed: () {},
                  ),
                ),
              );
            }
          },
        )
        .subscribe();
    debugPrint('[NexaTalkie] 📡 Realtime subscribed: nexatalkie_$room');
  }

  // ─── Load cloud-synced voice history ───
  Future<void> _loadCloudHistory(int channelIndex) async {
    if (channelIndex == -1) return;
    _isLoadingHistory = true;
    try {
      final client = ref.read(supabaseClientProvider);
      final room = _mockChannels[channelIndex]['conference_room'] as String;
      // Query nexa_ptt_messages for this channel's conference_room
      final channelData = await client
          .from('nexa_ptt_channels')
          .select('id')
          .eq('conference_room', room)
          .maybeSingle();
      if (channelData == null) {
        _isLoadingHistory = false;
        return;
      }
      final channelId = channelData['id'] as String;
      final messages = await client
          .from('nexa_ptt_messages')
          .select()
          .eq('channel_id', channelId)
          .gt('expires_at', DateTime.now().toUtc().toIso8601String())
          .order('created_at', ascending: false)
          .limit(50);
      final currentUserId = client.auth.currentUser?.id ?? Env.defaultUserId;
      final items = (messages as List).map((m) {
        final listenedBy = (m['listened_by'] as List?)?.cast<String>() ?? [];
        return _PttHistoryItem(
          sender: m['sender_name'] ?? m['sender_ext'] ?? 'مجهول',
          duration: _formatDuration(m['duration_seconds'] ?? 0),
          time: DateTime.parse(m['created_at']),
          listenedBy: listenedBy,
          totalMembers: _mockChannels[channelIndex]['member_count'],
          isMine: m['sender_id'] == currentUserId,
          audioUrl: m['audio_url'],
        );
      }).toList();
      setState(() {
        _channelHistory[channelIndex] = items;
      });
      debugPrint('[NexaTalkie] ☁️ Loaded ${items.length} cloud messages');
    } catch (e) {
      debugPrint('[NexaTalkie] ❌ Load cloud history error: $e');
    }
    _isLoadingHistory = false;
  }

  // ─── PTT Actions (Hybrid: SIP live + local recording + cloud sync) ───
  void _startTalking() async {
    if (_pttLocked) {
      debugPrint('[NexaTalkie] 🔒 PTT locked — someone else is talking');
      return;
    }
    setState(() {
      _isTalking = true;
      _talkSeconds = 0;
    });
    _talkTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _talkSeconds++);
    });

    // 1. Unmute SIP conference (live audio to all)
    final sipService = ref.read(sipServiceProvider);
    if (sipService.hasPttCall) {
      sipService.pttUnmute();
    } else {
      _isConferenceConnected = false;
      _joinConference(_selectedChannelIndex);
    }

    // 2. Broadcast "I'm talking" to all via Realtime
    _realtimeChannel?.sendBroadcastMessage(
      event: 'ptt_talking',
      payload: {
        'user_id': ref.read(supabaseClientProvider).auth.currentUser?.id ?? Env.defaultUserId,
        'user_name': sipService.sipExtension ?? 'User',
        'is_talking': true,
      },
    );

    // 3. Play chirp sound effect
    _playSound('chirp');

    // 4. Start local recording (for cloud upload)
    try {
      final mediaDevices = html.window.navigator.mediaDevices;
      if (mediaDevices == null) {
        debugPrint('[NexaTalkie] ⚠️ mediaDevices null');
        return;
      }
      _micStream = await mediaDevices.getUserMedia({'audio': true});
      _audioChunks = [];
      _mediaRecorder = html.MediaRecorder(_micStream!);
      _mediaRecorder!.addEventListener('dataavailable', (event) {
        final blob = js.JsObject.fromBrowserObject(event)['data'];
        _audioChunks.add(blob as html.Blob);
      });
      _mediaRecorder!.start();
      debugPrint('[NexaTalkie] 🎤 Recording started');
    } catch (e) {
      debugPrint('[NexaTalkie] ❌ Mic error: $e');
    }
  }

  void _stopTalking() {
    _talkTimer?.cancel();
    final duration = _formatDuration(_talkSeconds);
    final durationSecs = _talkSeconds;
    final channelIdx = _selectedChannelIndex;
    final hadAudio = _talkSeconds > 0;

    // 1. Mute SIP conference (stop live broadcast)
    final sipService = ref.read(sipServiceProvider);
    if (sipService.hasPttCall) {
      sipService.pttMute();
    }

    // 2. Broadcast "I stopped talking"
    _realtimeChannel?.sendBroadcastMessage(
      event: 'ptt_talking',
      payload: {
        'user_id': ref.read(supabaseClientProvider).auth.currentUser?.id ?? Env.defaultUserId,
        'is_talking': false,
        'duration_seconds': durationSecs,
      },
    );

    // 3. Play roger sound
    _playSound('roger');

    // 4. Stop recording + upload to Supabase Storage
    if (_mediaRecorder != null) {
      _mediaRecorder!.addEventListener('stop', (_) {
        final audioBlob = html.Blob(_audioChunks, 'audio/webm');
        final audioUrl = html.Url.createObjectUrlFromBlob(audioBlob);

        if (hadAudio || _audioChunks.isNotEmpty) {
          // Add to local history immediately
          setState(() {
            _channelHistory.putIfAbsent(channelIdx, () => []);
            _channelHistory[channelIdx]!.insert(
              0,
              _PttHistoryItem(
                sender: 'talkie.you'.tr(),
                duration: duration,
                time: DateTime.now(),
                listenedBy: [],
                totalMembers: _mockChannels[channelIdx]['member_count'],
                isMine: true,
                audioUrl: audioUrl,
              ),
            );
          });

          // Upload to Supabase Storage in background
          _uploadRecording(audioBlob, durationSecs, channelIdx);
        }

        _releaseMicTracks();
      });
      _mediaRecorder!.stop();
    } else {
      _releaseMicTracks();
    }

    setState(() {
      _isTalking = false;
      _talkSeconds = 0;
    });
  }

  /// Upload recording to Supabase Storage + insert message record
  Future<void> _uploadRecording(html.Blob audioBlob, int durationSecs, int channelIdx) async {
    try {
      final client = ref.read(supabaseClientProvider);
      final userId = client.auth.currentUser?.id ?? Env.defaultUserId;
      final sipService = ref.read(sipServiceProvider);
      final ext = sipService.sipExtension ?? 'unknown';
      final room = _mockChannels[channelIdx]['conference_room'] as String;
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final filePath = '$userId/$room-$timestamp.webm';

      // Convert Blob to Uint8List
      final reader = html.FileReader();
      reader.readAsArrayBuffer(audioBlob);
      await reader.onLoadEnd.first;
      final bytes = Uint8List.fromList(reader.result as List<int>);

      // Upload to Supabase Storage
      await client.storage.from('ptt-recordings').uploadBinary(
        filePath,
        bytes,
        fileOptions: const FileOptions(contentType: 'audio/webm'),
      );
      final publicUrl = client.storage.from('ptt-recordings').getPublicUrl(filePath);
      debugPrint('[NexaTalkie] ☁️ Uploaded: $publicUrl');

      // Get channel_id from room name
      final channelData = await client
          .from('nexa_ptt_channels')
          .select('id')
          .eq('conference_room', room)
          .maybeSingle();
      if (channelData == null) {
        debugPrint('[NexaTalkie] ⚠️ Channel not found in DB for room: $room');
        return;
      }

      // Insert message record
      await client.from('nexa_ptt_messages').insert({
        'channel_id': channelData['id'],
        'sender_id': userId,
        'sender_name': ext,
        'sender_ext': ext,
        'audio_url': publicUrl,
        'duration_seconds': durationSecs,
        'file_size_bytes': bytes.length,
      });
      debugPrint('[NexaTalkie] ✅ Message record saved');

      // Notify others via Realtime
      _realtimeChannel?.sendBroadcastMessage(
        event: 'ptt_new_message',
        payload: {'sender': ext, 'duration': durationSecs},
      );
    } catch (e) {
      debugPrint('[NexaTalkie] ❌ Upload error: $e');
    }
  }

  /// Play PTT sound effect
  void _playSound(String name) {
    try {
      // Use Web Audio API for instant playback
      final audio = html.AudioElement()
        ..src = 'assets/assets/sounds/ptt_$name.mp3'
        ..volume = 0.3;
      audio.play();
    } catch (e) {
      debugPrint('[NexaTalkie] ⚠️ Sound error: $e');
    }
  }

  /// Properly release all microphone tracks
  void _releaseMicTracks() {
    try {
      if (_micStream != null) {
        for (final track in _micStream!.getTracks()) {
          track.stop();
        }
        _micStream = null;
        debugPrint('[NexaTalkie] 🎤✅ Mic tracks released');
      }
    } catch (e) {
      debugPrint('[NexaTalkie] ⚠️ Error releasing mic: $e');
    }
    _mediaRecorder = null;
    _audioChunks = [];
  }

  String _formatDuration(int s) =>
      '${(s ~/ 60).toString().padLeft(1, '0')}:${(s % 60).toString().padLeft(2, '0')}';

  @override
  void dispose() {
    _talkTimer?.cancel();
    _releaseMicTracks();
    _leaveConference();
    _realtimeChannel?.unsubscribe();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // Required by AutomaticKeepAliveClientMixin
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor:
          isDark ? const Color(0xFF111111) : const Color(0xFFF5F5F7),
      body: Column(
        children: [
          _buildHeader(theme, isDark),
          Expanded(child: _buildBody(theme, isDark)),
        ],
      ),
    );
  }

  // ═══════════════════════════════════
  // Header
  // ═══════════════════════════════════
  Widget _buildHeader(ThemeData theme, bool isDark) {
    return Container(
      padding: EdgeInsets.fromLTRB(
          20, MediaQuery.of(context).padding.top + 12, 20, 16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.15 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(CupertinoIcons.antenna_radiowaves_left_right,
                color: theme.colorScheme.primary, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('NexaTalkie',
                    style: TextStyle(
                        color: theme.colorScheme.onSurface,
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5)),
                Text('Push-to-Talk',
                    style: TextStyle(
                        color: theme.colorScheme.onSurface.withOpacity(0.5),
                        fontSize: 13,
                        fontWeight: FontWeight.w500)),
              ],
            ),
          ),
          _buildInviteBadge(theme),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => _showCreateChannel(theme, isDark),
            child: Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(CupertinoIcons.plus,
                  color: theme.colorScheme.primary, size: 20),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInviteBadge(ThemeData theme) {
    return GestureDetector(
      onTap: () => Navigator.push(context,
          CupertinoPageRoute(builder: (_) => const PttInvitationsScreen())),
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: theme.colorScheme.primary.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(CupertinoIcons.bell, color: theme.colorScheme.primary, size: 20),
            Positioned(
              right: 4,
              top: 4,
              child: Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                    shape: BoxShape.circle, color: Color(0xFFFF3B30)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════
  // Body
  // ═══════════════════════════════════
  Widget _buildBody(ThemeData theme, bool isDark) {
    final talkieStatusNotifier = ref.watch(talkieStatusProvider);
    final talkieStatus = talkieStatusNotifier.status;
    final statusFilters = ['talkie.status_available'.tr(), 'talkie.status_auto'.tr(), 'talkie.status_silent'.tr()];
    String selectedStatusLabel = statusFilters[1];
    switch (talkieStatus) {
      case TalkieStatus.available: selectedStatusLabel = statusFilters[0]; break;
      case TalkieStatus.auto: selectedStatusLabel = statusFilters[1]; break;
      case TalkieStatus.silent: selectedStatusLabel = statusFilters[2]; break;
    }

    final filters = ['All', ..._mockChannels.map((c) => c['name'].toString())];
    final selectedFilter = _selectedChannelIndex == -1 ? 'All' : _mockChannels[_selectedChannelIndex]['name'].toString();
    final icons = [CupertinoIcons.globe, ..._mockChannels.map((c) => c['type'] == 'group' ? CupertinoIcons.person_3_fill : CupertinoIcons.person_2_fill)];
    final colors = [const Color(0xFF007AFF), ..._mockChannels.map((c) => const Color(0xFF34C759))];
    final isMobile = MediaQuery.sizeOf(context).width < 600;

    Widget buildChannelFilter() {
      return FloatingFilterBar(
        filters: filters,
        selected: selectedFilter,
        icons: icons,
        colors: colors,
        onSelected: (f) {
          if (f == 'All') {
            setState(() => _selectedChannelIndex = -1);
          } else {
            final idx = _mockChannels.indexWhere((c) => c['name'] == f);
            setState(() => _selectedChannelIndex = idx);
            _joinConference(idx);
          }
        },
      );
    }

    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTapDown: (_) {
        ref.read(sipServiceProvider).ensurePttAudioPlaying();
      },
      onPanDown: (_) {
        ref.read(sipServiceProvider).ensurePttAudioPlaying();
      },
      child: Stack(
        children: [
          Offstage(
            offstage: true,
            child: SizedBox(
              width: 1,
              height: 1,
              child: RTCVideoView(ref.read(sipServiceProvider).remoteRenderer),
            ),
          ),
          Column(
            children: [
              // Status Filter Bar
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: FloatingFilterBar(
                filters: statusFilters,
                selected: selectedStatusLabel,
                icons: const [
                  CupertinoIcons.speaker_2_fill,
                  CupertinoIcons.settings,
                  CupertinoIcons.speaker_slash_fill
                ],
                colors: const [
                  Color(0xFF34C759),
                  Color(0xFF007AFF),
                  Color(0xFFFF3B30)
                ],
                onSelected: (f) {
                  final notifier = ref.read(talkieStatusProvider.notifier);
                  final sipService = ref.read(sipServiceProvider);
                  if (f == statusFilters[0]) {
                    notifier.setStatus(TalkieStatus.available);
                    sipService.setTalkieSilent(false);
                  } else if (f == statusFilters[1]) {
                    notifier.setStatus(TalkieStatus.auto);
                    sipService.setTalkieSilent(false);
                  } else if (f == statusFilters[2]) {
                    notifier.setStatus(TalkieStatus.silent);
                    sipService.setTalkieSilent(true);
                  }
                },
              ),
            ),

            // Channel Filter Bar (Desktop/Tablet)
            if (!isMobile)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: buildChannelFilter(),
              ),

            // History title
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
              child: Row(
                children: [
                  Icon(CupertinoIcons.clock,
                      size: 14, color: theme.colorScheme.onSurface.withOpacity(0.4)),
                  const SizedBox(width: 6),
                  Text('talkie.last_24h'.tr(),
                      style: TextStyle(
                          color: theme.colorScheme.onSurface.withOpacity(0.4),
                          fontSize: 12,
                          fontWeight: FontWeight.w600)),
                  const Spacer(),
                  Text('${_currentHistory.length} ${"talkie.members".tr()}',
                      style: TextStyle(
                          color: theme.colorScheme.onSurface.withOpacity(0.3),
                          fontSize: 11)),
                ],
              ),
            ),

            // History list
            Expanded(
              child: _currentHistory.isEmpty
                  ? Center(
                      child: Text('talkie.no_messages'.tr(),
                          style: TextStyle(
                              color: theme.colorScheme.onSurface.withOpacity(0.3),
                              fontSize: 14)),
                    )
                  : ListView.builder(
                      padding: EdgeInsets.fromLTRB(
                          16, 4, 16, isMobile ? 320 : 130),
                      itemCount: _currentHistory.length,
                      itemBuilder: (ctx, i) =>
                          _buildHistoryItem(_currentHistory[i], theme, isDark),
                    ),
            ),
          ],
        ),

        // PTT area floating above filter bar
        Positioned(
          left: 16,
          right: 16,
          bottom: isMobile ? 156 : 24,
          child: _buildPttArea(theme, isDark),
        ),

        // Floating Channel Filter Bar (Mobile)
        if (isMobile)
          Positioned(
            left: 16,
            right: 16,
            bottom: 96,
            child: buildChannelFilter(),
          ),
      ],
    ),
    );
  }

  // ═══════════════════════════════════
  // Channel Chips (Removed, kept dummy to prevent errors)
  // ═══════════════════════════════════
  Widget _buildChannelChip(int index, ThemeData theme, bool isDark) {
    return const SizedBox.shrink();
  }

  // ═══════════════════════════════════
  // History Item (who heard it)
  // ═══════════════════════════════════
  int? _playingIndex;
  html.AudioElement? _audioPlayer;

  Widget _buildHistoryItem(_PttHistoryItem item, ThemeData theme, bool isDark) {
    final itemIndex = _currentHistory.indexOf(item);
    final isPlaying = _playingIndex == itemIndex;
    final listenRatio = item.totalMembers > 0
        ? '${item.listenedBy.length}/${item.totalMembers}'
        : '';
    final allHeard = item.listenedBy.length >= item.totalMembers - 1;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: item.isMine
            ? (isDark ? const Color(0xFF1B3A2D) : const Color(0xFFE8F5E9))
            : (isDark ? const Color(0xFF1E1E1E) : Colors.white),
        borderRadius: BorderRadius.circular(14),
        border: isPlaying
            ? Border.all(color: theme.colorScheme.primary.withOpacity(0.4), width: 1)
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.1 : 0.02),
            blurRadius: 6,
          ),
        ],
      ),
      child: Row(
        children: [
          // Play/Stop button
          GestureDetector(
            onTap: () {
              setState(() {
                if (isPlaying) {
                  _audioPlayer?.pause();
                  _playingIndex = null;
                } else {
                  // Stop previous
                  _audioPlayer?.pause();
                  _playingIndex = itemIndex;

                  if (item.audioUrl != null) {
                    _audioPlayer = html.AudioElement(item.audioUrl!);
                    _audioPlayer!.play();
                    _audioPlayer!.onEnded.listen((_) {
                      if (mounted) setState(() => _playingIndex = null);
                    });
                  } else {
                    // Mock: auto-stop after duration
                    final parts = item.duration.split(':');
                    final secs = int.parse(parts[0]) * 60 + int.parse(parts[1]);
                    Future.delayed(Duration(seconds: secs), () {
                      if (mounted && _playingIndex == itemIndex) {
                        setState(() => _playingIndex = null);
                      }
                    });
                  }
                }
              });
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 36, height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isPlaying
                    ? theme.colorScheme.primary
                    : theme.colorScheme.primary.withOpacity(0.1),
              ),
              child: Icon(
                isPlaying ? CupertinoIcons.stop_fill : CupertinoIcons.play_fill,
                color: isPlaying ? Colors.white : theme.colorScheme.primary,
                size: 16,
              ),
            ),
          ),
          const SizedBox(width: 10),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(item.sender,
                        style: TextStyle(
                            color: theme.colorScheme.onSurface,
                            fontSize: 14,
                            fontWeight: FontWeight.w700)),
                    const SizedBox(width: 6),
                    Text(item.duration,
                        style: TextStyle(
                            color: theme.colorScheme.onSurface.withOpacity(0.4),
                            fontSize: 12,
                            fontFeatures: const [FontFeature.tabularFigures()])),
                  ],
                ),
                const SizedBox(height: 3),
                // Read receipts
                Row(
                  children: [
                    Icon(
                      allHeard ? Icons.done_all : Icons.done,
                      size: 14,
                      color: allHeard
                          ? const Color(0xFF34C759)
                          : theme.colorScheme.onSurface.withOpacity(0.3),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      item.listenedBy.isEmpty
                          ? 'talkie.no_listeners'.tr()
                          : '${'talkie.listened_by'.tr().replaceFirst('{}', item.listenedBy.join(", "))}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: theme.colorScheme.onSurface.withOpacity(0.35),
                        fontSize: 11,
                      ),
                    ),
                    const Spacer(),
                    Text(listenRatio,
                        style: TextStyle(
                            color: allHeard
                                ? const Color(0xFF34C759)
                                : theme.colorScheme.onSurface.withOpacity(0.3),
                            fontSize: 10,
                            fontWeight: FontWeight.w700)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Time
          Text(_timeAgo(item.time),
              style: TextStyle(
                  color: theme.colorScheme.onSurface.withOpacity(0.3),
                  fontSize: 10)),
        ],
      ),
    );
  }

  // ═══════════════════════════════════
  // PTT Area
  // ═══════════════════════════════════
  Widget _buildPttArea(ThemeData theme, bool isDark) {
    final ch = _selectedChannelIndex == -1 
        ? {'name': 'Global Broadcast', 'online_count': 12} 
        : _mockChannels[_selectedChannelIndex];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: theme.colorScheme.outline.withOpacity(isDark ? 0.15 : 0.1),
          width: 0.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.08),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          // Channel name
          Text(ch['name'],
              style: TextStyle(
                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                  fontSize: 14,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Text(
            _isTalking
                ? 'talkie.broadcasting'.tr()
                : _isConferenceConnected
                    ? '${'talkie.connected_room'.tr()} • ${ch['online_count']} ${'talkie.members'.tr()}'
                    : '${'talkie.connected'.tr()} • ${ch['online_count']} ${'talkie.members_active'.tr()}',
            style: TextStyle(
              color: _isTalking ? const Color(0xFFFF3B30) : const Color(0xFF34C759),
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 12),

          // PTT Button
          PttButton(
            isTalking: _isTalking,
            currentSpeaker: _currentTalker,
            recordingDuration: _talkSeconds,
            onStartTalking: _startTalking,
            onStopTalking: _stopTalking,
          ),
        ],
      ),
    );
  }

  String _timeAgo(DateTime t) {
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 1) return 'talkie.now'.tr();
    if (d.inMinutes < 60) return '${d.inMinutes} د';
    return '${d.inHours} س';
  }

  void _showCreateChannel(ThemeData theme, bool isDark) {
    NexaCreationWizard.show(
      context,
      title: 'talkie.new_channel'.tr(),
      actions: [
        WizardAction(
          title: 'talkie.group'.tr(),
          icon: CupertinoIcons.group_solid,
          iconColor: Colors.blue,
          onTap: () {
            Navigator.pop(context);
            WizardStepMembers.show(context, GroupWizardType.talkie);
          },
        ),
        WizardAction(
          title: 'talkie.direct'.tr(),
          icon: CupertinoIcons.person_2_fill,
          iconColor: Colors.green,
          onTap: () {
            Navigator.pop(context);
            // TODO: Open Direct Flow (or just select from list below)
          },
        ),
      ],
      onContactSelected: (contact) {
        Navigator.pop(context);
        // TODO: Handle direct talkie to this contact
        debugPrint('Selected contact for Talkie: ${contact.name}');
      },
    );
  }
}

// ─── History Model ───
class _PttHistoryItem {
  final String sender;
  final String duration;
  final DateTime time;
  final List<String> listenedBy;
  final int totalMembers;
  final bool isMine;
  final String? audioUrl;

  _PttHistoryItem({
    required this.sender,
    required this.duration,
    required this.time,
    required this.listenedBy,
    required this.totalMembers,
    this.isMine = false,
    this.audioUrl,
  });
}
