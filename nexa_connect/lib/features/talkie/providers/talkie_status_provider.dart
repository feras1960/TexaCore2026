import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

enum TalkieStatus { available, silent, auto }

class TalkieStatusNotifier extends ChangeNotifier {
  TalkieStatus _status = TalkieStatus.auto;
  TalkieStatus get status => _status;

  void setStatus(TalkieStatus s) {
    _status = s;
    notifyListeners();
  }
}

final talkieStatusProvider = ChangeNotifierProvider<TalkieStatusNotifier>((ref) {
  return TalkieStatusNotifier();
});
