import 'dart:async';
import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:easy_localization/easy_localization.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:js' as js;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart';
// ignore: depend_on_referenced_packages
import 'package:flutter_riverpod/legacy.dart';
import '../../../core/services/livekit_ptt_service.dart';
import '../../../core/providers/supabase_provider.dart';
import '../../../core/providers/livekit_provider.dart';
import '../../../core/widgets/nexa_creation_wizard.dart';
import '../../shared/screens/wizard_step_members.dart';
import '../../../core/models/contact.dart';
import '../../../core/config/env.dart';
import '../widgets/ptt_button.dart';
import 'ptt_invitations_screen.dart';
import '../../../widgets/shared/floating_filter_bar.dart';
import '../providers/talkie_status_provider.dart';
import '../../calls/screens/livekit_call_screen.dart';
import '../../../core/services/local_video_recorder.dart';

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
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Load channels and join first one via LiveKit
      final pttService = ref.read(livekitPttProvider);
      pttService.loadChannels().then((_) {
        if (pttService.channels.isNotEmpty && mounted) {
          final channel = pttService.channels[0];
          _subscribeToRealtime(channel.conferenceRoom);
          _loadCloudHistory(0);
          pttService.joinChannel(channel);
        }
      });
    });
  }
  // ─── State ───
  int _selectedChannelIndex = 0;
  bool _isTalking = false;
  int _talkSeconds = 0;
  Timer? _talkTimer;
  String? _currentTalker;
  bool _pttLocked = false; // locked when someone else is talking
  bool _realtimeSubscribed = false; // track if realtime is actually connected
  bool _isVideoPtt = false; // Video PTT mode (swipe up)
  bool _isShowingFullScreenVideo = false; // Full-screen remote video overlay

  // ─── Emergency SOS ───
  bool _isSosActive = false;
  bool _isSosCountdown = false;
  int _sosCountdown = 3;
  Timer? _sosTimer;
  Timer? _locationTimer;
  bool _isShowingSosAlert = false;
  final _liveLocationNotifier = ValueNotifier<Map<String, String>>({'location': '', 'mapsLink': ''});
  final _localRecorder = LocalVideoRecorder();

  // ─── Lone Worker (العامل الوحيد) ───
  bool _isLoneWorkerEnabled = false;
  Timer? _loneWorkerTimer;
  Timer? _loneWorkerCheckTimer;
  bool _isLoneWorkerCheckActive = false;
  int _loneWorkerCountdown = 60; // 60 ثانية للاستجابة

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

  /// Get channels from LiveKit PTT provider
  List<PttChannel> get _channels => ref.read(livekitPttProvider).channels;

  // ─── Audio Recording (Web) — for history/review ───
  html.MediaRecorder? _mediaRecorder;
  List<html.Blob> _audioChunks = [];
  html.MediaStream? _micStream;

  // ─── Join LiveKit Room on channel select ───
  void _joinChannel(int channelIndex) {
    if (channelIndex < 0 || channelIndex >= _channels.length) return;
    
    final pttService = ref.read(livekitPttProvider);
    final channel = _channels[channelIndex];
    
    pttService.joinChannel(channel);
    debugPrint('[NexaTalkie] 📡 Joining LiveKit room: ptt_${channel.conferenceRoom}');
  }

  void _leaveChannel() {
    final pttService = ref.read(livekitPttProvider);
    pttService.leaveChannel();
    _realtimeChannel?.unsubscribe();
    _realtimeChannel = null;
    debugPrint('[NexaTalkie] 📴 Left LiveKit room');
  }

  // ─── Supabase Realtime: who is talking ───
  void _subscribeToRealtime(String room) {
    _realtimeChannel?.unsubscribe();
    _realtimeSubscribed = false;
    final client = ref.read(supabaseClientProvider);
    debugPrint('[NexaTalkie] 📡 Subscribing to Realtime: nexatalkie_$room');
    _realtimeChannel = client
        .channel('nexatalkie_$room')
        .onBroadcast(
          event: 'ptt_talking',
          callback: (payload) {
            debugPrint('[NexaTalkie] 📨 Received ptt_talking: $payload');
            final isTalking = payload['is_talking'] as bool? ?? false;
            final talkerName = payload['user_name'] as String?;
            final talkerExt = payload['user_ext'] as String?;
            // Filter by user_id to ignore own messages
            final myUserId = ref.read(supabaseClientProvider).auth.currentUser?.id ?? Env.defaultUserId;
            if (talkerExt != null && talkerExt == myUserId) return;
            setState(() {
              if (isTalking) {
                _currentTalker = talkerName ?? talkerExt ?? 'متحدث';
                _pttLocked = true; // Lock PTT for others
              } else {
                _currentTalker = null;
                _pttLocked = false;
                // إغلاق شاشة الفيديو تلقائياً عند توقف المتحدث
                if (_isShowingFullScreenVideo) {
                  _isShowingFullScreenVideo = false;
                  Navigator.of(context).pop();
                }
              }
            });
          },
        )
        .onBroadcast(
          event: 'ptt_new_message',
          callback: (payload) {
            debugPrint('[NexaTalkie] 📨 Received ptt_new_message');
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
        .onBroadcast(
          event: 'sos_alert',
          callback: (payload) {
            final type = payload['type'] as String? ?? '';
            if (type == 'emergency') {
              final name = payload['user_name'] as String? ?? 'مستخدم';
              final location = payload['location'] as String? ?? '';
              final mapsLink = payload['maps_link'] as String? ?? '';
              
              _liveLocationNotifier.value = {
                'location': location,
                'mapsLink': mapsLink,
              };

              if (mounted && !_isShowingSosAlert) {
                _isShowingSosAlert = true;
                
                // بدء التسجيل المحلي بعد ثانية لضمان بدء البث (الفيديو/الصوت) في المتصفح
                Future.delayed(const Duration(seconds: 1), () {
                  if (_isShowingSosAlert) _localRecorder.startRecording();
                });

                showDialog(
                  context: context,
                  barrierDismissible: false,
                  barrierColor: const Color(0xFFFF3B30).withOpacity(0.3),
                  builder: (_) => _EmergencyAlertDialog(
                    senderName: name,
                    locationNotifier: _liveLocationNotifier,
                    onDismiss: () {
                      _isShowingSosAlert = false;
                      _localRecorder.stopAndSave(name); // حفظ الملف محلياً
                      Navigator.of(context).pop();
                    },
                  ),
                ).then((_) {
                  _isShowingSosAlert = false;
                  _localRecorder.cancel();
                });
              }
            } else if (type == 'cancelled' && _isShowingSosAlert) {
              _isShowingSosAlert = false;
              _localRecorder.stopAndSave('SOS_Ended'); // حفظ الملف للمستقبل
              Navigator.of(context).pop();
            }
          },
        )
        .onBroadcast(
          event: 'sos_location',
          callback: (payload) {
            final lat = payload['lat'];
            final lng = payload['lng'];
            final mapsLink = payload['maps_link'] as String? ?? '';
            if (lat != null && lng != null) {
              _liveLocationNotifier.value = {
                'location': '$lat, $lng',
                'mapsLink': mapsLink,
              };
            }
          },
        )
        .subscribe((status, [error]) {
          debugPrint('[NexaTalkie] 📡 Realtime status: $status (error: $error)');
          if (status == RealtimeSubscribeStatus.subscribed) {
            _realtimeSubscribed = true;
            debugPrint('[NexaTalkie] ✅ Realtime CONNECTED: nexatalkie_$room');
          }
        });
  }

  // ─── Load cloud-synced voice history ───
  Future<void> _loadCloudHistory(int channelIndex) async {
    if (channelIndex == -1) return;
    _isLoadingHistory = true;
    try {
      final client = ref.read(supabaseClientProvider);
      if (channelIndex < 0 || channelIndex >= _channels.length) return;
      final room = _channels[channelIndex].conferenceRoom;
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
      final memberCount = channelIndex < _channels.length ? _channels[channelIndex].memberCount : 0;
      final items = (messages as List).map((m) {
        final listenedBy = (m['listened_by'] as List?)?.cast<String>() ?? [];
        return _PttHistoryItem(
          sender: m['sender_name'] ?? m['sender_ext'] ?? 'مجهول',
          duration: _formatDuration(m['duration_seconds'] ?? 0),
          time: DateTime.parse(m['created_at']),
          listenedBy: listenedBy,
          totalMembers: memberCount,
          isMine: m['sender_id'] == currentUserId,
          audioUrl: m['audio_url'],
          messageType: m['message_type'] ?? 'audio',
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

  bool _isBusy = false; // guard against rapid press/release

  // ─── PTT Actions (Hybrid: LiveKit live + local recording + cloud sync) ───
  void _startTalking() async {
    if (_isBusy) return;
    // Check lock from PTT service (someone else is talking)
    final pttService = ref.read(livekitPttProvider);
    if (pttService.isLocked || _pttLocked) {
      debugPrint('[NexaTalkie] 🔒 PTT locked — someone else is talking');
      return;
    }
    _isBusy = true;
    setState(() {
      _isTalking = true;
      _talkSeconds = 0;
    });
    _talkTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _talkSeconds++);
    });

    // 1. Enable mic in LiveKit room (live audio to all)
    await pttService.startTalking();

    // 2. Broadcast lock signal on screen's Realtime channel too
    final userId = ref.read(supabaseClientProvider).auth.currentUser?.id ?? '';
    _realtimeChannel?.sendBroadcastMessage(
      event: 'ptt_talking',
      payload: {
        'user_id': userId,
        'user_name': 'User',
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
        _isBusy = false;
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
    _isBusy = false;
  }

  void _stopTalking() async {
    if (_isBusy) {
      // If startTalking is still running, wait a bit then retry
      await Future.delayed(const Duration(milliseconds: 200));
    }
    _isBusy = true;
    _talkTimer?.cancel();
    final duration = _formatDuration(_talkSeconds);
    final durationSecs = _talkSeconds;
    final channelIdx = _selectedChannelIndex;
    final hadAudio = _talkSeconds > 0;

    // 1. Disable mic in LiveKit room (stop live broadcast)
    final pttService = ref.read(livekitPttProvider);
    await pttService.stopTalking();

    // 2. Broadcast unlock signal on screen's Realtime channel
    final userId = ref.read(supabaseClientProvider).auth.currentUser?.id ?? '';
    _realtimeChannel?.sendBroadcastMessage(
      event: 'ptt_talking',
      payload: {
        'user_id': userId,
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
                totalMembers: channelIdx < _channels.length ? _channels[channelIdx].memberCount : 0,
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
    _isBusy = false;
  }

  /// Upload recording to Supabase Storage + insert message record
  Future<void> _uploadRecording(html.Blob audioBlob, int durationSecs, int channelIdx) async {
    try {
      final client = ref.read(supabaseClientProvider);
      final userId = client.auth.currentUser?.id ?? Env.defaultUserId;
      final ext = 'User'; // Will be updated after Auth implementation
      final room = channelIdx < _channels.length ? _channels[channelIdx].conferenceRoom : 'unknown';
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
    _leaveChannel();
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
      body: Stack(
        children: [
          Column(
            children: [
              _buildHeader(theme, isDark),
              Expanded(child: _buildBody(theme, isDark)),
            ],
          ),
          // 🚨 SOS Countdown Overlay (ملء الشاشة)
          if (_isSosCountdown)
            Positioned.fill(
              child: GestureDetector(
                onTapDown: (_) => _cancelSosCountdown(),
                child: Container(
                  color: const Color(0xFFFF3B30).withOpacity(0.92),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('$_sosCountdown',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 140,
                            fontWeight: FontWeight.w900,
                          )),
                      const SizedBox(height: 16),
                      const Text('🚨 تفعيل الطوارئ',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 28,
                            fontWeight: FontWeight.w700,
                          )),
                      const SizedBox(height: 32),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _buildSosTypeBtn('sos', 'طوارئ 🚨', Colors.red.shade900),
                          const SizedBox(width: 12),
                          _buildSosTypeBtn('help', 'مساعدة 🟡', Colors.orange.shade700),
                          const SizedBox(width: 12),
                          _buildSosTypeBtn('urgent', 'عاجل 🔵', Colors.blue.shade700),
                        ],
                      ),
                      const SizedBox(height: 24),
                      Text('سيتم تفعيل "طوارئ" تلقائياً عند انتهاء العد',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.9),
                            fontSize: 14,
                          )),
                      const SizedBox(height: 16),
                      Text('اسحب للأسفل أو اضغط خارج الأزرار للإلغاء',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.6),
                            fontSize: 14,
                          )),
                    ],
                  ),
                ),
              ),
            ),
          // 🦺 Lone Worker Check Overlay (ملء الشاشة)
          if (_isLoneWorkerCheckActive)
            Positioned.fill(
              child: Container(
                color: const Color(0xFFFFCC00).withOpacity(0.95), // لون أصفر تحذيري
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(CupertinoIcons.exclamationmark_triangle_fill, size: 80, color: Colors.black87),
                    const SizedBox(height: 24),
                    const Text('فحص العامل الوحيد',
                        style: TextStyle(
                          color: Colors.black87,
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                        )),
                    const SizedBox(height: 12),
                    const Text('هل أنت بخير؟ يرجى تأكيد تواجدك',
                        style: TextStyle(
                          color: Colors.black54,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        )),
                    const SizedBox(height: 32),
                    Text('$_loneWorkerCountdown',
                        style: const TextStyle(
                          color: Colors.black87,
                          fontSize: 80,
                          fontWeight: FontWeight.w900,
                        )),
                    const SizedBox(height: 40),
                    GestureDetector(
                      onTap: () => _confirmLoneWorkerSafety(),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20),
                        decoration: BoxDecoration(
                          color: Colors.black87,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10, offset: const Offset(0, 4)),
                          ]
                        ),
                        child: const Text('أنا بخير ✅', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text('سيتم تفعيل نداء الطوارئ تلقائياً في حال عدم الاستجابة',
                        style: TextStyle(
                          color: Colors.red,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        )),
                  ],
                ),
              ),
            ),
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
          Builder(builder: (_) {
            final isConnected = ref.watch(livekitPttProvider).isConnected;
            final statusColor = isConnected ? const Color(0xFF34C759) : const Color(0xFFFF3B30);
            return Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(CupertinoIcons.antenna_radiowaves_left_right,
                  color: statusColor, size: 22),
            );
          }),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('NexaLive',
                    style: TextStyle(
                        color: theme.colorScheme.onSurface,
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5)),
                Text('Real-Time Communication',
                    style: TextStyle(
                        color: theme.colorScheme.onSurface.withOpacity(0.5),
                        fontSize: 13,
                        fontWeight: FontWeight.w500)),
              ],
            ),
          ),
          GestureDetector(
            onTap: _toggleLoneWorkerMode,
            child: Container(
              width: 38,
              height: 38,
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                color: _isLoneWorkerEnabled ? const Color(0xFFFFCC00).withOpacity(0.2) : theme.colorScheme.onSurface.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _isLoneWorkerEnabled ? const Color(0xFFFFCC00) : Colors.transparent,
                  width: 1.5,
                )
              ),
              child: Icon(CupertinoIcons.person_crop_circle_fill_badge_checkmark,
                  color: _isLoneWorkerEnabled ? const Color(0xFFFF9500) : theme.colorScheme.onSurface.withOpacity(0.4), size: 20),
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

    final channelNames = _channels.map((c) => c.name).toList();
    final filters = ['All', ...channelNames];
    final selectedFilter = _selectedChannelIndex == -1 ? 'All' : (_selectedChannelIndex < _channels.length ? _channels[_selectedChannelIndex].name : 'All');
    final icons = [CupertinoIcons.globe, ..._channels.map((c) => c.type == 'group' ? CupertinoIcons.person_3_fill : CupertinoIcons.person_2_fill)];
    final colors = [const Color(0xFF007AFF), ..._channels.map((c) => const Color(0xFF34C759))];
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
            final idx = _channels.indexWhere((c) => c.name == f);
            setState(() => _selectedChannelIndex = idx);
            // Subscribe to Realtime for this channel immediately
            final room = _channels[idx].conferenceRoom;
            _subscribeToRealtime(room);
            _loadCloudHistory(idx);
            _joinChannel(idx);
          }
        },
      );
    }

    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      child: Stack(
        children: [
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
                  if (f == statusFilters[0]) {
                    notifier.setStatus(TalkieStatus.available);
                  } else if (f == statusFilters[1]) {
                    notifier.setStatus(TalkieStatus.auto);
                  } else if (f == statusFilters[2]) {
                    notifier.setStatus(TalkieStatus.silent);
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

    // 🚨 رسالة طوارئ — تصميم مميز
    if (item.messageType == 'emergency') {
      return Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              const Color(0xFFFF3B30).withOpacity(isDark ? 0.3 : 0.1),
              const Color(0xFFFF3B30).withOpacity(isDark ? 0.15 : 0.05),
            ],
          ),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFFF3B30).withOpacity(0.4), width: 1.5),
        ),
        child: Row(
          children: [
            // أيقونة طوارئ
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFFFF3B30),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(CupertinoIcons.exclamationmark_triangle_fill,
                  color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            // تفاصيل
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('🚨 تنبيه طوارئ — ${item.sender}',
                      style: const TextStyle(
                        color: Color(0xFFFF3B30),
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      )),
                  const SizedBox(height: 2),
                  Text('📍 بث فيديو مباشر + إرسال موقع',
                      style: TextStyle(
                        color: theme.colorScheme.onSurface.withOpacity(0.6),
                        fontSize: 11,
                      )),
                ],
              ),
            ),
            // الوقت
            Text(_timeAgo(item.time),
                style: TextStyle(
                  color: theme.colorScheme.onSurface.withOpacity(0.4),
                  fontSize: 11,
                )),
          ],
        ),
      );
    }

    // رسالة صوتية عادية
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
    final pttService = ref.watch(livekitPttProvider);
    final channelName = _selectedChannelIndex == -1
        ? 'Global Broadcast'
        : (_selectedChannelIndex < _channels.length ? _channels[_selectedChannelIndex].name : 'Global');
    final memberCount = pttService.participantCount;
    final isLivekitConnected = pttService.isConnected;

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
          Text(channelName,
              style: TextStyle(
                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                  fontSize: 14,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 6, height: 6,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isLivekitConnected ? const Color(0xFF34C759) : const Color(0xFFFF9500),
                ),
              ),
              const SizedBox(width: 4),
              Text(
                _isTalking
                    ? 'talkie.broadcasting'.tr()
                    : isLivekitConnected
                        ? 'NexaLive • $memberCount ${'talkie.members'.tr()}'
                        : '${'talkie.connected'.tr()} • $memberCount ${'talkie.members_active'.tr()}',
                style: TextStyle(
                  color: _isTalking ? const Color(0xFFFF3B30) : const Color(0xFF34C759),
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Remote video — عرض فيديو المتحدث بملء الشاشة
          if (_currentTalker != null && !_isTalking)
            Builder(
              builder: (context) {
                final livekit = ref.watch(livekitServiceProvider);
                final remoteVideos = livekit.remoteParticipants
                    .where((p) => p.videoTrackPublications.any((pub) => pub.track != null && !pub.muted))
                    .toList();
                if (remoteVideos.isEmpty) return const SizedBox.shrink();
                final remotePart = remoteVideos.first;
                final videoTrack = remotePart.videoTrackPublications
                    .where((pub) => pub.track != null && !pub.muted)
                    .map((pub) => pub.track as VideoTrack)
                    .firstOrNull;
                if (videoTrack == null) return const SizedBox.shrink();
                
                // فتح شاشة ملء الشاشة تلقائياً
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (!_isShowingFullScreenVideo) {
                    _isShowingFullScreenVideo = true;
                    showDialog(
                      context: context,
                      barrierDismissible: true,
                      barrierColor: Colors.black,
                      builder: (_) => _FullScreenVideoOverlay(
                        videoTrack: videoTrack,
                        speakerName: _currentTalker ?? '',
                        onClose: () {
                          _isShowingFullScreenVideo = false;
                          Navigator.of(context).pop();
                        },
                      ),
                    ).then((_) => _isShowingFullScreenVideo = false);
                  }
                });
                
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF34C759).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF34C759).withOpacity(0.3)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(CupertinoIcons.video_camera_solid, color: Color(0xFF34C759), size: 16),
                      const SizedBox(width: 6),
                      Text('$_currentTalker يبث فيديو مباشر 📹',
                          style: const TextStyle(color: Color(0xFF34C759), fontSize: 12, fontWeight: FontWeight.w600)),
                    ],
                  ),
                );
              },
            ),

          // Video PTT preview (when video mode is active)
          if (_isVideoPtt && _isTalking)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              height: 300,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFF3B30).withOpacity(0.5), width: 2),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Builder(
                  builder: (context) {
                    final livekit = ref.watch(livekitServiceProvider);
                    final localPart = livekit.room?.localParticipant;
                    if (localPart == null) {
                      return const Center(child: Text('جاري تشغيل الكاميرا...', style: TextStyle(color: Colors.white54, fontSize: 13)));
                    }
                    final videoTrack = localPart.videoTrackPublications
                        .where((pub) => pub.track != null && !pub.muted)
                        .map((pub) => pub.track as VideoTrack)
                        .firstOrNull;
                    if (videoTrack == null) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(CupertinoIcons.video_camera_solid, color: Color(0xFFFF3B30), size: 28),
                            const SizedBox(height: 6),
                            Text('بث فيديو مباشر', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13)),
                          ],
                        ),
                      );
                    }
                    return Stack(
                      children: [
                        VideoTrackRenderer(videoTrack, fit: VideoViewFit.cover),
                        // زر تبديل الكاميرا أمامية/خلفية
                        Positioned(
                          top: 8, right: 8,
                          child: GestureDetector(
                            onTap: () => ref.read(livekitServiceProvider).switchCamera(),
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.black54,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Icon(CupertinoIcons.camera_rotate, color: Colors.white, size: 18),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),

          // PTT Button (with video swipe-up)
          PttButton(
            isTalking: _isTalking,
            currentSpeaker: _currentTalker,
            recordingDuration: _talkSeconds,
            onStartTalking: _startTalking,
            onStopTalking: () {
              _stopTalking();
              // إيقاف الفيديو عند الإفلات
              if (_isVideoPtt) {
                setState(() => _isVideoPtt = false);
                ref.read(livekitServiceProvider).toggleCamera(enabled: false);
              }
            },
            isVideoMode: _isVideoPtt,
            onVideoToggle: () {
              setState(() => _isVideoPtt = true);
              ref.read(livekitServiceProvider).toggleCamera(enabled: true);
            },
          ),

          const SizedBox(height: 10),

          // أزرار: اتصال مباشر + SOS / إيقاف الطوارئ
          if (_isSosActive)
            // 🚨 حالة الطوارئ نشطة — زر إيقاف كبير
            GestureDetector(
              onTap: _stopSos,
              child: Container(
                width: double.infinity,
                margin: const EdgeInsets.symmetric(horizontal: 20),
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFF3B30), Color(0xFFCC0000)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(color: const Color(0xFFFF3B30).withOpacity(0.5), blurRadius: 20),
                  ],
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(CupertinoIcons.xmark_circle_fill, color: Colors.white, size: 22),
                    SizedBox(width: 8),
                    Text('🚨 إيقاف الطوارئ',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        )),
                  ],
                ),
              ),
            )
          else
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // زر اتصال مباشر 1:1
                GestureDetector(
                  onTap: () => _showCallMemberList(theme, isDark),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF007AFF).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(CupertinoIcons.phone, color: Color(0xFF007AFF), size: 16),
                        SizedBox(width: 6),
                        Text('اتصال مباشر',
                            style: TextStyle(
                                color: Color(0xFF007AFF),
                                fontSize: 12,
                                fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // 🚨 زر الطوارئ SOS
                GestureDetector(
                  onLongPressStart: (_) => _startSosCountdown(),
                  onLongPressEnd: (_) => _cancelSosCountdown(),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFF3B30).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFFF3B30).withOpacity(0.3)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(CupertinoIcons.exclamationmark_shield,
                            color: Color(0xFFFF3B30), size: 16),
                        SizedBox(width: 4),
                        Text('SOS',
                            style: TextStyle(
                              color: Color(0xFFFF3B30),
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            )),
                      ],
                    ),
                  ),
                ),
              ],
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

  // ═══════════════════════════════════
  // 🚨 Emergency SOS Logic
  // ═══════════════════════════════════

  Widget _buildSosTypeBtn(String type, String label, Color color) {
    return GestureDetector(
      onTap: () {
        _sosTimer?.cancel();
        setState(() => _isSosCountdown = false);
        _triggerSos(type);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.5), width: 2),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4)),
          ]
        ),
        child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
      ),
    );
  }

  void _startSosCountdown() {
    if (_isSosActive) return;
    setState(() {
      _isSosCountdown = true;
      _sosCountdown = 3;
    });
    _sosTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _sosCountdown--;
        if (_sosCountdown <= 0) {
          timer.cancel();
          _isSosCountdown = false;
          _triggerSos('sos'); // Default type
        }
      });
    });
  }

  void _cancelSosCountdown() {
    if (!_isSosCountdown) return;
    _sosTimer?.cancel();
    setState(() {
      _isSosCountdown = false;
      _sosCountdown = 3;
    });
  }

  Future<void> _triggerSos(String emergencyType) async {
    setState(() => _isSosActive = true);

    final supabase = ref.read(supabaseClientProvider);
    final livekit = ref.read(livekitServiceProvider);
    final userName = supabase.auth.currentUser?.userMetadata?['full_name'] ?? 'User';
    final channelName = ref.read(livekitPttProvider).channels.isNotEmpty
        ? ref.read(livekitPttProvider).channels[_selectedChannelIndex].name
        : 'القناة الرئيسية';

    // 1. تفعيل الكاميرا تلقائياً (بث صامت — بدون عرض محلي)
    try {
      await livekit.toggleCamera(enabled: true);
      await Future.delayed(const Duration(milliseconds: 500));
    } catch (e) {
      debugPrint('[SOS] Camera error: $e');
    }
    // لا نعرض معاينة الكاميرا المحلية — فقط بث للآخرين
    await livekit.enableMicrophone();

    // 2. الحصول على GPS الحقيقي
    String locationStr = 'غير متوفر';
    String? mapsLink;
    try {
      final geo = html.window.navigator.geolocation;
      final pos = await geo.getCurrentPosition(
        enableHighAccuracy: true,
        timeout: const Duration(seconds: 5),
      );
      final lat = pos.coords!.latitude;
      final lng = pos.coords!.longitude;
      locationStr = '$lat, $lng';
      mapsLink = 'https://maps.google.com/?q=$lat,$lng';
      debugPrint('[SOS] 📍 GPS: $locationStr');
    } catch (e) {
      debugPrint('[SOS] GPS error: $e');
      locationStr = 'تعذر الحصول على الموقع';
    }

    // بدء تحديث الموقع المستمر أثناء الطوارئ
    _startLiveLocationUpdates();

    final pttService = ref.read(livekitPttProvider);
    final activeChannelId = pttService.activeChannelId;
    final currentUserId = supabase.auth.currentUser?.id;

    // تسجيل الطوارئ في قاعدة البيانات
    if (activeChannelId != null && currentUserId != null) {
      try {
        final latValue = double.tryParse(locationStr.split(',')[0].trim());
        final lngValue = double.tryParse(locationStr.split(',').length > 1 ? locationStr.split(',')[1].trim() : '');
        
        await supabase.from('nexa_ptt_emergencies').insert({
          'channel_id': activeChannelId,
          'user_id': currentUserId,
          'emergency_type': emergencyType,
          'lat': latValue,
          'lng': lngValue,
          'status': 'active',
        });

        // رسالة تلقائية في الشات
        String typeAr = emergencyType == 'help' ? 'مساعدة 🟡' : emergencyType == 'urgent' ? 'عاجل 🔵' : 'طوارئ قصوى 🚨';
        await supabase.from('messages').insert({
          'channel_id': activeChannelId,
          'user_id': currentUserId,
          'content': '🚨 أعلن [$userName] حالة [$typeAr]. الموقع: $mapsLink',
          'type': 'system', // نوع رسالة نظام إن وجد
        });

      } catch (e) {
        debugPrint('[SOS] Error saving emergency to DB: $e');
      }
    }

    // 3. بث تنبيه الطوارئ لكل الأعضاء
    _realtimeChannel?.sendBroadcastMessage(
      event: 'sos_alert',
      payload: {
        'user_name': userName,
        'location': locationStr,
        'maps_link': mapsLink ?? '',
        'channel': channelName,
        'timestamp': DateTime.now().toIso8601String(),
        'type': emergencyType,
      },
    );

    // 4. حفظ رسالة الطوارئ في تاريخ القناة
    try {
      final room = _channels.isNotEmpty
          ? _channels[_selectedChannelIndex].conferenceRoom
          : '';
      final channelData = await supabase
          .from('nexa_ptt_channels')
          .select('id')
          .eq('conference_room', room)
          .maybeSingle();
      if (channelData != null) {
        await supabase.from('nexa_ptt_messages').insert({
          'channel_id': channelData['id'],
          'sender_id': supabase.auth.currentUser?.id ?? Env.defaultUserId,
          'sender_name': userName,
          'sender_ext': '',
          'message_type': 'emergency',
          'duration_seconds': 0,
          'audio_url': '',
          'metadata': {
            'location': locationStr,
            'maps_link': mapsLink ?? '',
            'channel': channelName,
            'type': 'sos',
          },
          'expires_at': DateTime.now().add(const Duration(days: 30)).toUtc().toIso8601String(),
        });
        _loadCloudHistory(_selectedChannelIndex);
      }
    } catch (e) {
      debugPrint('[SOS] Save message error: $e');
    }

    // 5. إظهار حالة الطوارئ
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(CupertinoIcons.exclamationmark_triangle, color: Colors.white),
              const SizedBox(width: 8),
              Expanded(child: Text('🚨 تم تفعيل الطوارئ — بث فيديو مباشر + إرسال الموقع',
                  style: const TextStyle(fontWeight: FontWeight.bold))),
            ],
          ),
          backgroundColor: const Color(0xFFFF3B30),
          duration: const Duration(seconds: 5),
        ),
      );
    }
  }

  void _stopSos() {
    _sosTimer?.cancel();
    _locationTimer?.cancel();
    final livekit = ref.read(livekitServiceProvider);
    livekit.toggleCamera(enabled: false);
    livekit.disableMicrophone();
    setState(() {
      _isSosActive = false;
      _isVideoPtt = false;
    });

    // إبلاغ الأعضاء بإلغاء الطوارئ
    _realtimeChannel?.sendBroadcastMessage(
      event: 'sos_alert',
      payload: {
        'type': 'cancelled',
        'timestamp': DateTime.now().toIso8601String(),
      },
    );
  }

  // تحديث الموقع المباشر كل 10 ثواني
  void _startLiveLocationUpdates() {
    _locationTimer?.cancel();
    _locationTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      if (!_isSosActive) {
        _locationTimer?.cancel();
        return;
      }
      try {
        final pos = await html.window.navigator.geolocation.getCurrentPosition(
          enableHighAccuracy: true,
          timeout: const Duration(seconds: 5),
        );
        final lat = pos.coords!.latitude;
        final lng = pos.coords!.longitude;
        _realtimeChannel?.sendBroadcastMessage(
          event: 'sos_location',
          payload: {
            'lat': lat,
            'lng': lng,
            'maps_link': 'https://maps.google.com/?q=$lat,$lng',
            'timestamp': DateTime.now().toIso8601String(),
          },
        );
        debugPrint('[SOS] 📍 Live location update: $lat, $lng');
      } catch (e) {
        debugPrint('[SOS] Live location error: $e');
      }
    });
  }

  // ═══════════════════════════════════
  // 🦺 Lone Worker Logic (العامل الوحيد)
  // ═══════════════════════════════════
  
  void _toggleLoneWorkerMode() {
    setState(() {
      _isLoneWorkerEnabled = !_isLoneWorkerEnabled;
    });

    if (_isLoneWorkerEnabled) {
      _startLoneWorkerTimer();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('🦺 تم تفعيل وضع "العامل الوحيد". سيتم الاطمئنان عليك دورياً.'), backgroundColor: Color(0xFFFF9500)),
      );
    } else {
      _loneWorkerTimer?.cancel();
      _loneWorkerCheckTimer?.cancel();
      setState(() => _isLoneWorkerCheckActive = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('🦺 تم إيقاف وضع "العامل الوحيد".'), backgroundColor: Colors.grey),
      );
    }
  }

  void _startLoneWorkerTimer() {
    _loneWorkerTimer?.cancel();
    // للاختبار الفعلي السريع، سنجعل المؤقت دقيقة واحدة. في الإنتاج يمكن أن يكون 30 دقيقة.
    _loneWorkerTimer = Timer.periodic(const Duration(minutes: 1), (timer) {
      _triggerLoneWorkerCheck();
    });
  }

  void _triggerLoneWorkerCheck() {
    if (_isSosActive || _isLoneWorkerCheckActive) return; // لا تقاطع الطوارئ الفعلية أو الفحص الجاري
    
    // تشغيل تنبيه قوي
    _playSound('alert');
    HapticFeedback.heavyImpact();

    setState(() {
      _isLoneWorkerCheckActive = true;
      _loneWorkerCountdown = 60; // 60 ثانية للرد
    });

    _loneWorkerCheckTimer?.cancel();
    _loneWorkerCheckTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _loneWorkerCountdown--;
        if (_loneWorkerCountdown <= 0) {
          timer.cancel();
          _isLoneWorkerCheckActive = false;
          // تفعيل الطوارئ التلقائي لأن العامل لم يرد
          debugPrint('[LoneWorker] No response! Triggering SOS auto-broadcast.');
          _triggerSos('sos');
        }
      });
    });
  }

  void _confirmLoneWorkerSafety() {
    _loneWorkerCheckTimer?.cancel();
    setState(() {
      _isLoneWorkerCheckActive = false;
    });
    // إعادة تشغيل المؤقت الرئيسي
    _startLoneWorkerTimer();
    HapticFeedback.lightImpact();
  }

  void _showCallMemberList(ThemeData theme, bool isDark) async {
    final pttService = ref.read(livekitPttProvider);
    final livekit = ref.read(livekitServiceProvider);
    final participants = livekit.remoteParticipants;

    if (participants.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('لا يوجد مستخدمون متصلون حالياً'),
          backgroundColor: Color(0xFFFF9500),
        ),
      );
      return;
    }

    final channelId = pttService.activeChannelId;
    Map<String, String> memberStatus = {};
    if (channelId != null) {
      try {
        final res = await Supabase.instance.client
            .from('nexa_ptt_members')
            .select('user_id, availability')
            .eq('channel_id', channelId);
        
        for (var row in (res as List)) {
          final uid = row['user_id'] as String;
          final status = row['availability'] as String? ?? 'always';
          memberStatus[uid] = status;
        }
      } catch (e) {
        debugPrint('[Presence] Error fetching member status: $e');
      }
    }

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF1C1C1E) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text('حالة التواجد - مباشر',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: theme.colorScheme.onSurface)),
            ),
            ...participants.map((p) {
              // افتراضياً نستخدم identity كـ user_id للمطابقة (حسب تنفيذ LiveKit الحالي)
              final status = memberStatus[p.identity] ?? 'always';
              Color statusColor = const Color(0xFF34C759); // Green
              String statusText = 'متاح للتحدث';

              if (status == 'silent') {
                statusColor = const Color(0xFFFF9500); // Yellow
                statusText = 'صامت / مشغول';
              } else if (status == 'scheduled' || status == 'auto') {
                statusColor = const Color(0xFFFFCC00); // Yellow/Orange
                statusText = 'تلقائي';
              }

              return ListTile(
                leading: Stack(
                  children: [
                    CircleAvatar(
                      backgroundColor: const Color(0xFF007AFF).withOpacity(0.1),
                      child: const Icon(CupertinoIcons.person, color: Color(0xFF007AFF)),
                    ),
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: statusColor,
                          shape: BoxShape.circle,
                          border: Border.all(color: theme.scaffoldBackgroundColor, width: 2),
                        ),
                      ),
                    ),
                  ],
                ),
                title: Text(p.identity ?? 'مستخدم',
                    style: TextStyle(color: theme.colorScheme.onSurface, fontWeight: FontWeight.w600)),
                subtitle: Text(statusText, style: TextStyle(color: statusColor, fontSize: 12)),
                trailing: GestureDetector(
                  onTap: () {
                    Navigator.pop(ctx);
                    _startDirectCall(p.identity ?? '', 'مستخدم');
                  },
                  child: Container(
                    width: 40, height: 40,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0xFF34C759),
                    ),
                    child: const Icon(CupertinoIcons.phone, color: Colors.white, size: 20),
                  ),
                ),
              );
            }),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _startDirectCall(String targetUserId, String targetName) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => LiveKitCallScreen(
          targetUserId: targetUserId,
          targetName: targetName,
          isIncoming: false,
        ),
      ),
    );
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
  final String messageType; // 'audio' | 'emergency'

  _PttHistoryItem({
    required this.sender,
    required this.duration,
    required this.time,
    required this.listenedBy,
    required this.totalMembers,
    this.isMine = false,
    this.audioUrl,
    this.messageType = 'audio',
  });
}

/// شاشة فيديو ملء الشاشة — تظهر تلقائياً عند بث فيديو PTT
class _FullScreenVideoOverlay extends StatelessWidget {
  final VideoTrack videoTrack;
  final String speakerName;
  final VoidCallback onClose;

  const _FullScreenVideoOverlay({
    required this.videoTrack,
    required this.speakerName,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black,
      child: Stack(
        children: [
          // فيديو ملء الشاشة
          Positioned.fill(
            child: VideoTrackRenderer(videoTrack, fit: VideoViewFit.cover),
          ),

          // اسم المتحدث + زر إغلاق
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 16, right: 16,
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8, height: 8,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color(0xFFFF3B30),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text('بث مباشر • $speakerName',
                          style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: onClose,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(CupertinoIcons.xmark, color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 🚨 شاشة تنبيه الطوارئ — تظهر عند الأعضاء عندما يضغط أحدهم SOS
class _EmergencyAlertDialog extends StatefulWidget {
  final String senderName;
  final ValueNotifier<Map<String, String>> locationNotifier;
  final VoidCallback onDismiss;

  const _EmergencyAlertDialog({
    required this.senderName,
    required this.locationNotifier,
    required this.onDismiss,
  });

  @override
  State<_EmergencyAlertDialog> createState() => _EmergencyAlertDialogState();
}

class _EmergencyAlertDialogState extends State<_EmergencyAlertDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: AnimatedBuilder(
        animation: _pulseAnimation,
        builder: (context, child) => Container(
          color: Color.lerp(
            const Color(0xFFFF3B30).withOpacity(0.85),
            const Color(0xFFCC0000).withOpacity(0.95),
            _pulseAnimation.value,
          ),
          child: SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // أيقونة طوارئ كبيرة
                Transform.scale(
                  scale: _pulseAnimation.value * 1.2,
                  child: Container(
                    width: 120, height: 120,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withOpacity(0.2),
                      border: Border.all(color: Colors.white, width: 3),
                    ),
                    child: const Icon(CupertinoIcons.exclamationmark_triangle_fill,
                        color: Colors.white, size: 60),
                  ),
                ),
                const SizedBox(height: 30),

                const Text('🚨 تنبيه طوارئ',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                    )),
                const SizedBox(height: 16),

                Text(widget.senderName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                    )),
                const SizedBox(height: 12),

                // مؤشر التسجيل المحلي
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black45,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.redAccent, width: 1.5),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(CupertinoIcons.circle_fill, color: Colors.redAccent, size: 10),
                      SizedBox(width: 6),
                      Text('جاري التسجيل للحفظ المحلي...',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          )),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // الموقع الحي والتحديثات
                ValueListenableBuilder<Map<String, String>>(
                  valueListenable: widget.locationNotifier,
                  builder: (context, locData, child) {
                    final locationStr = locData['location'] ?? '';
                    final mapsLink = locData['mapsLink'] ?? '';
                    return Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(CupertinoIcons.location_solid, color: Colors.white, size: 18),
                              const SizedBox(width: 8),
                              Text(locationStr,
                                  style: const TextStyle(color: Colors.white, fontSize: 16)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),

                        // زر فتح الخريطة
                        if (mapsLink.isNotEmpty)
                          GestureDetector(
                            onTap: () => html.window.open(mapsLink, '_blank'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.25),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.white.withOpacity(0.5)),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(CupertinoIcons.map, color: Colors.white, size: 18),
                                  SizedBox(width: 8),
                                  Text('📍 فتح الموقع المباشر (تحديث حي)',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                      )),
                                ],
                              ),
                            ),
                          ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 12),

                // وقت + بث
                Text('${TimeOfDay.now().format(context)}',
                    style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14)),
                const SizedBox(height: 4),
                Text('📹 بث فيديو مباشر + 📍 موقع حي',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 14,
                      fontStyle: FontStyle.italic,
                    )),

                const SizedBox(height: 40),

                // زر إغلاق
                GestureDetector(
                  onTap: widget.onDismiss,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(30),
                    ),
                    child: const Text('تم الاطلاع',
                        style: TextStyle(
                          color: Color(0xFFFF3B30),
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        )),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
