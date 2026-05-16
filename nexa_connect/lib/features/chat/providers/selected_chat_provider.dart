import 'package:flutter_riverpod/flutter_riverpod.dart';

class SelectedChatIdNotifier extends Notifier<String?> {
  @override
  String? build() => null;
  void set(String? id) => state = id;
}

final selectedChatIdProvider = NotifierProvider<SelectedChatIdNotifier, String?>(
  () => SelectedChatIdNotifier(),
);

class SelectedChatNameNotifier extends Notifier<String?> {
  @override
  String? build() => null;
  void set(String? name) => state = name;
}

final selectedChatNameProvider = NotifierProvider<SelectedChatNameNotifier, String?>(
  () => SelectedChatNameNotifier(),
);
