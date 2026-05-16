import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

/// Premium message input — Nexa Connect style
/// Supports text, attachments, and hold-to-record voice messages
class MessageInputBar extends StatefulWidget {
  final TextEditingController controller;
  final VoidCallback onSend;
  final VoidCallback? onAttach;
  final Future<void> Function()? onVoiceStart;
  final Future<void> Function()? onVoiceStop;
  final Future<void> Function()? onVoiceCancel;
  final bool isRecording;
  final int recordingDuration;

  const MessageInputBar({
    super.key,
    required this.controller,
    required this.onSend,
    this.onAttach,
    this.onVoiceStart,
    this.onVoiceStop,
    this.onVoiceCancel,
    this.isRecording = false,
    this.recordingDuration = 0,
  });

  @override
  State<MessageInputBar> createState() => _MessageInputBarState();
}

class _MessageInputBarState extends State<MessageInputBar>
    with SingleTickerProviderStateMixin {
  bool _hasText = false;
  late AnimationController _animCtrl;
  late Animation<double> _sendScale;
  double _dragOffset = 0;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 200));
    _sendScale = Tween<double>(begin: 0.6, end: 1.0)
        .animate(CurvedAnimation(parent: _animCtrl, curve: Curves.elasticOut));

    widget.controller.addListener(() {
      final has = widget.controller.text.trim().isNotEmpty;
      if (has != _hasText) {
        setState(() => _hasText = has);
        if (has) {
          _animCtrl.forward();
        } else {
          _animCtrl.reverse();
        }
      }
    });
  }

  @override
  void dispose() {
    _animCtrl.dispose();
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
    final barBg = isDark ? const Color(0xFF1A1A1A) : Colors.white;
    final fieldBg = isDark ? const Color(0xFF262626) : const Color(0xFFF2F2F7);

    // Recording mode
    if (widget.isRecording) {
      return Container(
        decoration: BoxDecoration(
          color: barBg,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.2 : 0.05),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        padding: EdgeInsets.fromLTRB(
            16, 12, 10, MediaQuery.of(context).padding.bottom + 12),
        child: Row(
          children: [
            // Recording indicator
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFFF3B30),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFFF3B30).withOpacity(0.5),
                    blurRadius: 8,
                    spreadRadius: 2,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),

            // Duration
            Text(
              _formatDuration(widget.recordingDuration),
              style: TextStyle(
                color: theme.colorScheme.onSurface,
                fontSize: 16,
                fontWeight: FontWeight.w600,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),

            const Spacer(),

            // Slide to cancel hint
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(CupertinoIcons.chevron_left,
                    color: theme.colorScheme.onSurface.withOpacity(0.3),
                    size: 14),
                const SizedBox(width: 4),
                Text('Slide to cancel',
                    style: TextStyle(
                        color: theme.colorScheme.onSurface.withOpacity(0.3),
                        fontSize: 13)),
              ],
            ),

            const Spacer(),

            // Stop button
            GestureDetector(
              onTap: widget.onVoiceStop,
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [
                      theme.colorScheme.primary,
                      theme.colorScheme.primary.withOpacity(0.75),
                    ],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: theme.colorScheme.primary.withOpacity(0.3),
                      blurRadius: 10,
                    ),
                  ],
                ),
                child: const Icon(Icons.send_rounded,
                    color: Colors.white, size: 20),
              ),
            ),
          ],
        ),
      );
    }

    // Normal mode
    return Container(
      decoration: BoxDecoration(
        color: barBg,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      padding: EdgeInsets.fromLTRB(
          10, 8, 10, MediaQuery.of(context).padding.bottom + 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Input field
          Expanded(
            child: Container(
              constraints: const BoxConstraints(maxHeight: 120),
              decoration: BoxDecoration(
                color: fieldBg,
                borderRadius: BorderRadius.circular(22),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Emoji
                  Padding(
                    padding: const EdgeInsets.only(left: 6, bottom: 6),
                    child: IconButton(
                      icon: Icon(CupertinoIcons.smiley,
                          color: theme.colorScheme.onSurface.withOpacity(0.4),
                          size: 24),
                      onPressed: () {},
                      constraints:
                          const BoxConstraints(minWidth: 32, minHeight: 32),
                      padding: EdgeInsets.zero,
                    ),
                  ),

                  // Text
                  Expanded(
                    child: TextField(
                      controller: widget.controller,
                      maxLines: 5,
                      minLines: 1,
                      textInputAction: TextInputAction.newline,
                      style: TextStyle(
                        fontSize: 16,
                        color: theme.colorScheme.onSurface,
                        height: 1.4,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Message...',
                        hintStyle: TextStyle(
                          color:
                              theme.colorScheme.onSurface.withOpacity(0.35),
                          fontSize: 16,
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 0, vertical: 10),
                      ),
                    ),
                  ),

                  // Attachment
                  if (!_hasText)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: IconButton(
                        icon: Icon(CupertinoIcons.plus_circle,
                            color: theme.colorScheme.primary.withOpacity(0.6),
                            size: 24),
                        onPressed: widget.onAttach,
                        constraints: const BoxConstraints(
                            minWidth: 32, minHeight: 32),
                        padding: EdgeInsets.zero,
                      ),
                    ),

                  if (_hasText) const SizedBox(width: 4),
                ],
              ),
            ),
          ),

          const SizedBox(width: 8),

          // Send / Voice
          GestureDetector(
            onLongPressStart: !_hasText && widget.onVoiceStart != null
                ? (_) => widget.onVoiceStart?.call()
                : null,
            onLongPressEnd: !_hasText && widget.onVoiceStop != null
                ? (_) => widget.onVoiceStop?.call()
                : null,
            child: ScaleTransition(
              scale: _hasText
                  ? _sendScale
                  : const AlwaysStoppedAnimation(1.0),
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: _hasText
                      ? LinearGradient(
                          colors: [
                            theme.colorScheme.primary,
                            theme.colorScheme.primary.withOpacity(0.75),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        )
                      : null,
                  color: _hasText
                      ? null
                      : theme.colorScheme.primary.withOpacity(0.08),
                  boxShadow: _hasText
                      ? [
                          BoxShadow(
                            color: theme.colorScheme.primary.withOpacity(0.3),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ]
                      : null,
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(24),
                    onTap: _hasText ? widget.onSend : null,
                    child: Center(
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 200),
                        transitionBuilder: (child, anim) =>
                            ScaleTransition(scale: anim, child: child),
                        child: _hasText
                            ? const Icon(Icons.send_rounded,
                                key: ValueKey('send'),
                                color: Colors.white,
                                size: 20)
                            : Icon(CupertinoIcons.mic,
                                key: const ValueKey('mic'),
                                color: theme.colorScheme.primary,
                                size: 22),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
