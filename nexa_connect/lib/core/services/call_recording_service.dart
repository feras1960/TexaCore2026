import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// خدمة تسجيل المكالمات وتحليلها بالذكاء الاصطناعي
/// 
/// المرحلة E: التسجيل من الطرف → رفع مشفر → تحليل AI
/// التدفق:
/// 1. بدء التسجيل المحلي عند بدء المكالمة
/// 2. إيقاف التسجيل عند انتهاء المكالمة
/// 3. رفع التسجيل لـ Supabase Storage
/// 4. إرسال للتحليل (Whisper → نص، GPT → ملخص)
/// 5. حذف الملف الصوتي (خصوصية)
class CallRecordingService {
  final SupabaseClient _client;
  final String _userId;

  CallRecordingService(this._client, this._userId);

  // ═══════════════════════════════════
  // Upload recording to Storage
  // ═══════════════════════════════════

  /// رفع تسجيل المكالمة لـ Supabase Storage
  Future<String?> uploadCallRecording({
    required Uint8List audioBytes,
    required String callId,
    required String direction,
    required int durationSeconds,
  }) async {
    try {
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final filePath = 'calls/$_userId/$callId-$timestamp.webm';

      // رفع الملف
      await _client.storage.from('ptt-recordings').uploadBinary(
        filePath,
        audioBytes,
        fileOptions: const FileOptions(contentType: 'audio/webm'),
      );
      
      final publicUrl = _client.storage.from('ptt-recordings').getPublicUrl(filePath);
      debugPrint('[Recording] ☁️ Uploaded: $publicUrl');

      // حفظ مرجع التسجيل
      await _client.from('pbx_call_logs')
          .update({'recording_url': publicUrl})
          .eq('caller', direction == 'outbound' ? _userId : '')
          .eq('callee', direction == 'inbound' ? _userId : '');

      return publicUrl;
    } catch (e) {
      debugPrint('[Recording] ❌ Upload error: $e');
      return null;
    }
  }

  // ═══════════════════════════════════
  // Analyze call with AI
  // ═══════════════════════════════════

  /// تحليل تسجيل المكالمة بالذكاء الاصطناعي
  /// يُرسل الملف الصوتي لـ Edge Function التي تستخدم:
  /// 1. Whisper API — تحويل صوت لنص
  /// 2. GPT-4 — تحليل المحتوى + ملخص + مشاعر + نقاط عمل
  Future<CallAnalysis?> analyzeCall({
    required String recordingUrl,
    required String callId,
  }) async {
    try {
      debugPrint('[Recording] 🤖 Analyzing call $callId...');

      // استدعاء Edge Function للتحليل
      final response = await _client.functions.invoke(
        'analyze-call',
        body: {
          'recording_url': recordingUrl,
          'call_id': callId,
          'user_id': _userId,
        },
      );

      if (response.status == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        final analysis = CallAnalysis(
          callId: callId,
          transcript: data['transcript'] ?? '',
          summary: data['summary'] ?? '',
          sentiment: data['sentiment'] ?? 'neutral',
          actionItems: List<String>.from(data['action_items'] ?? []),
          language: data['language'] ?? 'ar',
        );

        // حفظ التحليل في قاعدة البيانات
        await _saveAnalysis(analysis);

        debugPrint('[Recording] ✅ Analysis complete: ${analysis.summary.substring(0, 50)}...');
        return analysis;
      }
    } catch (e) {
      debugPrint('[Recording] ⚠️ Analysis error: $e');
    }
    return null;
  }

  /// حفظ نتيجة التحليل
  Future<void> _saveAnalysis(CallAnalysis analysis) async {
    try {
      await _client.from('call_analyses').upsert({
        'call_id': analysis.callId,
        'transcript': analysis.transcript,
        'summary': analysis.summary,
        'customer_mood': analysis.sentiment,
        'key_points': analysis.actionItems,
        'category': 'livekit_call',
        'ai_model': 'gpt-4o-mini',
      });
    } catch (e) {
      debugPrint('[Recording] ⚠️ Save analysis error: $e');
    }
  }

  // ═══════════════════════════════════
  // Delete recording (privacy)
  // ═══════════════════════════════════

  /// حذف التسجيل الصوتي بعد التحليل (خصوصية)
  Future<void> deleteRecording(String filePath) async {
    try {
      await _client.storage.from('ptt-recordings').remove([filePath]);
      debugPrint('[Recording] 🗑️ Recording deleted: $filePath');
    } catch (e) {
      debugPrint('[Recording] ⚠️ Delete error: $e');
    }
  }
}

/// نتيجة تحليل المكالمة
class CallAnalysis {
  final String callId;
  final String transcript;   // النص المكتوب
  final String summary;      // ملخص المكالمة
  final String sentiment;    // المشاعر: positive, negative, neutral
  final List<String> actionItems; // نقاط العمل المستخرجة
  final String language;     // لغة المحادثة

  CallAnalysis({
    required this.callId,
    required this.transcript,
    required this.summary,
    required this.sentiment,
    required this.actionItems,
    required this.language,
  });
}
