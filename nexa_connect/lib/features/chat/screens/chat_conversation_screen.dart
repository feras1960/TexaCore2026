import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/message.dart';
import '../providers/messages_provider.dart';
import '../widgets/message_bubble.dart';
import '../widgets/message_input_bar.dart';
import '../widgets/attachment_picker.dart';
import '../../../core/services/chat_media_service.dart';
import '../../../core/services/voice_recorder_service.dart';
import '../../../core/providers/supabase_provider.dart';

class ChatConversationScreen extends ConsumerStatefulWidget {
  final String conversationId;
  final String contactName;
  final String? contactNumber;

  const ChatConversationScreen({
    super.key,
    required this.conversationId,
    required this.contactName,
    this.contactNumber,
  });

  @override
  ConsumerState<ChatConversationScreen> createState() =>
      _ChatConversationScreenState();
}

class _ChatConversationScreenState
    extends ConsumerState<ChatConversationScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _textController = TextEditingController();
  ChatMessage? _replyingTo;
  bool _isUploading = false;
  bool _isRecording = false;
  int _recordingDuration = 0;

  late final ChatMediaService _mediaService;
  final VoiceRecorderService _voiceRecorder = VoiceRecorderService();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _mediaService = ChatMediaService(ref.read(supabaseClientProvider));
      ref.read(messagesProvider(widget.conversationId)).markAsRead();
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _textController.dispose();
    _voiceRecorder.dispose();
    super.dispose();
  }

  void _scrollToBottom({bool animated = true}) {
    if (_scrollController.hasClients) {
      final target = _scrollController.position.maxScrollExtent;
      if (animated) {
        _scrollController.animateTo(target,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutCubic);
      } else {
        _scrollController.jumpTo(target);
      }
    }
  }

  void _sendMessage() {
    final text = _textController.text.trim();
    if (text.isEmpty) return;
    ref.read(messagesProvider(widget.conversationId)).sendMessage(text);
    _textController.clear();
    setState(() => _replyingTo = null);
    Future.delayed(const Duration(milliseconds: 150), () => _scrollToBottom());
  }

  Future<void> _sendMediaMessage({
    required bool fromCamera,
    bool isDocument = false,
  }) async {
    setState(() => _isUploading = true);

    try {
      final attachment = isDocument
          ? await _mediaService.pickDocument()
          : await _mediaService.pickImage(fromCamera: fromCamera);

      if (attachment == null) {
        setState(() => _isUploading = false);
        return;
      }

      final url = await _mediaService.upload(
        attachment,
        conversationId: widget.conversationId,
      );

      if (url != null) {
        final msgType =
            isDocument ? MessageType.document : MessageType.image;
        final controller =
            ref.read(messagesProvider(widget.conversationId));
        await controller.sendMessage(
          attachment.originalName,
          type: msgType,
          mediaUrl: url,
          mediaMetadata: {
            'file_name': attachment.originalName,
            'file_size': attachment.size,
            'mime_type': attachment.mimeType,
          },
        );
        Future.delayed(
            const Duration(milliseconds: 150), () => _scrollToBottom());
      }
    } catch (e) {
      debugPrint('[Chat] ❌ Media send error: $e');
    }

    setState(() => _isUploading = false);
  }

  void _showAttachments() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => AttachmentPicker(
        onCamera: () => _sendMediaMessage(fromCamera: true),
        onGallery: () => _sendMediaMessage(fromCamera: false),
        onDocument: () => _sendMediaMessage(fromCamera: false, isDocument: true),
        onLocation: () {}, // TODO: location sharing
        onContact: () {}, // TODO: contact sharing
        onMeeting: () {}, // TODO: meeting creation
      ),
    );
  }

  Future<void> _startVoiceRecording() async {
    final started = await _voiceRecorder.startRecording();
    if (started) {
      setState(() => _isRecording = true);
      _voiceRecorder.duration.addListener(_onDurationChanged);
    }
  }

  void _onDurationChanged() {
    setState(() => _recordingDuration = _voiceRecorder.duration.value);
  }

  Future<void> _stopVoiceRecording() async {
    _voiceRecorder.duration.removeListener(_onDurationChanged);
    setState(() {
      _isRecording = false;
      _isUploading = true;
    });

    final audio = await _voiceRecorder.stopRecording();
    if (audio != null && audio.durationMs > 500) {
      // Upload audio file
      final attachment = MediaAttachment(
        fileName: 'voice_${DateTime.now().millisecondsSinceEpoch}.webm',
        bytes: audio.bytes ?? Uint8List(0),
        mimeType: 'audio/webm',
        type: AttachmentType.audio,
        originalName: 'Voice Message',
        size: audio.bytes?.length ?? 0,
      );

      final url = await _mediaService.upload(
        attachment,
        conversationId: widget.conversationId,
      );

      if (url != null) {
        await ref.read(messagesProvider(widget.conversationId)).sendMessage(
              '🎙️ Voice message (${audio.durationFormatted})',
              type: MessageType.audio,
              mediaUrl: url,
              mediaMetadata: {
                'duration_ms': audio.durationMs,
                'duration_formatted': audio.durationFormatted,
              },
            );
        Future.delayed(
            const Duration(milliseconds: 150), () => _scrollToBottom());
      }
    }

    setState(() => _isUploading = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final controller = ref.watch(messagesProvider(widget.conversationId));
    final messages = controller.messages;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (messages.isNotEmpty) _scrollToBottom(animated: false);
    });

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF111111) : const Color(0xFFF5F5F7),
      body: Column(
        children: [
          // ─── Premium App Bar ───
          _buildGlassAppBar(theme, isDark),

          // ─── Messages ───
          Expanded(
            child: controller.isLoading
                ? const Center(child: CupertinoActivityIndicator())
                : messages.isEmpty
                    ? _buildEmptyState(theme, isDark)
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                        itemCount: messages.length,
                        itemBuilder: (context, index) {
                          final msg = messages[index];
                          final prevMsg =
                              index > 0 ? messages[index - 1] : null;
                          final showDate = prevMsg == null ||
                              !_isSameDay(prevMsg.createdAt, msg.createdAt);
                          // Grouping: same sender → tighter spacing
                          final isSameSender = prevMsg != null &&
                              prevMsg.senderId == msg.senderId &&
                              !showDate;

                          return Column(
                            children: [
                              if (showDate)
                                _buildDateChip(msg.createdAt, theme, isDark),
                              MessageBubble(
                                message: msg,
                                onReply: () =>
                                    setState(() => _replyingTo = msg),
                                isGrouped: isSameSender,
                              ),
                            ],
                          );
                        },
                      ),
          ),

          // ─── Reply Bar ───
          if (_replyingTo != null) _buildReplyBar(theme, isDark),

          // ─── Upload Indicator ───
          if (_isUploading)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CupertinoActivityIndicator(radius: 8),
                  const SizedBox(width: 8),
                  Text('Uploading...',
                      style: TextStyle(
                          color: theme.colorScheme.primary, fontSize: 13)),
                ],
              ),
            ),

          // ─── Input ───
          MessageInputBar(
            controller: _textController,
            onSend: _sendMessage,
            onAttach: _showAttachments,
            onVoiceStart: _startVoiceRecording,
            onVoiceStop: _stopVoiceRecording,
            isRecording: _isRecording,
            recordingDuration: _recordingDuration,
          ),
        ],
      ),
    );
  }

  // ══════════════════════════════════════════
  //  Glass App Bar
  // ══════════════════════════════════════════
  Widget _buildGlassAppBar(ThemeData theme, bool isDark) {
    final initials = widget.contactName
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0].toUpperCase() : '')
        .join();

    final bgColor = isDark ? const Color(0xFF1A1A1A) : Colors.white;

    return Container(
      decoration: BoxDecoration(
        color: bgColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.06),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(4, 8, 8, 12),
          child: Row(
            children: [
              // Back
              IconButton(
                icon: Icon(CupertinoIcons.back,
                    color: theme.colorScheme.primary, size: 26),
                onPressed: () => Navigator.of(context).pop(),
              ),

              // Avatar with gradient ring
              Container(
                width: 42,
                height: 42,
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [
                      theme.colorScheme.primary,
                      theme.colorScheme.primary.withOpacity(0.5),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isDark ? const Color(0xFF2A2A2A) : Colors.white,
                  ),
                  child: Center(
                    child: Text(initials,
                        style: TextStyle(
                            color: theme.colorScheme.primary,
                            fontWeight: FontWeight.w700,
                            fontSize: 15)),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Name + status
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.contactName,
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          color: theme.colorScheme.onSurface,
                        ),
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 1),
                    Row(
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Color(0xFF34C759),
                          ),
                        ),
                        const SizedBox(width: 5),
                        Text('Online',
                            style: TextStyle(
                                fontSize: 12,
                                color: theme.colorScheme.onSurface
                                    .withOpacity(0.5))),
                      ],
                    ),
                  ],
                ),
              ),

              // Action buttons
              _actionButton(CupertinoIcons.phone, theme),
              _actionButton(CupertinoIcons.video_camera, theme),
            ],
          ),
        ),
      ),
    );
  }

  Widget _actionButton(IconData icon, ThemeData theme) {
    return Container(
      margin: const EdgeInsets.only(left: 4),
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: theme.colorScheme.primary.withOpacity(0.08),
      ),
      child: Icon(icon, color: theme.colorScheme.primary, size: 20),
    );
  }

  // ══════════════════════════════════════════
  //  Empty State
  // ══════════════════════════════════════════
  Widget _buildEmptyState(ThemeData theme, bool isDark) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Animated gradient icon
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [
                  theme.colorScheme.primary.withOpacity(0.1),
                  theme.colorScheme.primary.withOpacity(0.05),
                ],
              ),
            ),
            child: Icon(CupertinoIcons.chat_bubble_2,
                size: 36,
                color: theme.colorScheme.primary.withOpacity(0.4)),
          ),
          const SizedBox(height: 20),
          Text('Say hello 👋',
              style: TextStyle(
                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                  fontSize: 18,
                  fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          Text('Messages are secured within your organization',
              style: TextStyle(
                  color: theme.colorScheme.onSurface.withOpacity(0.3),
                  fontSize: 13)),
        ],
      ),
    );
  }

  // ══════════════════════════════════════════
  //  Date Chip
  // ══════════════════════════════════════════
  Widget _buildDateChip(DateTime date, ThemeData theme, bool isDark) {
    final now = DateTime.now();
    final diff = now.difference(date);
    String label;
    if (diff.inDays == 0) {
      label = 'Today';
    } else if (diff.inDays == 1) {
      label = 'Yesterday';
    } else {
      label =
          '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
    }

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 14),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.08)
            : Colors.black.withOpacity(0.04),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: theme.colorScheme.onSurface.withOpacity(0.5),
            letterSpacing: 0.3,
          )),
    );
  }

  // ══════════════════════════════════════════
  //  Reply Bar
  // ══════════════════════════════════════════
  Widget _buildReplyBar(ThemeData theme, bool isDark) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 8, 10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1A1A) : Colors.white,
        border: Border(
          top: BorderSide(
              color: theme.colorScheme.primary.withOpacity(0.15), width: 1),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 3,
            height: 36,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_replyingTo!.isMine ? 'You' : widget.contactName,
                    style: TextStyle(
                        color: theme.colorScheme.primary,
                        fontSize: 13,
                        fontWeight: FontWeight.w600)),
                Text(_replyingTo!.content ?? '',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        color: theme.colorScheme.onSurface.withOpacity(0.4),
                        fontSize: 13)),
              ],
            ),
          ),
          IconButton(
            icon: Icon(CupertinoIcons.xmark_circle_fill,
                size: 20,
                color: theme.colorScheme.onSurface.withOpacity(0.3)),
            onPressed: () => setState(() => _replyingTo = null),
          ),
        ],
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}
