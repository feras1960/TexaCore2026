import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

enum TalkieStatus { available, silent, auto }

class TalkieStatusNotifier extends ChangeNotifier {
  TalkieStatus _status = TalkieStatus.auto;
  TalkieStatus get status => _status;

  final _supabase = Supabase.instance.client;

  void setStatus(TalkieStatus s) async {
    if (_status == s) return;
    _status = s;
    notifyListeners();

    // مزامنة مع قاعدة البيانات
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return;

    String dbStatus;
    switch (s) {
      case TalkieStatus.available:
        dbStatus = 'always';
        break;
      case TalkieStatus.silent:
        dbStatus = 'silent';
        break;
      case TalkieStatus.auto:
        dbStatus = 'scheduled'; // أو 'auto' إذا كان مدعوماً
        break;
    }

    try {
      await _supabase
          .from('nexa_ptt_members')
          .update({'availability': dbStatus})
          .eq('user_id', userId);
    } catch (e) {
      debugPrint('[TalkieStatus] Failed to sync status: $e');
    }
  }
}

final talkieStatusProvider = ChangeNotifierProvider<TalkieStatusNotifier>((ref) {
  return TalkieStatusNotifier();
});
