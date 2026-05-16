import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/chat_provider.dart';
import '../providers/selected_chat_provider.dart';
import '../screens/chat_conversation_screen.dart';
import '../../../core/utils/responsive.dart';

class ChatPreviewCard extends ConsumerWidget {
  final ChatPreview chat;

  const ChatPreviewCard({super.key, required this.chat});

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);
    if (diff.inDays > 1) {
      final d = time.day.toString().padLeft(2, '0');
      final m = time.month.toString().padLeft(2, '0');
      return '$d.$m.${time.year}';
    }
    if (diff.inDays == 1) return 'Yesterday';
    final h = time.hour.toString().padLeft(2, '0');
    final min = time.minute.toString().padLeft(2, '0');
    return '$h:$min';
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

    return InkWell(
      onTap: () {
        if (ResponsiveLayout.isMobile(context)) {
          Navigator.of(context).push(
            CupertinoPageRoute(
              builder: (_) => ChatConversationScreen(
                conversationId: chat.id,
                contactName: chat.name,
              ),
            ),
          );
        } else {
          // On Desktop/Tablet, update the selected chat for the detail view
          ref.read(selectedChatIdProvider.notifier).set(chat.id);
          ref.read(selectedChatNameProvider.notifier).set(chat.name);
        }
      },
      splashColor: Colors.transparent,
      highlightColor: theme.colorScheme.surfaceContainerHighest.withAlpha(80),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: _getAvatarGradient(chat.name),
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Center(
                child: chat.isGroup
                    ? const Icon(CupertinoIcons.person_3_fill, color: Colors.white, size: 26)
                    : Text(
                        chat.name.substring(0, 1).toUpperCase(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),
            const SizedBox(width: 14),

            // Text Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          chat.name,
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: theme.colorScheme.onSurface,
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _formatTime(chat.time),
                        style: TextStyle(
                          color: chat.unreadCount > 0
                              ? theme.colorScheme.primary
                              : const Color(0xFF8E8E93),
                          fontSize: 13,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      // Read receipt
                      if (chat.isSentByMe) ...[
                        Icon(
                          Icons.done_all_rounded,
                          size: 16,
                          color: chat.isRead
                              ? const Color(0xFF53BDEB)
                              : const Color(0xFF8E8E93),
                        ),
                        const SizedBox(width: 4),
                      ],
                      // Phone icon for voice calls
                      if (chat.lastMessage == 'Voice call' ||
                          chat.lastMessage == 'Missed voice call') ...[
                        Icon(
                          CupertinoIcons.phone_fill,
                          size: 14,
                          color: chat.lastMessage == 'Missed voice call'
                              ? const Color(0xFFFF3B30)
                              : const Color(0xFF8E8E93),
                        ),
                        const SizedBox(width: 4),
                      ],
                      // Message preview
                      Expanded(
                        child: Text(
                          chat.lastMessage ?? '',
                          style: const TextStyle(
                            color: Color(0xFF8E8E93),
                            fontSize: 15,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      // Mute icon
                      if (chat.isMuted) ...[
                        const SizedBox(width: 6),
                        const Icon(CupertinoIcons.speaker_slash_fill,
                            size: 14, color: Color(0xFFC7C7CC)),
                      ],
                      // Pin icon
                      if (chat.isPinned) ...[
                        const SizedBox(width: 6),
                        Transform.rotate(
                          angle: 0.7,
                          child: const Icon(CupertinoIcons.pin_fill,
                              size: 14, color: Color(0xFFC7C7CC)),
                        ),
                      ],
                      // Unread badge
                      if (chat.unreadCount > 0) ...[
                        const SizedBox(width: 8),
                        Container(
                          constraints: const BoxConstraints(minWidth: 20),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: chat.isMuted
                                ? const Color(0xFFC7C7CC)
                                : theme.colorScheme.primary,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            chat.unreadCount.toString(),
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
