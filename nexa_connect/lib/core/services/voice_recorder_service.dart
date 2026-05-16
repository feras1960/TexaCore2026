import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:record/record.dart';

/// Voice recording service — supports voice messages & PTT
class VoiceRecorderService {
  final AudioRecorder _recorder = AudioRecorder();
  bool _isRecording = false;
  DateTime? _startTime;
  Timer? _durationTimer;
  int _durationSeconds = 0;
  final ValueNotifier<int> duration = ValueNotifier(0);
  final ValueNotifier<bool> isRecording = ValueNotifier(false);

  bool get recording => _isRecording;

  /// Start recording audio
  Future<bool> startRecording() async {
    try {
      final hasPermission = await _recorder.hasPermission();
      if (!hasPermission) {
        debugPrint('[Recorder] ❌ Microphone permission denied');
        return false;
      }

      // Use WebM for web, AAC for native
      const config = RecordConfig(
        encoder: AudioEncoder.opus,
        sampleRate: 16000,
        numChannels: 1,
        bitRate: 32000,
      );

      await _recorder.start(config, path: '');
      _isRecording = true;
      _startTime = DateTime.now();
      _durationSeconds = 0;
      isRecording.value = true;
      duration.value = 0;

      _durationTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        _durationSeconds++;
        duration.value = _durationSeconds;
      });

      debugPrint('[Recorder] 🎙️ Recording started');
      return true;
    } catch (e) {
      debugPrint('[Recorder] ❌ Start error: $e');
      return false;
    }
  }

  /// Stop recording and return the audio bytes
  Future<RecordedAudio?> stopRecording() async {
    if (!_isRecording) return null;

    try {
      _durationTimer?.cancel();
      _isRecording = false;
      isRecording.value = false;

      final path = await _recorder.stop();
      if (path == null) return null;

      // For web, the path is a blob URL — read bytes
      Uint8List? bytes;
      if (kIsWeb) {
        // On web, record package returns a blob URL
        // We need to use XHR to fetch the bytes
        bytes = await _fetchBlobBytes(path);
      }

      final durationMs =
          DateTime.now().difference(_startTime ?? DateTime.now()).inMilliseconds;

      debugPrint(
          '[Recorder] ✅ Recording stopped — ${_durationSeconds}s, path: $path');

      return RecordedAudio(
        path: path,
        bytes: bytes,
        durationMs: durationMs,
        durationFormatted: _formatDuration(_durationSeconds),
      );
    } catch (e) {
      debugPrint('[Recorder] ❌ Stop error: $e');
      _isRecording = false;
      isRecording.value = false;
      return null;
    }
  }

  /// Cancel recording without saving
  Future<void> cancelRecording() async {
    _durationTimer?.cancel();
    _isRecording = false;
    isRecording.value = false;
    duration.value = 0;
    try {
      await _recorder.stop();
    } catch (_) {}
    debugPrint('[Recorder] ⛔ Recording cancelled');
  }

  /// Fetch blob bytes on web
  Future<Uint8List?> _fetchBlobBytes(String blobUrl) async {
    try {
      // Use dart:html for web blob access
      // This will be handled by the upload service
      return null;
    } catch (e) {
      debugPrint('[Recorder] ⚠️ Blob fetch error: $e');
      return null;
    }
  }

  String _formatDuration(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(1, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  void dispose() {
    _durationTimer?.cancel();
    _recorder.dispose();
    duration.dispose();
    isRecording.dispose();
  }
}

class RecordedAudio {
  final String path;
  final Uint8List? bytes;
  final int durationMs;
  final String durationFormatted;

  RecordedAudio({
    required this.path,
    this.bytes,
    required this.durationMs,
    required this.durationFormatted,
  });
}
