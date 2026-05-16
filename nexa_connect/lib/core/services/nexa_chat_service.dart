import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Nexa Connect Chat Service — realtime messaging with Supabase
class NexaChatService {
  final SupabaseClient _client;
  final String _companyId;
  final String _userId;

  NexaChatService(this._client, this._companyId, this._userId);

  // ===== CONVERSATIONS =====

  /// Get all conversations for current user
  Future<List<Map<String, dynamic>>> getConversations() async {
    try {
      final memberships = await _client
          .from('nexa_conversation_members')
          .select('conversation_id, is_pinned, is_muted, last_read_at')
          .eq('user_id', _userId);

      if (memberships.isEmpty) return [];

      final conversationIds = (memberships as List)
          .map((m) => m['conversation_id'] as String)
          .toList();

      final conversations = await _client
          .from('nexa_conversations')
          .select('*, nexa_conversation_members(*)')
          .inFilter('id', conversationIds)
          .order('updated_at', ascending: false);

      // Merge membership data
      for (var conv in conversations) {
        final membership = memberships.firstWhere(
          (m) => m['conversation_id'] == conv['id'],
          orElse: () => {},
        );
        conv['is_pinned'] = membership['is_pinned'] ?? false;
        conv['is_muted'] = membership['is_muted'] ?? false;
        conv['last_read_at'] = membership['last_read_at'];
      }

      return List<Map<String, dynamic>>.from(conversations);
    } catch (e) {
      debugPrint('[NexaChat] ❌ Error loading conversations: $e');
      return [];
    }
  }

  /// Create a direct conversation with another user
  Future<String?> createDirectConversation(String otherUserId) async {
    try {
      // Check if conversation already exists
      final existing = await _client.rpc('find_direct_conversation', params: {
        'user_a': _userId,
        'user_b': otherUserId,
      });

      if (existing != null && existing.isNotEmpty) {
        return existing[0]['conversation_id'];
      }

      // Create new conversation
      final conv = await _client.from('nexa_conversations').insert({
        'company_id': _companyId,
        'type': 'direct',
        'created_by': _userId,
      }).select('id').single();

      final convId = conv['id'] as String;

      // Add both members
      await _client.from('nexa_conversation_members').insert([
        {'conversation_id': convId, 'user_id': _userId, 'role': 'admin'},
        {
          'conversation_id': convId,
          'user_id': otherUserId,
          'role': 'member'
        },
      ]);

      debugPrint('[NexaChat] ✅ Created conversation: $convId');
      return convId;
    } catch (e) {
      debugPrint('[NexaChat] ❌ Error creating conversation: $e');
      return null;
    }
  }

  // ===== MESSAGES =====

  /// Get messages for a conversation
  Future<List<Map<String, dynamic>>> getMessages(String conversationId,
      {int limit = 50, int offset = 0}) async {
    try {
      final messages = await _client
          .from('nexa_messages')
          .select()
          .eq('conversation_id', conversationId)
          .eq('is_deleted', false)
          .order('created_at', ascending: false)
          .range(offset, offset + limit - 1);

      return List<Map<String, dynamic>>.from(messages);
    } catch (e) {
      debugPrint('[NexaChat] ❌ Error loading messages: $e');
      return [];
    }
  }

  /// Send a text message
  Future<Map<String, dynamic>?> sendMessage({
    required String conversationId,
    required String content,
    String type = 'text',
    String? mediaUrl,
    Map<String, dynamic>? mediaMetadata,
    String? replyToId,
  }) async {
    try {
      final message = await _client.from('nexa_messages').insert({
        'conversation_id': conversationId,
        'sender_id': _userId,
        'content': content,
        'type': type,
        'media_url': mediaUrl,
        'media_metadata': mediaMetadata,
        'reply_to_id': replyToId,
      }).select().single();

      // Update conversation timestamp
      await _client.from('nexa_conversations').update({
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      }).eq('id', conversationId);

      debugPrint('[NexaChat] ✅ Sent message to $conversationId');
      return message;
    } catch (e) {
      debugPrint('[NexaChat] ❌ Error sending message: $e');
      return null;
    }
  }

  /// Mark messages as read
  Future<void> markAsRead(String conversationId) async {
    try {
      await _client
          .from('nexa_conversation_members')
          .update({'last_read_at': DateTime.now().toUtc().toIso8601String()})
          .eq('conversation_id', conversationId)
          .eq('user_id', _userId);
    } catch (e) {
      debugPrint('[NexaChat] ⚠️ Error marking as read: $e');
    }
  }

  // ===== REALTIME =====

  /// Subscribe to new messages in a conversation
  RealtimeChannel subscribeToMessages(
    String conversationId,
    void Function(Map<String, dynamic> message) onNewMessage,
  ) {
    return _client
        .channel('nexa_msgs_$conversationId')
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
            debugPrint('[NexaChat] 🔔 New message in $conversationId');
            onNewMessage(payload.newRecord);
          },
        )
        .subscribe();
  }

  /// Subscribe to all conversation updates (for chat list)
  RealtimeChannel subscribeToConversationUpdates(
    void Function() onUpdate,
  ) {
    return _client
        .channel('nexa_conv_updates')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'nexa_messages',
          callback: (payload) {
            debugPrint('[NexaChat] 🔔 Conversation update');
            onUpdate();
          },
        )
        .subscribe();
  }
}
