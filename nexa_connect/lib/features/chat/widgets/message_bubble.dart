import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../models/message.dart';

/// Modern message bubble — Nexa Connect premium style
class MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final VoidCallback? onReply;
  final bool isGrouped;

  const MessageBubble({
    super.key,
    required this.message,
    this.onReply,
    this.isGrouped = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (message.type == MessageType.system) {
      return _buildSystemMessage(theme, isDark);
    }

    final isMine = message.isMine;

    // ─── Nexa Connect Colors ───
    final myBubble = isDark
        ? const Color(0xFF1B3A2D)  // Deep teal
        : theme.colorScheme.primary.withOpacity(0.08);

    final otherBubble = isDark
        ? const Color(0xFF1E1E1E)
        : Colors.white;

    final textColor = theme.colorScheme.onSurface;
    final timeColor = theme.colorScheme.onSurface.withOpacity(0.4);

    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        onLongPress: () => _showContextMenu(context, theme),
        onHorizontalDragEnd: (details) {
          if (details.primaryVelocity != null &&
              details.primaryVelocity!.abs() > 200) {
            onReply?.call();
          }
        },
        child: Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.78,
            minWidth: 80,
          ),
          margin: EdgeInsets.only(
            top: isGrouped ? 2 : 8,
            bottom: 2,
            left: isMine ? 56 : 0,
            right: isMine ? 0 : 56,
          ),
          decoration: BoxDecoration(
            color: isMine ? myBubble : otherBubble,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(18),
              topRight: const Radius.circular(18),
              bottomLeft: Radius.circular(isMine ? 18 : (isGrouped ? 18 : 6)),
              bottomRight: Radius.circular(isMine ? (isGrouped ? 18 : 6) : 18),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
                blurRadius: 8,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(18),
              topRight: const Radius.circular(18),
              bottomLeft: Radius.circular(isMine ? 18 : (isGrouped ? 18 : 6)),
              bottomRight: Radius.circular(isMine ? (isGrouped ? 18 : 6) : 18),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Reply preview
                  if (message.replyTo != null) _buildInlineReply(theme, isDark),

                  // Content
                  if (message.isDeleted)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(CupertinoIcons.nosign,
                            size: 14, color: timeColor),
                        const SizedBox(width: 6),
                        Text('This message was deleted',
                            style: TextStyle(
                                color: timeColor,
                                fontStyle: FontStyle.italic,
                                fontSize: 14)),
                      ],
                    )
                  else if (message.type == MessageType.image &&
                      message.mediaUrl != null)
                    _buildImageContent(context, theme)
                  else if (message.type == MessageType.document &&
                      message.mediaUrl != null)
                    _buildDocumentContent(theme, isDark)
                  else if (message.type == MessageType.audio &&
                      message.mediaUrl != null)
                    _buildAudioContent(theme)
                  else
                    Text(
                      message.content ?? '',
                      style: TextStyle(
                        color: textColor,
                        fontSize: 15.5,
                        height: 1.4,
                        letterSpacing: -0.1,
                      ),
                    ),

                  const SizedBox(height: 4),

                  // Time + read receipt
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      if (message.isEdited)
                        Padding(
                          padding: const EdgeInsets.only(right: 4),
                          child: Text('edited',
                              style: TextStyle(
                                  color: timeColor,
                                  fontSize: 11,
                                  fontStyle: FontStyle.italic)),
                        ),
                      Text(
                        _formatTime(message.createdAt),
                        style: TextStyle(
                          color: timeColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                      if (isMine) ...[
                        const SizedBox(width: 4),
                        Icon(Icons.done_all_rounded,
                            size: 15,
                            color: theme.colorScheme.primary.withOpacity(0.7)),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSystemMessage(ThemeData theme, bool isDark) {
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withOpacity(0.06)
              : Colors.black.withOpacity(0.03),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          message.content ?? '',
          style: TextStyle(
            fontSize: 12,
            color: theme.colorScheme.onSurface.withOpacity(0.5),
          ),
        ),
      ),
    );
  }

  Widget _buildInlineReply(ThemeData theme, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.fromLTRB(10, 6, 10, 6),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.06)
            : theme.colorScheme.primary.withOpacity(0.06),
        borderRadius: BorderRadius.circular(10),
        border: Border(
          left: BorderSide(
              color: theme.colorScheme.primary, width: 3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(message.replyTo!.senderName ?? '',
              style: TextStyle(
                  color: theme.colorScheme.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Text(message.replyTo!.content ?? '',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                  color: theme.colorScheme.onSurface.withOpacity(0.4),
                  fontSize: 12)),
        ],
      ),
    );
  }

  void _showContextMenu(BuildContext context, ThemeData theme) {
    showCupertinoModalPopup(
      context: context,
      builder: (ctx) => CupertinoActionSheet(
        actions: [
          CupertinoActionSheetAction(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(CupertinoIcons.reply,
                    size: 20, color: theme.colorScheme.primary),
                const SizedBox(width: 10),
                const Text('Reply'),
              ],
            ),
            onPressed: () {
              Navigator.pop(ctx);
              onReply?.call();
            },
          ),
          CupertinoActionSheetAction(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(CupertinoIcons.doc_on_clipboard,
                    size: 20, color: theme.colorScheme.primary),
                const SizedBox(width: 10),
                const Text('Copy'),
              ],
            ),
            onPressed: () => Navigator.pop(ctx),
          ),
          CupertinoActionSheetAction(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(CupertinoIcons.arrowshape_turn_up_right,
                    size: 20, color: theme.colorScheme.primary),
                const SizedBox(width: 10),
                const Text('Forward'),
              ],
            ),
            onPressed: () => Navigator.pop(ctx),
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          isDefaultAction: true,
          child: const Text('Cancel'),
          onPressed: () => Navigator.pop(ctx),
        ),
      ),
    );
  }

  // ─── Image Content ───
  Widget _buildImageContent(BuildContext context, ThemeData theme) {
    return GestureDetector(
      onTap: () {
        showDialog(
          context: context,
          builder: (_) => Dialog(
            backgroundColor: Colors.transparent,
            insetPadding: const EdgeInsets.all(16),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(message.mediaUrl!,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) =>
                      const Icon(Icons.broken_image, size: 48)),
            ),
          ),
        );
      },
      child: Container(
        constraints: const BoxConstraints(maxHeight: 250, maxWidth: 280),
        margin: const EdgeInsets.only(bottom: 4),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.network(
            message.mediaUrl!,
            fit: BoxFit.cover,
            loadingBuilder: (_, child, progress) {
              if (progress == null) return child;
              return Container(
                width: 200,
                height: 150,
                color: Colors.grey.withOpacity(0.1),
                child: const Center(child: CupertinoActivityIndicator()),
              );
            },
            errorBuilder: (_, __, ___) => Container(
              width: 200,
              height: 100,
              color: Colors.grey.withOpacity(0.1),
              child: const Icon(Icons.broken_image,
                  size: 40, color: Colors.grey),
            ),
          ),
        ),
      ),
    );
  }

  // ─── Document Content ───
  Widget _buildDocumentContent(ThemeData theme, bool isDark) {
    final meta = message.mediaMetadata;
    final fileName = meta?['file_name'] ?? message.content ?? 'Document';
    final fileSize = meta?['file_size'];
    final ext = fileName.toString().split('.').last.toUpperCase();

    IconData docIcon;
    Color docColor;
    switch (ext) {
      case 'PDF':
        docIcon = CupertinoIcons.doc_fill;
        docColor = const Color(0xFFE74C3C);
        break;
      case 'DOC':
      case 'DOCX':
        docIcon = CupertinoIcons.doc_text_fill;
        docColor = const Color(0xFF2B579A);
        break;
      case 'XLS':
      case 'XLSX':
        docIcon = CupertinoIcons.table_fill;
        docColor = const Color(0xFF217346);
        break;
      default:
        docIcon = CupertinoIcons.doc_fill;
        docColor = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.all(10),
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.06)
            : Colors.black.withOpacity(0.03),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: docColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(docIcon, color: docColor, size: 22),
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fileName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: theme.colorScheme.onSurface,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (fileSize != null)
                  Text(
                    _formatFileSize(fileSize),
                    style: TextStyle(
                      color: theme.colorScheme.onSurface.withOpacity(0.4),
                      fontSize: 11,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Icon(CupertinoIcons.arrow_down_circle,
              color: theme.colorScheme.primary, size: 24),
        ],
      ),
    );
  }

  // ─── Audio Content ───
  Widget _buildAudioContent(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      margin: const EdgeInsets.only(bottom: 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(CupertinoIcons.play_circle_fill,
              color: theme.colorScheme.primary, size: 36),
          const SizedBox(width: 8),
          Flexible(
            child: Container(
              height: 4,
              width: 140,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withOpacity(0.2),
                borderRadius: BorderRadius.circular(2),
              ),
              child: FractionallySizedBox(
                widthFactor: 0.0,
                alignment: Alignment.centerLeft,
                child: Container(
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text('0:00',
              style: TextStyle(
                  color: theme.colorScheme.onSurface.withOpacity(0.5),
                  fontSize: 12)),
        ],
      ),
    );
  }

  String _formatFileSize(dynamic size) {
    final bytes = size is int ? size : int.tryParse(size.toString()) ?? 0;
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1048576) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / 1048576).toStringAsFixed(1)} MB';
  }

  String _formatTime(DateTime time) {
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }
}
