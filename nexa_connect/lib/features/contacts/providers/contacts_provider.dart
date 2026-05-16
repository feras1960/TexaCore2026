import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/models/contact.dart';
import '../../../core/config/env.dart';
import '../../../core/providers/supabase_provider.dart';
import '../../calls/providers/call_history_provider.dart';

enum ContactFilter { all, phone, customers, suppliers }

final contactFilterProvider =
    NotifierProvider<ContactFilterNotifier, ContactFilter>(() {
  return ContactFilterNotifier();
});

class ContactFilterNotifier extends Notifier<ContactFilter> {
  @override
  ContactFilter build() => ContactFilter.all;

  void setFilter(ContactFilter filter) {
    state = filter;
  }
}

final contactsProvider =
    NotifierProvider<ContactsNotifier, List<Contact>>(() {
  return ContactsNotifier();
});

final filteredContactsProvider = Provider<List<Contact>>((ref) {
  final filter = ref.watch(contactFilterProvider);
  final contacts = ref.watch(contactsProvider);

  List<Contact> filtered;
  if (filter == ContactFilter.all) {
    filtered = contacts;
  } else {
    filtered = contacts.where((c) {
      if (filter == ContactFilter.phone) return c.type == ContactType.phone;
      if (filter == ContactFilter.customers) {
        return c.type == ContactType.customer;
      }
      if (filter == ContactFilter.suppliers) {
        return c.type == ContactType.supplier;
      }
      return false;
    }).toList();
  }

  // Sort: favorites first, then alphabetical
  filtered.sort((a, b) {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.compareTo(b.name);
  });

  return filtered;
});

class ContactsNotifier extends Notifier<List<Contact>> {
  @override
  List<Contact> build() {
    _loadFromSupabase();
    return []; // Start empty — real data loads from Supabase
  }

  Future<void> _loadFromSupabase() async {
    try {
      final client = ref.read(supabaseClientProvider);
      final companyId = ref.read(companyIdProvider);
      final tenantId = ref.read(tenantIdProvider);

      if (companyId.isEmpty) {
        debugPrint('[Contacts] ⚠️ No company_id — cannot load contacts');
        return;
      }

      // Use RPC function that bypasses RLS (SECURITY DEFINER)
      final result = await client.rpc('pbx_get_contacts', params: {
        'p_tenant_id': tenantId,
        'p_company_id': companyId,
      });

      final data = result as Map<String, dynamic>;
      final contacts = <Contact>[];

      // 1. Parse Customers
      final customers = data['customers'] as List<dynamic>? ?? [];
      for (final c in customers) {
        final name = (c['name_ar'] as String?)?.isNotEmpty == true
            ? c['name_ar']
            : c['name_en'] ?? 'Customer';
        final number = (c['mobile'] as String?)?.isNotEmpty == true
            ? c['mobile']
            : c['phone'] ?? '';

        if (number.isNotEmpty) {
          contacts.add(Contact(
            id: 'cust_${c['id']}',
            name: name,
            number: number,
            type: ContactType.customer,
            companyName: c['company_name'],
            email: c['email'],
            phone: c['phone'],
            mobile: c['mobile'],
            address: c['address'],
            notes: c['notes'],
            nameAr: c['name_ar'],
            nameEn: c['name_en'],
          ));
        }
      }

      // 2. Parse Suppliers
      final suppliers = data['suppliers'] as List<dynamic>? ?? [];
      for (final s in suppliers) {
        final name = (s['name_ar'] as String?)?.isNotEmpty == true
            ? s['name_ar']
            : s['name_en'] ?? 'Supplier';
        final number = (s['mobile'] as String?)?.isNotEmpty == true
            ? s['mobile']
            : s['phone'] ?? '';

        if (number.isNotEmpty) {
          contacts.add(Contact(
            id: 'supp_${s['id']}',
            name: name,
            number: number,
            type: ContactType.supplier,
            companyName: s['company_name'],
            email: s['email'],
            phone: s['phone'],
            mobile: s['mobile'],
            address: s['address'],
            notes: s['notes'],
            nameAr: s['name_ar'],
            nameEn: s['name_en'],
          ));
        }
      }

      // 3. Parse PBX Extensions
      final extensions = data['extensions'] as List<dynamic>? ?? [];
      for (final ext in extensions) {
        contacts.add(Contact(
          id: 'ext_${ext['id']}',
          name: ext['display_name'] ?? 'Ext ${ext['extension_number']}',
          number: ext['extension_number'].toString(),
          type: ContactType.phone,
        ));
      }

      state = contacts;
      debugPrint(
          '[Contacts] ✅ Loaded ${contacts.length} contacts '
          '(${customers.length} customers, ${suppliers.length} suppliers, '
          '${extensions.length} extensions)');
    } catch (e) {
      debugPrint('[Contacts] ❌ Error: $e');
    }
  }

  void toggleFavorite(String id) {
    state = state.map((c) {
      if (c.id == id) {
        return c.copyWith(isFavorite: !c.isFavorite);
      }
      return c;
    }).toList();
  }

  /// Add a new contact to local state (and optionally Supabase)
  void addContact(Contact contact) {
    state = [...state, contact];
    debugPrint('[Contacts] ➕ Added: ${contact.name} (${contact.number})');
    // TODO: Save to Supabase when RLS is configured
  }

  /// Find a contact by phone number
  Contact? findByNumber(String number) {
    final normalized =
        number.replaceAll(RegExp(r'[\s\-\(\)\+]'), '');
    for (final c in state) {
      for (final n in c.allNumbers) {
        if (n.replaceAll(RegExp(r'[\s\-\(\)\+]'), '') == normalized) {
          return c;
        }
      }
    }
    return null;
  }

  void refresh() => _loadFromSupabase();
}
