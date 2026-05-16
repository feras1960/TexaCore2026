enum MessageType { text, image, audio, video, document, location, contact, system }

class ChatMessage {
  final String id;
  final String conversationId;
  final String senderId;
  final String? senderName;
  final String? content;
  final MessageType type;
  final String? mediaUrl;
  final Map<String, dynamic>? mediaMetadata;
  final String? replyToId;
  final ChatMessage? replyTo;
  final bool isEdited;
  final bool isDeleted;
  final DateTime createdAt;
  final bool isMine;

  ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    this.senderName,
    this.content,
    this.type = MessageType.text,
    this.mediaUrl,
    this.mediaMetadata,
    this.replyToId,
    this.replyTo,
    this.isEdited = false,
    this.isDeleted = false,
    required this.createdAt,
    this.isMine = false,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json, {String? currentUserId}) {
    return ChatMessage(
      id: json['id'],
      conversationId: json['conversation_id'],
      senderId: json['sender_id'],
      senderName: json['sender_name'],
      content: json['content'],
      type: _parseType(json['type']),
      mediaUrl: json['media_url'],
      mediaMetadata: json['media_metadata'],
      replyToId: json['reply_to_id'],
      isEdited: json['is_edited'] ?? false,
      isDeleted: json['is_deleted'] ?? false,
      createdAt: DateTime.parse(json['created_at']),
      isMine: json['sender_id'] == currentUserId,
    );
  }

  static MessageType _parseType(String? type) {
    switch (type) {
      case 'image': return MessageType.image;
      case 'audio': return MessageType.audio;
      case 'video': return MessageType.video;
      case 'document': return MessageType.document;
      case 'location': return MessageType.location;
      case 'contact': return MessageType.contact;
      case 'system': return MessageType.system;
      default: return MessageType.text;
    }
  }
}
