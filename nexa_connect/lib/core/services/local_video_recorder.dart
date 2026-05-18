import 'dart:async';
import 'package:flutter/foundation.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:js_util' as js_util;

/// خدمة لامركزية لتسجيل وتجزئة الفيديو القادم من الطوارئ
/// تعتمد على `dart:html` لجمع البث وحفظه كملف واحد محلياً دون رفعه للسيرفر
class LocalVideoRecorder {
  html.MediaRecorder? _recorder;
  final List<html.Blob> _chunks = [];
  bool _isRecording = false;

  /// بدء التسجيل من العناصر الموجودة في الشاشة (التي يعرضها LiveKit)
  void startRecording() {
    if (!kIsWeb) {
      debugPrint('[LocalVideoRecorder] Only supported on Web.');
      return;
    }

    try {
      _chunks.clear();

      // البحث عن عناصر الفيديو والصوت النشطة في الشاشة
      final videos = html.document.getElementsByTagName('video');
      final audios = html.document.getElementsByTagName('audio');

      // إنشاء MediaStream فارغ لجمع كل الـ Tracks
      final combinedStream = html.MediaStream();

      bool hasTracks = false;

      // 1. التقاط مسارات الفيديو
      for (final v in videos) {
        final videoEl = v as html.VideoElement;
        // استخدام js_util لاستدعاء captureStream المدعوم في المتصفحات
        if (js_util.hasProperty(videoEl, 'captureStream')) {
          final stream = js_util.callMethod(videoEl, 'captureStream', []) as html.MediaStream;
          for (final track in stream.getVideoTracks()) {
            combinedStream.addTrack(track);
            hasTracks = true;
          }
        } else if (js_util.hasProperty(videoEl, 'mozCaptureStream')) {
          final stream = js_util.callMethod(videoEl, 'mozCaptureStream', []) as html.MediaStream;
          for (final track in stream.getVideoTracks()) {
            combinedStream.addTrack(track);
            hasTracks = true;
          }
        }
      }

      // 2. التقاط مسارات الصوت
      for (final a in audios) {
        final audioEl = a as html.AudioElement;
        if (js_util.hasProperty(audioEl, 'captureStream')) {
          final stream = js_util.callMethod(audioEl, 'captureStream', []) as html.MediaStream;
          for (final track in stream.getAudioTracks()) {
            combinedStream.addTrack(track);
            hasTracks = true;
          }
        }
      }

      if (!hasTracks) {
        debugPrint('[LocalVideoRecorder] No active streams found to record.');
        return;
      }

      // 3. تهيئة وبدء الـ MediaRecorder
      // نختار صيغة webm لأنها الأفضل للمتصفح وتسجيل الـ Chunks
      _recorder = html.MediaRecorder(combinedStream, {'mimeType': 'video/webm'});

      // تجميع الأجزاء (Chunks) عند توفرها في الذاكرة
      _recorder!.addEventListener('dataavailable', (html.Event event) {
        final blobEvent = event as dynamic;
        final html.Blob blob = blobEvent.data;
        if (blob.size > 0) {
          _chunks.add(blob);
          debugPrint('[LocalVideoRecorder] Captured chunk: ${blob.size} bytes');
        }
      });

      _recorder!.addEventListener('stop', (html.Event event) {
        debugPrint('[LocalVideoRecorder] Recording stopped automatically.');
      });

      // تجزئة الفيديو إلى مقاطع كل 5 ثواني للحماية من فقدان البيانات (Internal Chunking)
      _recorder!.start(5000);
      _isRecording = true;
      debugPrint('[LocalVideoRecorder] 🔴 Recording started with 5s chunks.');

    } catch (e) {
      debugPrint('[LocalVideoRecorder] Error starting record: $e');
    }
  }

  /// إيقاف التسجيل وتجميع الأجزاء وتنزيلها كفيديو واحد
  void stopAndSave(String senderName) {
    if (!_isRecording || _recorder == null) return;

    try {
      _recorder!.stop();
      _isRecording = false;

      // الانتظار قليلاً للتأكد من وصول آخر Chunk
      Future.delayed(const Duration(milliseconds: 500), () {
        if (_chunks.isEmpty) {
          debugPrint('[LocalVideoRecorder] No chunks to save.');
          return;
        }

        // تجميع كل المقاطع (Assembling)
        final combinedBlob = html.Blob(_chunks, 'video/webm');
        debugPrint('[LocalVideoRecorder] Assembled video size: ${combinedBlob.size} bytes');

        // توليد رابط التنزيل
        final url = html.Url.createObjectUrlFromBlob(combinedBlob);
        
        final timestamp = DateTime.now().toIso8601String().replaceAll(':', '-').split('.').first;
        final filename = 'SOS_Emergency_${senderName}_$timestamp.webm';

        // محاكاة النقر على رابط للتحميل
        final anchor = html.AnchorElement(href: url)
          ..setAttribute('download', filename)
          ..style.display = 'none';
        
        html.document.body?.children.add(anchor);
        anchor.click();

        // تنظيف الذاكرة
        Future.delayed(const Duration(seconds: 1), () {
          anchor.remove();
          html.Url.revokeObjectUrl(url);
          _chunks.clear();
        });

        debugPrint('[LocalVideoRecorder] ✅ Download triggered for $filename');
      });
    } catch (e) {
      debugPrint('[LocalVideoRecorder] Error saving record: $e');
    }
  }

  void cancel() {
    if (_isRecording) {
      _recorder?.stop();
      _isRecording = false;
      _chunks.clear();
    }
  }
}
