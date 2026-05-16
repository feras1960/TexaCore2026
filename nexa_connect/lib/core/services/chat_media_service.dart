import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:uuid/uuid.dart';
import '../config/env.dart';

/// Media upload service for Nexa Connect chat
class ChatMediaService {
  static const _bucket = 'nexa-chat-media';
  static final _uuid = const Uuid();

  final SupabaseClient _client;

  ChatMediaService(this._client);

  /// Pick an image from camera or gallery
  Future<MediaAttachment?> pickImage({bool fromCamera = false}) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: fromCamera ? ImageSource.camera : ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );
      if (picked == null) return null;

      final bytes = await picked.readAsBytes();
      final ext = picked.name.split('.').last.toLowerCase();
      final mimeType = _getMimeType(ext);
      final fileName = '${_uuid.v4()}.$ext';

      return MediaAttachment(
        fileName: fileName,
        bytes: bytes,
        mimeType: mimeType,
        type: AttachmentType.image,
        originalName: picked.name,
        size: bytes.length,
      );
    } catch (e) {
      debugPrint('[Media] ❌ Pick image error: $e');
      return null;
    }
  }

  /// Pick a document file
  Future<MediaAttachment?> pickDocument() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
        withData: true,
      );
      if (result == null || result.files.isEmpty) return null;

      final file = result.files.first;
      if (file.bytes == null) return null;

      final ext = file.extension ?? 'pdf';
      final mimeType = _getMimeType(ext);
      final fileName = '${_uuid.v4()}.$ext';

      return MediaAttachment(
        fileName: fileName,
        bytes: file.bytes!,
        mimeType: mimeType,
        type: AttachmentType.document,
        originalName: file.name,
        size: file.size,
      );
    } catch (e) {
      debugPrint('[Media] ❌ Pick document error: $e');
      return null;
    }
  }

  /// Upload attachment to Supabase Storage
  Future<String?> upload(MediaAttachment attachment,
      {String? conversationId}) async {
    try {
      final path = conversationId != null
          ? '$conversationId/${attachment.fileName}'
          : 'shared/${attachment.fileName}';

      await _client.storage.from(_bucket).uploadBinary(
            path,
            attachment.bytes,
            fileOptions: FileOptions(
              contentType: attachment.mimeType,
              upsert: true,
            ),
          );

      final url =
          _client.storage.from(_bucket).getPublicUrl(path);

      debugPrint('[Media] ✅ Uploaded: $path');
      return url;
    } catch (e) {
      debugPrint('[Media] ❌ Upload error: $e');
      return null;
    }
  }

  String _getMimeType(String ext) {
    switch (ext.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'pdf':
        return 'application/pdf';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls':
        return 'application/vnd.ms-excel';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'aac':
        return 'audio/aac';
      case 'mp3':
        return 'audio/mpeg';
      case 'ogg':
        return 'audio/ogg';
      case 'wav':
        return 'audio/wav';
      case 'webm':
        return 'audio/webm';
      case 'mp4':
        return 'video/mp4';
      default:
        return 'application/octet-stream';
    }
  }
}

enum AttachmentType { image, document, audio, video }

class MediaAttachment {
  final String fileName;
  final Uint8List bytes;
  final String mimeType;
  final AttachmentType type;
  final String originalName;
  final int size;

  MediaAttachment({
    required this.fileName,
    required this.bytes,
    required this.mimeType,
    required this.type,
    required this.originalName,
    required this.size,
  });

  String get sizeFormatted {
    if (size < 1024) return '$size B';
    if (size < 1048576) return '${(size / 1024).toStringAsFixed(1)} KB';
    return '${(size / 1048576).toStringAsFixed(1)} MB';
  }
}
