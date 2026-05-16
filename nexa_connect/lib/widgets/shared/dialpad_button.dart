import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/cupertino.dart';

class DialpadButton extends StatefulWidget {
  final String title;
  final String? subtitle;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final bool isCallButton;

  const DialpadButton({
    super.key,
    required this.title,
    this.subtitle,
    required this.onTap,
    this.onLongPress,
    this.isCallButton = false,
  });

  @override
  State<DialpadButton> createState() => _DialpadButtonState();
}

class _DialpadButtonState extends State<DialpadButton> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOutCubic),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails details) {
    HapticFeedback.lightImpact();
    _controller.forward();
  }

  void _onTapUp(TapUpDetails details) {
    _controller.reverse();
    widget.onTap();
  }

  void _onTapCancel() {
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    final bool isDark = theme.brightness == Brightness.dark;
    final Color defaultBgColor = isDark ? const Color(0xFF333333) : const Color(0xFFE5E5EA).withOpacity(0.4);
    
    final Color bgColor = widget.isCallButton ? theme.colorScheme.primary : defaultBgColor;
    final Color fgColor = widget.isCallButton ? theme.colorScheme.onPrimary : theme.colorScheme.onSurface;

    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      onLongPress: () {
        HapticFeedback.mediumImpact();
        widget.onLongPress?.call();
      },
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: bgColor,
            shape: BoxShape.circle,
          ),
          child: Material(
            color: Colors.transparent,
            shape: const CircleBorder(),
            clipBehavior: Clip.hardEdge,
            child: InkWell(
              onTap: widget.onTap,
              splashColor: theme.colorScheme.primary.withOpacity(0.1),
              highlightColor: Colors.transparent,
              child: Center(
                child: widget.isCallButton
                    ? Icon(CupertinoIcons.phone_fill, color: fgColor, size: 36)
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            widget.title,
                            style: TextStyle(
                              color: fgColor,
                              fontSize: 36,
                              fontWeight: FontWeight.w400,
                              height: widget.subtitle != null && widget.subtitle!.isNotEmpty ? 1.0 : null,
                            ),
                          ),
                          if (widget.subtitle != null && widget.subtitle!.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 1),
                              child: Text(
                                widget.subtitle!,
                                style: TextStyle(
                                  color: isDark ? Colors.white70 : Colors.black87,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 2.0,
                                ),
                              ),
                            ),
                        ],
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
