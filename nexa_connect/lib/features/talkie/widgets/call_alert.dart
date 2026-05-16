import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

/// Call Alert — sends a "ping" notification to a specific user
/// "Hey, I need you on the channel!"
class CallAlertService {
  /// Send a call alert via Supabase Realtime broadcast
  static void sendAlert({
    required dynamic realtimeChannel, // RealtimeChannel
    required String fromUserId,
    required String fromName,
    required String toUserId,
  }) {
    realtimeChannel.sendBroadcastMessage(
      event: 'call_alert',
      payload: {
        'from_user_id': fromUserId,
        'from_name': fromName,
        'to_user_id': toUserId,
        'timestamp': DateTime.now().toIso8601String(),
      },
    );
  }

  /// Play the alert sound
  static void playAlertSound() {
    try {
      final audio = html.AudioElement()
        ..src = 'assets/assets/sounds/ptt_chirp.mp3'
        ..volume = 0.8;
      // Play twice for attention
      audio.play();
      Timer(const Duration(milliseconds: 300), () => audio.play());
    } catch (_) {}
  }
}

/// Call Alert Banner — shows when you receive an alert
class CallAlertBanner extends StatefulWidget {
  final String fromName;
  final VoidCallback? onDismiss;
  final VoidCallback? onRespond;

  const CallAlertBanner({
    super.key,
    required this.fromName,
    this.onDismiss,
    this.onRespond,
  });

  @override
  State<CallAlertBanner> createState() => _CallAlertBannerState();
}

class _CallAlertBannerState extends State<CallAlertBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _animation = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _controller.forward();

    // Auto-dismiss after 10 seconds
    Timer(const Duration(seconds: 10), () {
      if (mounted) {
        _controller.reverse().then((_) => widget.onDismiss?.call());
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(0, -1),
        end: Offset.zero,
      ).animate(_animation),
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFF3B82F6),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF3B82F6).withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                CupertinoIcons.bell_fill,
                color: Colors.white,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '📻 ${widget.fromName} يطلبك',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'اضغط للرد على القناة',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            GestureDetector(
              onTap: widget.onRespond,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'رد',
                  style: TextStyle(
                    color: Color(0xFF3B82F6),
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
