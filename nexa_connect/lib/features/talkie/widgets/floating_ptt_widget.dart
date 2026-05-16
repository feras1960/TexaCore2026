import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

/// Floating PTT Widget — shows on all screens for quick talk
/// Draggable, shows active channel, long-press to talk
class FloatingPttWidget extends StatefulWidget {
  final bool isConnected;
  final String? activeChannelName;
  final String? currentTalker;
  final bool isTalking;
  final bool pttLocked;
  final VoidCallback onStartTalking;
  final VoidCallback onStopTalking;
  final VoidCallback? onTap; // Navigate to talkie screen

  const FloatingPttWidget({
    super.key,
    required this.isConnected,
    this.activeChannelName,
    this.currentTalker,
    this.isTalking = false,
    this.pttLocked = false,
    required this.onStartTalking,
    required this.onStopTalking,
    this.onTap,
  });

  @override
  State<FloatingPttWidget> createState() => _FloatingPttWidgetState();
}

class _FloatingPttWidgetState extends State<FloatingPttWidget>
    with SingleTickerProviderStateMixin {
  Offset _position = const Offset(20, 500);
  bool _isDragging = false;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void didUpdateWidget(covariant FloatingPttWidget oldWidget) {
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

  @override
  Widget build(BuildContext context) {
    if (!widget.isConnected) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Positioned(
      left: _position.dx,
      top: _position.dy,
      child: GestureDetector(
        onPanStart: (_) => setState(() => _isDragging = true),
        onPanUpdate: (details) {
          setState(() {
            _position += details.delta;
            // Clamp within screen bounds
            final size = MediaQuery.of(context).size;
            _position = Offset(
              _position.dx.clamp(0, size.width - 64),
              _position.dy.clamp(0, size.height - 64),
            );
          });
        },
        onPanEnd: (_) => setState(() => _isDragging = false),
        onTap: widget.onTap,
        onLongPressStart: widget.pttLocked
            ? null
            : (_) => widget.onStartTalking(),
        onLongPressEnd: widget.pttLocked
            ? null
            : (_) => widget.onStopTalking(),
        child: AnimatedBuilder(
          animation: _pulseAnimation,
          builder: (context, child) {
            return Transform.scale(
              scale: widget.isTalking ? _pulseAnimation.value : 1.0,
              child: child,
            );
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: _isDragging ? 70 : 60,
            height: _isDragging ? 70 : 60,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: widget.isTalking
                  ? const Color(0xFFEF4444) // Red when talking
                  : widget.pttLocked
                      ? const Color(0xFFEAB308) // Yellow when locked
                      : const Color(0xFF10B981), // Green when ready
              boxShadow: [
                BoxShadow(
                  color: (widget.isTalking
                          ? const Color(0xFFEF4444)
                          : const Color(0xFF10B981))
                      .withOpacity(0.4),
                  blurRadius: widget.isTalking ? 20 : 10,
                  spreadRadius: widget.isTalking ? 3 : 1,
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  widget.isTalking
                      ? CupertinoIcons.mic_fill
                      : widget.pttLocked
                          ? CupertinoIcons.lock_fill
                          : CupertinoIcons.antenna_radiowaves_left_right,
                  color: Colors.white,
                  size: 22,
                ),
                if (widget.currentTalker != null && !widget.isTalking)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      '🔊',
                      style: TextStyle(fontSize: 10),
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

/// AnimatedBuilder: workaround since AnimatedBuilder is the real name
class AnimatedBuilder extends AnimatedWidget {
  final TransitionBuilder builder;
  final Widget? child;

  const AnimatedBuilder({
    super.key,
    required super.listenable,
    required this.builder,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    return builder(context, child);
  }
}
