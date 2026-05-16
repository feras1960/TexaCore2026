import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/contact.dart';

class SelectedContactNotifier extends Notifier<Contact?> {
  @override
  Contact? build() => null;
  void set(Contact? contact) => state = contact;
}

final selectedContactProvider = NotifierProvider<SelectedContactNotifier, Contact?>(
  () => SelectedContactNotifier(),
);
