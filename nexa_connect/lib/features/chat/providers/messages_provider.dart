import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// ignore: depend_on_referenced_packages
import 'package:flutter_riverpod/legacy.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/providers/supabase_provider.dart';
import '../../../core/config/env.dart';
import '../models/message.dart';

/// Messages for a specific conversation
final messagesProvider = ChangeNotifierProvider.family<MessagesController, String>(
    (ref, conversationId) {
  final client = ref.read(supabaseClientProvider);
  final userId = client.auth.currentUser?.id ?? Env.defaultUserId;
  final controller = MessagesController(client, conversationId, userId);
  controller.load();
  ref.onDispose(() => controller.dispose());
  return controller;
});

class MessagesController extends ChangeNotifier {
  final SupabaseClient _client;
  final String conversationId;
  final String userId;

  List<ChatMessage> messages = [];
  bool isLoading = true;
  RealtimeChannel? _subscription;

  MessagesController(this._client, this.conversationId, this.userId);

  Future<void> load() async {
    try {
      final data = await _client.rpc('pbx_get_messages', params: {
        'p_conversation_id': conversationId,
        'p_limit': 100,
      });

      final list = data as List<dynamic>? ?? [];
      messages = list.map((json) {
        return ChatMessage.fromJson(json as Map<String, dynamic>,
            currentUserId: userId);
      }).toList();

      isLoading = false;
      notifyListeners();
      debugPrint('[Messages] ✅ Loaded ${messages.length} messages');

      _subscribeToRealtime();
    } catch (e) {
      isLoading = false;
      notifyListeners();
      debugPrint('[Messages] ❌ Error: $e');
    }
  }

  void _subscribeToRealtime() {
    _subscription = _client
        .channel('messages_$conversationId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'nexa_messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'conversation_id',
            value: conversationId,
          ),
          callback: (payload) {
            final newMsg = ChatMessage.fromJson(
              payload.newRecord,
              currentUserId: userId,
            );
            if (!messages.any((m) => m.id == newMsg.id)) {
              messages = [...messages, newMsg];
              notifyListeners();
              debugPrint('[Messages] 📨 Realtime: ${newMsg.content}');
            }
          },
        )
        .subscribe();
  }

  Future<void> sendMessage(String content,
      {MessageType type = MessageType.text,
      String? mediaUrl,
      Map<String, dynamic>? mediaMetadata,
      String? replyToId}) async {
    if (content.trim().isEmpty && mediaUrl == null) return;

    try {
      final params = <String, dynamic>{
        'p_conversation_id': conversationId,
        'p_sender_id': userId,
        'p_content': content.trim(),
        'p_type': type.name,
      };
      if (mediaUrl != null) params['p_media_url'] = mediaUrl;
      if (mediaMetadata != null) params['p_media_metadata'] = mediaMetadata;
      if (replyToId != null) params['p_reply_to_id'] = replyToId;

      await _client.rpc('pbx_send_message', params: params);
      debugPrint('[Messages] ✅ Sent: ${type.name} — $content');
    } catch (e) {
      debugPrint('[Messages] ❌ Send error: $e');
    }
  }

  Future<void> markAsRead() async {
    try {
      await _client
          .from('nexa_conversation_members')
          .update({'last_read_at': DateTime.now().toUtc().toIso8601String()})
          .eq('conversation_id', conversationId)
          .eq('user_id', userId);
    } catch (e) {
      debugPrint('[Messages] ⚠️ Mark read error: $e');
    }
  }

  @override
  void dispose() {
    _subscription?.unsubscribe();
    super.dispose();
  }
}
