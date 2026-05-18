import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// ignore: depend_on_referenced_packages
import 'package:flutter_riverpod/legacy.dart';
import 'package:livekit_client/livekit_client.dart';
import '../../../core/services/livekit_call_service.dart';
import '../../../core/providers/livekit_provider.dart';

/// شاشة المكالمة النشطة — صوت + فيديو عبر LiveKit
class LiveKitCallScreen extends ConsumerStatefulWidget {
  final String targetUserId;
  final String targetName;
  final bool isIncoming;

  const LiveKitCallScreen({
    super.key,
    required this.targetUserId,
    required this.targetName,
    this.isIncoming = false,
  });

  @override
  ConsumerState<LiveKitCallScreen> createState() => _LiveKitCallScreenState();
}

class _LiveKitCallScreenState extends ConsumerState<LiveKitCallScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseCtrl;
  bool _showControls = true;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    if (!widget.isIncoming) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(livekitCallProvider).makeCall(
          widget.targetUserId,
          widget.targetName,
        );
      });
    }
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final callService = ref.watch(livekitCallProvider);
    final state = callService.state;

    if (state == LiveCallState.idle) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (Navigator.of(context).canPop()) Navigator.of(context).pop();
      });
      return const SizedBox.shrink();
    }

    final isRinging = state == LiveCallState.outgoingRinging || 
                      state == LiveCallState.incomingRinging;
    final isConnecting = state == LiveCallState.connecting;
    final isConnected = state == LiveCallState.connected;
    final isEnded = state == LiveCallState.ended;
    final isIncoming = state == LiveCallState.incomingRinging;
    final isVideoOn = callService.isVideoEnabled;

    final remoteName = callService.activeCall?.remoteName ?? widget.targetName;

    return Scaffold(
      body: GestureDetector(
        onTap: () => setState(() => _showControls = !_showControls),
        child: Stack(
          children: [
            // ─── Background: Video or Gradient ───
            if (isVideoOn && isConnected)
              _buildVideoBackground(callService)
            else
              _buildGradientBackground(),

            // ─── Content overlay ───
            SafeArea(
              child: Column(
                children: [
                  const SizedBox(height: 40),

                  // Status text
                  AnimatedOpacity(
                    opacity: _showControls ? 1.0 : 0.0,
                    duration: const Duration(milliseconds: 200),
                    child: Text(
                      isIncoming
                          ? 'مكالمة واردة'
                          : isRinging
                              ? 'جاري الاتصال...'
                              : isConnecting
                                  ? 'جاري الربط...'
                                  : isEnded
                                      ? 'انتهت المكالمة'
                                      : callService.durationText,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: isConnected ? 20 : 16,
                        fontWeight: FontWeight.w500,
                        letterSpacing: isConnected ? 2 : 0,
                        shadows: const [Shadow(blurRadius: 10, color: Colors.black54)],
                      ),
                    ),
                  ),

                  if (!isVideoOn || !isConnected) ...[
                    const SizedBox(height: 40),
                    // Avatar
                    AnimatedBuilder(
                      animation: _pulseCtrl,
                      builder: (context, child) {
                        final scale = (isRinging || isConnecting)
                            ? 1.0 + (_pulseCtrl.value * 0.08)
                            : 1.0;
                        return Transform.scale(scale: scale, child: child);
                      },
                      child: Container(
                        width: 130, height: 130,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(colors: [
                            (isIncoming ? const Color(0xFF34C759) : const Color(0xFF007AFF)).withOpacity(0.3),
                            (isIncoming ? const Color(0xFF34C759) : const Color(0xFF007AFF)).withOpacity(0.1),
                          ]),
                          border: Border.all(
                            color: (isIncoming ? const Color(0xFF34C759) : const Color(0xFF007AFF)).withOpacity(0.4),
                            width: 2,
                          ),
                        ),
                        child: Center(
                          child: Text(_getInitials(remoteName),
                              style: const TextStyle(color: Colors.white, fontSize: 44, fontWeight: FontWeight.w300)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 28),
                    Text(remoteName,
                        style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(CupertinoIcons.antenna_radiowaves_left_right, color: Colors.white.withOpacity(0.3), size: 14),
                        const SizedBox(width: 6),
                        Text(isVideoOn ? 'NexaLive Video' : 'NexaLive Voice',
                            style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 13)),
                      ],
                    ),
                  ] else ...[
                    // Video mode: show name at top
                    const SizedBox(height: 8),
                    AnimatedOpacity(
                      opacity: _showControls ? 1.0 : 0.0,
                      duration: const Duration(milliseconds: 200),
                      child: Text(remoteName,
                          style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w600,
                              shadows: [Shadow(blurRadius: 10, color: Colors.black54)])),
                    ),
                  ],

                  const Spacer(),

                  // Controls
                  AnimatedOpacity(
                    opacity: _showControls ? 1.0 : 0.3,
                    duration: const Duration(milliseconds: 200),
                    child: _buildControls(callService, isIncoming, isConnected, isRinging, isConnecting),
                  ),

                  const SizedBox(height: 50),
                ],
              ),
            ),

            // ─── Local video (PiP) ───
            if (isVideoOn && isConnected)
              Positioned(
                right: 16,
                top: MediaQuery.of(context).padding.top + 16,
                child: _buildLocalVideo(callService),
              ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════
  // Video Views
  // ═══════════════════════════════════

  Widget _buildVideoBackground(LiveKitCallService service) {
    final remoteParticipants = service.remoteParticipants;
    if (remoteParticipants.isEmpty) return _buildGradientBackground();

    final remotePart = remoteParticipants.first;
    final videoTrack = remotePart.videoTrackPublications
        .where((pub) => pub.track != null && !pub.muted)
        .map((pub) => pub.track as VideoTrack)
        .firstOrNull;

    if (videoTrack == null) return _buildGradientBackground();

    return SizedBox.expand(
      child: VideoTrackRenderer(videoTrack, fit: VideoViewFit.cover),
    );
  }

  Widget _buildLocalVideo(LiveKitCallService service) {
    final localPart = service.room?.localParticipant;
    if (localPart == null) return const SizedBox.shrink();

    final videoTrack = localPart.videoTrackPublications
        .where((pub) => pub.track != null && !pub.muted)
        .map((pub) => pub.track as VideoTrack)
        .firstOrNull;

    if (videoTrack == null) return const SizedBox.shrink();

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 100, height: 140,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.3), width: 1),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 10)],
        ),
        child: VideoTrackRenderer(videoTrack, fit: VideoViewFit.cover),
      ),
    );
  }

  Widget _buildGradientBackground() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF0D1B2A), Color(0xFF1B2838), Color(0xFF0D1B2A)],
        ),
      ),
    );
  }

  // ═══════════════════════════════════
  // Controls
  // ═══════════════════════════════════

  Widget _buildControls(LiveKitCallService service, bool isIncoming, bool isConnected, bool isRinging, bool isConnecting) {
    if (isIncoming) return _buildIncomingControls(service);
    if (isConnected) return _buildActiveControls(service);
    if (isRinging || isConnecting) return _buildRingingControls(service);
    return const SizedBox.shrink();
  }

  Widget _buildIncomingControls(LiveKitCallService service) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        GestureDetector(
          onTap: () => service.rejectCall(),
          child: _roundButton(const Color(0xFFFF3B30), Icons.call_end_rounded),
        ),
        GestureDetector(
          onTap: () => service.acceptCall(),
          child: _roundButton(const Color(0xFF34C759), CupertinoIcons.phone),
        ),
      ],
    );
  }

  Widget _buildActiveControls(LiveKitCallService service) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _controlButton(
              icon: service.isMuted ? CupertinoIcons.mic_slash_fill : CupertinoIcons.mic,
              label: service.isMuted ? 'إلغاء الكتم' : 'كتم',
              isActive: service.isMuted,
              onTap: () => service.toggleMute(),
            ),
            _controlButton(
              icon: service.isVideoEnabled ? CupertinoIcons.video_camera_solid : CupertinoIcons.video_camera,
              label: service.isVideoEnabled ? 'إيقاف الفيديو' : 'فيديو',
              isActive: service.isVideoEnabled,
              onTap: () => service.toggleVideo(),
            ),
            _controlButton(
              icon: CupertinoIcons.speaker_2,
              label: 'سماعة',
              onTap: () {},
            ),
          ],
        ),
        const SizedBox(height: 40),
        _endCallButton(service),
      ],
    );
  }

  Widget _buildRingingControls(LiveKitCallService service) => _endCallButton(service);

  Widget _roundButton(Color color, IconData icon) {
    return Container(
      width: 72, height: 72,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
        boxShadow: [BoxShadow(color: color.withOpacity(0.4), blurRadius: 20)],
      ),
      child: Icon(icon, color: Colors.white, size: 32),
    );
  }

  Widget _controlButton({
    required IconData icon,
    required String label,
    bool isActive = false,
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 56, height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isActive ? Colors.white.withOpacity(0.25) : Colors.white.withOpacity(0.08),
              border: Border.all(color: Colors.white.withOpacity(isActive ? 0.4 : 0.1)),
            ),
            child: Icon(icon, color: Colors.white, size: 24),
          ),
          const SizedBox(height: 8),
          Text(label, style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12)),
        ],
      ),
    );
  }

  Widget _endCallButton(LiveKitCallService service) {
    return GestureDetector(
      onTap: () => service.endCall(),
      child: Container(
        width: 68, height: 68,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const LinearGradient(colors: [Color(0xFFFF3B30), Color(0xFFFF2D55)]),
          boxShadow: [BoxShadow(color: const Color(0xFFFF3B30).withOpacity(0.4), blurRadius: 20, offset: const Offset(0, 4))],
        ),
        child: const Icon(Icons.call_end_rounded, color: Colors.white, size: 32),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    return name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase();
  }
}
