import 'package:home_widget/home_widget.dart';
import 'package:flutter/foundation.dart';
import 'dart:async';

/// دالة يجب أن تكون بالخارجية (Top-Level) للتعامل مع نقرات الويدجت في الخلفية
@pragma('vm:entry-point')
Future<void> interactiveCallback(Uri? uri) async {
  if (uri == null) return;
  
  if (uri.host == 'ptt') {
    // سيتم تشغيل البث في الخلفية لاحقاً باستخدام LiveKitPttService
    debugPrint('[HomeWidget] 🎙️ PTT pressed from widget!');
  } else if (uri.host == 'video') {
    debugPrint('[HomeWidget] 🎥 Video pressed from widget!');
  } else if (uri.host == 'call') {
    debugPrint('[HomeWidget] 📞 Call pressed from widget!');
  } else if (uri.host == 'sos') {
    debugPrint('[HomeWidget] 🚨 SOS pressed from widget!');
  }
}

class HomeWidgetService {
  /// تهيئة إعدادات الـ Home Widget
  static Future<void> initialize() async {
    if (kIsWeb) return; // الـ Widgets غير مدعومة على الويب
    
    try {
      // تسجيل نقطة الدخول (Callback) للتفاعل مع الويدجت من الخلفية
      await HomeWidget.registerInteractivityCallback(interactiveCallback);
      debugPrint('[HomeWidget] Initialized successfully.');
    } catch (e) {
      debugPrint('[HomeWidget] Error initializing: $e');
    }
  }

  /// تحديث واجهة الويدجت (مثلاً لتغيير لون زر PTT إذا كان يتحدث)
  static Future<void> updateWidgetState({required bool isTalking}) async {
    if (kIsWeb) return;
    try {
      await HomeWidget.saveWidgetData<bool>('is_talking', isTalking);
      await HomeWidget.updateWidget(name: 'NexaTalkieWidgetProvider');
    } catch (e) {
      debugPrint('[HomeWidget] Error updating widget: $e');
    }
  }
}
