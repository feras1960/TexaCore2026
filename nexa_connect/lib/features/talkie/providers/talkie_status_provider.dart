import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

enum TalkieStatus { available, silent, auto }

class TalkieStatusNotifier extends Notifier<TalkieStatus> {
  @override
  TalkieStatus build() => TalkieStatus.auto;

  final _supabase = Supabase.instance.client;

  void setStatus(TalkieStatus s) async {
    if (state == s) return;
    state = s;

    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return;

    String dbStatus;
    switch (s) {
      case TalkieStatus.available:
        dbStatus = 'available';
        break;
      case TalkieStatus.silent:
        dbStatus = 'silent';
        break;
      case TalkieStatus.auto:
        dbStatus = 'scheduled';
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

final talkieStatusProvider = NotifierProvider<TalkieStatusNotifier, TalkieStatus>(TalkieStatusNotifier.new);
