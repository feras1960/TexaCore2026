import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Animated floating filter bar — consistent across Recents, Contacts, Chats.
/// Positioned near the bottom tab bar for easy thumb access.
class FloatingFilterBar extends StatelessWidget {
  final List<String> filters;
  final String selected;
  final ValueChanged<String> onSelected;
  final List<IconData>? icons;
  final List<Color>? colors;

  const FloatingFilterBar({
    super.key,
    required this.filters,
    required this.selected,
    required this.onSelected,
    this.icons,
    this.colors,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF2C2C2E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(
          color: theme.colorScheme.outline.withOpacity(isDark ? 0.15 : 0.1),
          width: 0.5,
        ),
      ),
      child: Wrap(
        alignment: WrapAlignment.center,
        spacing: 4.0,
        runSpacing: 4.0,
        children: List.generate(filters.length, (i) {
          final isActive = filters[i] == selected;
          final color = (colors != null && i < colors!.length)
              ? colors![i]
              : theme.colorScheme.primary;
          final icon = (icons != null && i < icons!.length) ? icons![i] : null;

          return _AnimatedFilterChip(
            label: filters[i],
            icon: icon,
            color: color,
            isActive: isActive,
            onTap: () => onSelected(filters[i]),
          );
        }),
      ),
    );
  }
}

class _AnimatedFilterChip extends StatefulWidget {
  final String label;
  final IconData? icon;
  final Color color;
  final bool isActive;
  final VoidCallback onTap;

  const _AnimatedFilterChip({
    required this.label,
    this.icon,
    required this.color,
    required this.isActive,
    required this.onTap,
  });

  @override
  State<_AnimatedFilterChip> createState() => _AnimatedFilterChipState();
}

class _AnimatedFilterChipState extends State<_AnimatedFilterChip>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 120),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.92).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOutCubic),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) {
        HapticFeedback.selectionClick();
        _controller.forward();
        setState(() => _isPressed = true);
      },
      onTapUp: (_) {
        _controller.reverse();
        setState(() => _isPressed = false);
        widget.onTap();
      },
      onTapCancel: () {
        _controller.reverse();
        setState(() => _isPressed = false);
      },
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          margin: const EdgeInsets.symmetric(horizontal: 2),
          padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 12),
          decoration: BoxDecoration(
            color: widget.isActive
                ? widget.color.withOpacity(0.12)
                : _isPressed
                    ? widget.color.withOpacity(0.05)
                    : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (widget.icon != null) ...[
                Icon(
                  widget.icon,
                  size: 16,
                  color: widget.isActive
                      ? widget.color
                      : Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.5),
                ),
                const SizedBox(width: 5),
              ],
              Text(
                widget.label,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight:
                      widget.isActive ? FontWeight.w700 : FontWeight.w500,
                  color: widget.isActive
                      ? widget.color
                      : Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.6),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
