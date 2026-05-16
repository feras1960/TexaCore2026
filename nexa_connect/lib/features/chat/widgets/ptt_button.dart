import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

/// Push-to-Talk button — hold to talk, release to send
/// Designed as a premium floating walkie-talkie control
class PttButton extends StatefulWidget {
  final bool isTalking;
  final String? currentSpeaker;
  final int recordingDuration;
  final VoidCallback onStartTalking;
  final VoidCallback onStopTalking;

  const PttButton({
    super.key,
    required this.isTalking,
    this.currentSpeaker,
    this.recordingDuration = 0,
    required this.onStartTalking,
    required this.onStopTalking,
  });

  @override
  State<PttButton> createState() => _PttButtonState();
}

class _PttButtonState extends State<PttButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  bool _isPressed = false;

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
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Speaking indicator
        if (widget.currentSpeaker != null && !widget.isTalking)
          Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF34C759).withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: const Color(0xFF34C759).withOpacity(0.3),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(CupertinoIcons.waveform,
                    color: Color(0xFF34C759), size: 16),
                const SizedBox(width: 6),
                Text(
                  '${widget.currentSpeaker} is talking',
                  style: const TextStyle(
                    color: Color(0xFF34C759),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),

        // Recording duration
        if (widget.isTalking)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              _formatDuration(widget.recordingDuration),
              style: const TextStyle(
                color: Color(0xFFFF3B30),
                fontSize: 16,
                fontWeight: FontWeight.w700,
                fontFeatures: [FontFeature.tabularFigures()],
              ),
            ),
          ),

        // PTT Button
        GestureDetector(
          onTapDown: (_) {
            setState(() => _isPressed = true);
            widget.onStartTalking();
          },
          onTapUp: (_) {
            setState(() => _isPressed = false);
            widget.onStopTalking();
          },
          onTapCancel: () {
            setState(() => _isPressed = false);
            widget.onStopTalking();
          },
          child: AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              final scale = widget.isTalking
                  ? 1.0 + (_pulseController.value * 0.08)
                  : _isPressed
                      ? 0.95
                      : 1.0;

              return Transform.scale(
                scale: scale,
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: widget.isTalking
                          ? [const Color(0xFFFF3B30), const Color(0xFFFF6B6B)]
                          : [const Color(0xFF34C759), const Color(0xFF30D158)],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: (widget.isTalking
                                ? const Color(0xFFFF3B30)
                                : const Color(0xFF34C759))
                            .withOpacity(
                                widget.isTalking ? 0.4 + _pulseController.value * 0.2 : 0.3),
                        blurRadius: widget.isTalking ? 20 : 12,
                        spreadRadius: widget.isTalking ? 4 : 0,
                      ),
                    ],
                  ),
                  child: Icon(
                    widget.isTalking
                        ? CupertinoIcons.waveform
                        : CupertinoIcons.mic_fill,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
              );
            },
          ),
        ),

        const SizedBox(height: 8),

        // Label
        Text(
          widget.isTalking ? 'Release to send' : 'Hold to talk',
          style: TextStyle(
            color: theme.colorScheme.onSurface.withOpacity(0.5),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
