import 'package:flutter_riverpod/flutter_riverpod.dart';

enum SettingsPage { none, sipAccounts, notifications, privacy }

class SelectedSettingsPageNotifier extends Notifier<SettingsPage> {
  @override
  SettingsPage build() => SettingsPage.none;

  void setPage(SettingsPage page) {
    state = page;
  }
}

final selectedSettingsPageProvider = NotifierProvider<SelectedSettingsPageNotifier, SettingsPage>(() {
  return SelectedSettingsPageNotifier();
});
