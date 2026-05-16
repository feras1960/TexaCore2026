import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../calls/providers/sip_provider.dart';
import '../../../core/services/sip_service.dart';

class ActiveCallScreen extends ConsumerStatefulWidget {
  const ActiveCallScreen({super.key});

  @override
  ConsumerState<ActiveCallScreen> createState() => _ActiveCallScreenState();
}

class _ActiveCallScreenState extends ConsumerState<ActiveCallScreen>
    with SingleTickerProviderStateMixin {
  Timer? _timer;
  int _elapsed = 0;
  late AnimationController _pulseCtrl;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _elapsed++);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseCtrl.dispose();
    super.dispose();
  }

  String get _durationText {
    final m = (_elapsed ~/ 60).toString().padLeft(2, '0');
    final s = (_elapsed % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final sip = ref.watch(sipServiceProvider);
    final call = sip.activeCall;
    final state = sip.callState;

    if (call == null || state == NexaCallState.idle) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (Navigator.of(context).canPop()) Navigator.of(context).pop();
      });
      return const SizedBox.shrink();
    }

    final isConnecting = state == NexaCallState.connecting ||
        state == NexaCallState.ringing;
    final isIncoming = call.direction == CallDirection.inbound &&
        state == NexaCallState.ringing;

    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              const Color(0xFF0D1B2A),
              const Color(0xFF1B2838),
              const Color(0xFF0D1B2A),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              const SizedBox(height: 40),

              // ─── Status ───
              Text(
                isIncoming
                    ? 'Incoming Call'
                    : isConnecting
                        ? 'Calling...'
                        : _durationText,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.6),
                  fontSize: isConnecting ? 16 : 20,
                  fontWeight: FontWeight.w500,
                  letterSpacing: isConnecting ? 0 : 2,
                ),
              ),

              const SizedBox(height: 32),

              // ─── Avatar with pulse ───
              AnimatedBuilder(
                animation: _pulseCtrl,
                builder: (context, child) {
                  final scale = isConnecting
                      ? 1.0 + (_pulseCtrl.value * 0.08)
                      : 1.0;
                  return Transform.scale(
                    scale: scale,
                    child: child,
                  );
                },
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFF25D366).withOpacity(0.3),
                        const Color(0xFF25D366).withOpacity(0.1),
                      ],
                    ),
                    border: Border.all(
                      color: const Color(0xFF25D366).withOpacity(0.4),
                      width: 2,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF25D366).withOpacity(0.15),
                        blurRadius: 30,
                        spreadRadius: 5,
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      _getInitials(call.remoteNumber),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 40,
                        fontWeight: FontWeight.w300,
                      ),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // ─── Number ───
              Text(
                call.remoteNumber,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1,
                ),
              ),

              const SizedBox(height: 8),

              // Direction label
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    call.direction == CallDirection.outbound
                        ? CupertinoIcons.phone_arrow_up_right
                        : CupertinoIcons.phone_arrow_down_left,
                    color: Colors.white38,
                    size: 16,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    call.direction == CallDirection.outbound
                        ? 'Outgoing'
                        : 'Incoming',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.4),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),

              const Spacer(),

              // ─── Call Controls ───
              if (isIncoming)
                _buildIncomingControls(sip)
              else
                _buildActiveControls(sip),

              const SizedBox(height: 50),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActiveControls(SipService sip) {
    return Column(
      children: [
        // Row 1: Mute, Speaker, Keypad
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _controlButton(
              icon: sip.isMuted
                  ? CupertinoIcons.mic_slash_fill
                  : CupertinoIcons.mic,
              label: sip.isMuted ? 'Unmute' : 'Mute',
              isActive: sip.isMuted,
              onTap: () => sip.toggleMute(),
            ),
            _controlButton(
              icon: CupertinoIcons.speaker_2,
              label: 'Speaker',
              onTap: () {},
            ),
            _controlButton(
              icon: Icons.dialpad_rounded,
              label: 'Keypad',
              onTap: () {},
            ),
          ],
        ),
        const SizedBox(height: 24),
        // Row 2: Hold, Record, Add
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _controlButton(
              icon: sip.isOnHold
                  ? CupertinoIcons.play_fill
                  : CupertinoIcons.pause,
              label: sip.isOnHold ? 'Resume' : 'Hold',
              isActive: sip.isOnHold,
              onTap: () => sip.toggleHold(),
            ),
            _controlButton(
              icon: CupertinoIcons.circle_fill,
              label: 'Record',
              onTap: () {},
            ),
            _controlButton(
              icon: CupertinoIcons.person_add,
              label: 'Add',
              onTap: () {},
            ),
          ],
        ),
        const SizedBox(height: 40),
        // End call button
        _endCallButton(sip),
      ],
    );
  }

  Widget _buildIncomingControls(SipService sip) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        // Decline
        GestureDetector(
          onTap: () => sip.hangup(),
          child: Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFFFF3B30),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFFF3B30).withOpacity(0.4),
                  blurRadius: 20,
                ),
              ],
            ),
            child: const Icon(Icons.call_end_rounded,
                color: Colors.white, size: 32),
          ),
        ),
        // Accept
        GestureDetector(
          onTap: () => sip.answerCall(),
          child: Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF34C759),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF34C759).withOpacity(0.4),
                  blurRadius: 20,
                ),
              ],
            ),
            child: const Icon(CupertinoIcons.phone,
                color: Colors.white, size: 32),
          ),
        ),
      ],
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
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isActive
                  ? Colors.white.withOpacity(0.2)
                  : Colors.white.withOpacity(0.08),
              border: Border.all(
                color: Colors.white.withOpacity(isActive ? 0.4 : 0.1),
                width: 1,
              ),
            ),
            child: Icon(icon, color: Colors.white, size: 24),
          ),
          const SizedBox(height: 8),
          Text(label,
              style: TextStyle(
                  color: Colors.white.withOpacity(0.6), fontSize: 12)),
        ],
      ),
    );
  }

  Widget _endCallButton(SipService sip) {
    return GestureDetector(
      onTap: () => sip.hangup(),
      child: Container(
        width: 68,
        height: 68,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const LinearGradient(
            colors: [Color(0xFFFF3B30), Color(0xFFFF2D55)],
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFFF3B30).withOpacity(0.4),
              blurRadius: 20,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: const Icon(Icons.call_end_rounded,
            color: Colors.white, size: 32),
      ),
    );
  }

  String _getInitials(String number) {
    if (number.length <= 3) return number;
    return number.substring(0, 2);
  }
}
