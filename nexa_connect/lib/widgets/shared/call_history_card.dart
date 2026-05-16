import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/call_log.dart';

class CallHistoryCard extends ConsumerWidget {
  final CallLog log;
  final VoidCallback onCall;
  final VoidCallback? onInfoTap;

  const CallHistoryCard({
    super.key,
    required this.log,
    required this.onCall,
    this.onInfoTap,
  });

  Widget _getDirectionIcon(CallDirection direction, ThemeData theme) {
    switch (direction) {
      case CallDirection.incoming:
        return const Icon(CupertinoIcons.phone_arrow_down_left, color: Color(0xFF8E8E93), size: 14);
      case CallDirection.outgoing:
        return const Icon(CupertinoIcons.phone_arrow_up_right, color: Color(0xFF8E8E93), size: 14);
      case CallDirection.missed:
        return const Icon(CupertinoIcons.phone_arrow_down_left, color: Color(0xFFFF3B30), size: 14);
    }
  }

  String _getDirectionText(CallDirection direction) {
    switch (direction) {
      case CallDirection.incoming:
        return 'Incoming';
      case CallDirection.outgoing:
        return 'Outgoing';
      case CallDirection.missed:
        return 'Missed';
    }
  }

  String _formatTime(DateTime time) {
    return "${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}";
  }

  List<Color> _getAvatarGradient(String name) {
    final colors = [
      [const Color(0xFF6366F1), const Color(0xFF8B5CF6)],
      [const Color(0xFF14B8A6), const Color(0xFF0EA5E9)],
      [const Color(0xFFF59E0B), const Color(0xFFEF4444)],
      [const Color(0xFF10B981), const Color(0xFF3B82F6)],
      [const Color(0xFFEC4899), const Color(0xFF8B5CF6)],
    ];
    final index = name.codeUnits.fold<int>(0, (p, c) => p + c) % colors.length;
    return colors[index];
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isMissed = log.direction == CallDirection.missed;
    final displayName = log.name ?? log.number;

    return InkWell(
      onTap: onCall,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: log.name == null ? const Color(0xFF8E8E93).withOpacity(0.2) : null,
                gradient: log.name != null ? LinearGradient(
                  colors: _getAvatarGradient(displayName),
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ) : null,
              ),
              child: Center(
                child: log.name == null
                    ? Icon(CupertinoIcons.phone_fill, color: theme.colorScheme.onSurface.withOpacity(0.5), size: 20)
                    : Text(
                        displayName.substring(0, 1).toUpperCase(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
              ),
            ),
            const SizedBox(width: 12),
            
            // Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    displayName,
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: isMissed ? const Color(0xFFFF3B30) : theme.colorScheme.onSurface,
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      _getDirectionIcon(log.direction, theme),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '${_getDirectionText(log.direction)}${log.name != null ? ' • ${log.number}' : ''}',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: const Color(0xFF8E8E93),
                            fontSize: 13,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            // Time & Info Action
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _formatTime(log.timestamp),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF8E8E93),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: onInfoTap,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    child: Icon(
                      CupertinoIcons.info_circle, 
                      color: theme.colorScheme.primary,
                      size: 22,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
