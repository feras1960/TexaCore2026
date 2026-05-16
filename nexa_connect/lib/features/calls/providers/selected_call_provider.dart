import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/call_log.dart';

class SelectedCallLogNotifier extends Notifier<CallLog?> {
  @override
  CallLog? build() => null;
  void set(CallLog? log) => state = log;
}

final selectedCallLogProvider = NotifierProvider<SelectedCallLogNotifier, CallLog?>(
  () => SelectedCallLogNotifier(),
);
