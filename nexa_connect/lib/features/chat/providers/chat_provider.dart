import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/providers/supabase_provider.dart';
import '../../../core/config/env.dart';
import '../../calls/providers/call_history_provider.dart';

class ChatPreview {
  final String id;
  final String name;
  final String? lastMessage;
  final DateTime time;
  final int unreadCount;
  final bool isPinned;
  final bool isMuted;
  final bool isGroup;
  final bool isRead;
  final bool isSentByMe;

  ChatPreview({
    required this.id,
    required this.name,
    this.lastMessage,
    required this.time,
    this.unreadCount = 0,
    this.isPinned = false,
    this.isMuted = false,
    this.isGroup = false,
    this.isRead = false,
    this.isSentByMe = false,
  });
}

final chatProvider =
    NotifierProvider<ChatNotifier, List<ChatPreview>>(() => ChatNotifier());

class ChatNotifier extends Notifier<List<ChatPreview>> {
  @override
  List<ChatPreview> build() {
    _loadConversations();
    return [];
  }

  Future<void> _loadConversations() async {
    try {
      final client = ref.read(supabaseClientProvider);
      final userId = client.auth.currentUser?.id ?? Env.defaultUserId;
      final companyId = ref.read(companyIdProvider);

      if (userId.isEmpty || companyId.isEmpty) {
        debugPrint('[Chat] ⚠️ No user/company — showing empty chat list');
        return;
      }

      // Use RPC that bypasses RLS
      final data = await client.rpc('pbx_get_conversations', params: {
        'p_user_id': userId,
        'p_company_id': companyId,
      });

      final list = data as List<dynamic>? ?? [];
      final previews = list.map((conv) {
        final lastMsgAt = conv['last_message_at'] != null
            ? DateTime.parse(conv['last_message_at'])
            : DateTime.parse(conv['updated_at'] ?? DateTime.now().toIso8601String());

        return ChatPreview(
          id: conv['id'],
          name: conv['name'] ?? 'Chat',
          lastMessage: conv['last_message'],
          time: lastMsgAt,
          unreadCount: conv['unread_count'] ?? 0,
          isPinned: conv['is_pinned'] ?? false,
          isMuted: conv['is_muted'] ?? false,
          isGroup: conv['type'] == 'group',
          isSentByMe: conv['last_sender_id'] == userId,
          isRead: (conv['unread_count'] ?? 0) == 0,
        );
      }).toList();

      state = previews;
      debugPrint('[Chat] ✅ Loaded ${previews.length} conversations');
    } catch (e) {
      debugPrint('[Chat] ❌ Error: $e');
    }
  }

  void refresh() => _loadConversations();
}
