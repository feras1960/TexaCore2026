import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:easy_localization/easy_localization.dart';

/// Push-to-Talk button — hold to talk, release to send
/// Half-duplex: locked when someone else is talking
class PttButton extends StatefulWidget {
  final bool isTalking;
  final String? currentSpeaker;
  final int recordingDuration;
  final VoidCallback onStartTalking;
  final VoidCallback onStopTalking;
  final VoidCallback? onVideoToggle; // سحب للأعلى → فيديو
  final bool isVideoMode;

  const PttButton({
    super.key,
    required this.isTalking,
    this.currentSpeaker,
    this.recordingDuration = 0,
    required this.onStartTalking,
    required this.onStopTalking,
    this.onVideoToggle,
    this.isVideoMode = false,
  });

  @override
  State<PttButton> createState() => _PttButtonState();
}

class _PttButtonState extends State<PttButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  bool _isPressed = false;
  double _dragOffset = 0;

  /// Is another user talking? (lock the button)
  bool get _isLocked =>
      widget.currentSpeaker != null && !widget.isTalking;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
  }

  @override
  void didUpdateWidget(PttButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isTalking && !_pulseController.isAnimating) {
      _pulseController.repeat(reverse: true);
    } else if (!widget.isTalking && _pulseController.isAnimating) {
      _pulseController.stop();
      _pulseController.reset();
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  String _formatDuration(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(1, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // ─── Someone else is talking → locked ───
        if (_isLocked)
          Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFFF9500).withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
              border:
                  Border.all(color: const Color(0xFFFF9500).withOpacity(0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(CupertinoIcons.waveform,
                    color: Color(0xFFFF9500), size: 16),
                const SizedBox(width: 6),
                Text(
                  '${widget.currentSpeaker} يتحدث الآن...',
                  style: const TextStyle(
                    color: Color(0xFFFF9500),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 6),
                const Icon(CupertinoIcons.lock_fill,
                    color: Color(0xFFFF9500), size: 12),
              ],
            ),
          ),

        // ─── Recording timer ───
        if (widget.isTalking)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color(0xFFFF3B30),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  _formatDuration(widget.recordingDuration),
                  style: const TextStyle(
                    color: Color(0xFFFF3B30),
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ),

        // ─── PTT Button — Full Width, reliable touch ───
        Listener(
          onPointerDown: _isLocked
              ? null
              : (_) {
                    setState(() { _isPressed = true; _dragOffset = 0; });
                    widget.onStartTalking();
                  },
          onPointerUp: _isLocked
              ? null
              : (_) {
                    setState(() { _isPressed = false; _dragOffset = 0; });
                    widget.onStopTalking();
                  },
          onPointerCancel: _isLocked
              ? null
              : (_) {
                    setState(() { _isPressed = false; _dragOffset = 0; });
                    widget.onStopTalking();
                  },
          onPointerMove: _isLocked
              ? null
              : (event) {
                    _dragOffset += event.delta.dy;
                    // سحب لأعلى > 40 بكسل = تفعيل الفيديو
                    if (_dragOffset < -40 && !widget.isVideoMode && widget.onVideoToggle != null) {
                      widget.onVideoToggle!();
                    }
                  },
          child: AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              final scale = widget.isTalking
                  ? 1.0 + (_pulseController.value * 0.02)
                  : _isPressed
                      ? 0.97
                      : 1.0;

              final mainColor = widget.isTalking
                  ? const Color(0xFFD63C30) // Calmer, deeper red
                  : _isLocked
                      ? const Color(0xFF8E8E93)
                      : const Color(0xFF24A148); // Calmer, sophisticated green

              return Transform.scale(
                scale: scale,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: double.infinity,
                  height: 80,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    color: mainColor,
                    boxShadow: [
                      BoxShadow(
                        color: mainColor.withOpacity(
                            widget.isTalking
                                ? 0.35 + _pulseController.value * 0.15
                                : _isPressed
                                    ? 0.3
                                    : 0.15),
                        blurRadius: widget.isTalking ? 20 : 12,
                        spreadRadius: widget.isTalking ? 2 : 0,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        widget.isTalking
                            ? (widget.isVideoMode ? CupertinoIcons.video_camera_solid : CupertinoIcons.waveform)
                            : _isLocked
                                ? CupertinoIcons.lock_fill
                                : CupertinoIcons.mic_fill,
                        color: Colors.white,
                        size: 28,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        widget.isTalking
                            ? (widget.isVideoMode ? 'بث مباشر ⬆ فيديو' : 'talkie.release_to_send'.tr())
                            : widget.currentSpeaker != null
                                ? 'talkie.channel_busy'.tr()
                                : 'talkie.hold_to_talk'.tr(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
