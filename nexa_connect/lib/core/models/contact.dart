enum ContactType { phone, customer, supplier }

class Contact {
  final String id;
  final String name;
  final String number;
  final ContactType type;
  final String? companyName;
  final String? email;
  final String? avatarUrl;
  final bool isFavorite;
  // Extra fields
  final String? phone;
  final String? mobile;
  final String? address;
  final String? notes;
  final String? nameAr;
  final String? nameEn;

  Contact({
    required this.id,
    required this.name,
    required this.number,
    required this.type,
    this.companyName,
    this.email,
    this.avatarUrl,
    this.isFavorite = false,
    this.phone,
    this.mobile,
    this.address,
    this.notes,
    this.nameAr,
    this.nameEn,
  });

  /// All available phone numbers (non-empty, unique)
  List<String> get allNumbers {
    final nums = <String>{number};
    if (phone != null && phone!.isNotEmpty) nums.add(phone!);
    if (mobile != null && mobile!.isNotEmpty) nums.add(mobile!);
    return nums.toList();
  }

  Contact copyWith({
    String? id,
    String? name,
    String? number,
    ContactType? type,
    String? companyName,
    String? email,
    String? avatarUrl,
    bool? isFavorite,
    String? phone,
    String? mobile,
    String? address,
    String? notes,
    String? nameAr,
    String? nameEn,
  }) {
    return Contact(
      id: id ?? this.id,
      name: name ?? this.name,
      number: number ?? this.number,
      type: type ?? this.type,
      companyName: companyName ?? this.companyName,
      email: email ?? this.email,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      isFavorite: isFavorite ?? this.isFavorite,
      phone: phone ?? this.phone,
      mobile: mobile ?? this.mobile,
      address: address ?? this.address,
      notes: notes ?? this.notes,
      nameAr: nameAr ?? this.nameAr,
      nameEn: nameEn ?? this.nameEn,
    );
  }
}

