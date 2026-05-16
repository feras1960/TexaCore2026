import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/contact.dart';
import '../../calls/providers/sip_provider.dart';
import '../providers/contacts_provider.dart';
import '../../../core/utils/responsive.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

class ContactDetailScreen extends ConsumerWidget {
  final Contact contact;

  const ContactDetailScreen({super.key, required this.contact});

  List<Color> _getAvatarGradient(String name) {
    final colors = [
      [const Color(0xFF6366F1), const Color(0xFF8B5CF6)],
      [const Color(0xFF14B8A6), const Color(0xFF0EA5E9)],
      [const Color(0xFFF59E0B), const Color(0xFFEF4444)],
      [const Color(0xFF10B981), const Color(0xFF3B82F6)],
      [const Color(0xFFEC4899), const Color(0xFF8B5CF6)],
      [const Color(0xFFFF6B6B), const Color(0xFFFF8E53)],
    ];
    final index = name.codeUnits.fold<int>(0, (p, c) => p + c) % colors.length;
    return colors[index];
  }

  String _getTypeLabel(ContactType type) {
    switch (type) {
      case ContactType.phone:
        return 'امتداد هاتفي';
      case ContactType.customer:
        return 'عميل';
      case ContactType.supplier:
        return 'مورّد';
    }
  }

  Color _getTypeBadgeColor(ContactType type) {
    switch (type) {
      case ContactType.phone:
        return const Color(0xFF34C759);
      case ContactType.customer:
        return const Color(0xFFFF9500);
      case ContactType.supplier:
        return const Color(0xFF5856D6);
    }
  }

  IconData _getTypeIcon(ContactType type) {
    switch (type) {
      case ContactType.phone:
        return CupertinoIcons.phone;
      case ContactType.customer:
        return CupertinoIcons.cart;
      case ContactType.supplier:
        return CupertinoIcons.building_2_fill;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final gradientColors = _getAvatarGradient(contact.name);

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0A0A0A) : const Color(0xFFF2F2F7),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // ── Header with back button ──
          SliverToBoxAdapter(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    gradientColors[0].withOpacity(isDark ? 0.3 : 0.15),
                    isDark ? const Color(0xFF0A0A0A) : const Color(0xFFF2F2F7),
                  ],
                ),
              ),
              child: SafeArea(
                bottom: false,
                child: Column(
                  children: [
                    // Top bar
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      child: Row(
                        children: [
                          if (ResponsiveLayout.isMobile(context))
                            IconButton(
                              onPressed: () => Navigator.of(context).pop(),
                              icon: Icon(
                                CupertinoIcons.chevron_back,
                                color: theme.colorScheme.primary,
                                size: 28,
                              ),
                            ),
                          const Spacer(),
                          IconButton(
                            onPressed: () {
                              // Toggle favorite
                              ref.read(contactsProvider.notifier).toggleFavorite(contact.id);
                            },
                            icon: Icon(
                              contact.isFavorite
                                  ? CupertinoIcons.star_fill
                                  : CupertinoIcons.star,
                              color: contact.isFavorite
                                  ? Colors.amber.shade400
                                  : theme.colorScheme.onSurface.withOpacity(0.4),
                              size: 24,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 8),

                    // Avatar
                    Hero(
                      tag: 'contact_avatar_${contact.id}',
                      child: Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            colors: gradientColors,
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: gradientColors[0].withOpacity(0.4),
                              blurRadius: 24,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            contact.name.substring(0, 1).toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 42,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Name
                    Text(
                      contact.name,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        fontSize: 24,
                      ),
                      textAlign: TextAlign.center,
                    ),

                    // Company name
                    if (contact.companyName != null && contact.companyName!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          contact.companyName!,
                          style: TextStyle(
                            color: theme.colorScheme.onSurface.withOpacity(0.5),
                            fontSize: 15,
                          ),
                        ),
                      ),

                    const SizedBox(height: 6),

                    // Type badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: _getTypeBadgeColor(contact.type).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _getTypeIcon(contact.type),
                            size: 14,
                            color: _getTypeBadgeColor(contact.type),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _getTypeLabel(contact.type),
                            style: TextStyle(
                              color: _getTypeBadgeColor(contact.type),
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ── Action Buttons ──
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _ActionButton(
                          icon: CupertinoIcons.phone_fill,
                          label: 'اتصال',
                          color: const Color(0xFF34C759),
                          onTap: () {
                            ref.read(sipServiceProvider).makeCall(contact.number);
                            if (ResponsiveLayout.isMobile(context)) {
                              Navigator.of(context).pop();
                            }
                          },
                        ),
                        const SizedBox(width: 20),
                        _ActionButton(
                          icon: CupertinoIcons.chat_bubble_fill,
                          label: 'رسالة',
                          color: const Color(0xFF007AFF),
                          onTap: () {
                            // TODO: Open chat
                          },
                        ),
                        if (contact.email != null && contact.email!.isNotEmpty) ...[
                          const SizedBox(width: 20),
                          _ActionButton(
                            icon: CupertinoIcons.mail_solid,
                            label: 'بريد',
                            color: const Color(0xFFFF9500),
                            onTap: () {
                              html.window.open('mailto:${contact.email}', '_blank');
                            },
                          ),
                        ],
                      ],
                    ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ),

          // ── Details Cards ──
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Phone numbers
                _DetailCard(
                  isDark: isDark,
                  children: [
                    for (var i = 0; i < contact.allNumbers.length; i++) ...[
                      if (i > 0)
                        Divider(
                          color: theme.colorScheme.outline.withOpacity(0.15),
                          height: 1,
                        ),
                      _DetailRow(
                        label: i == 0 ? 'الرقم الرئيسي' : 'رقم ${i + 1}',
                        value: contact.allNumbers[i],
                        icon: CupertinoIcons.phone,
                        iconColor: const Color(0xFF34C759),
                        trailing: IconButton(
                          onPressed: () {
                            ref.read(sipServiceProvider).makeCall(contact.allNumbers[i]);
                            if (ResponsiveLayout.isMobile(context)) {
                              Navigator.of(context).pop();
                            }
                          },
                          icon: const Icon(
                            CupertinoIcons.phone_circle_fill,
                            color: Color(0xFF34C759),
                            size: 28,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),

                const SizedBox(height: 12),

                // Email & Company
                if (contact.email != null || contact.companyName != null || contact.address != null)
                  _DetailCard(
                    isDark: isDark,
                    children: [
                      if (contact.email != null && contact.email!.isNotEmpty)
                        _DetailRow(
                          label: 'البريد الإلكتروني',
                          value: contact.email!,
                          icon: CupertinoIcons.mail,
                          iconColor: const Color(0xFFFF9500),
                          trailing: IconButton(
                            onPressed: () {
                              html.window.open('mailto:${contact.email}', '_blank');
                            },
                            icon: const Icon(
                              CupertinoIcons.paperplane_fill,
                              color: Color(0xFF007AFF),
                              size: 22,
                            ),
                          ),
                        ),
                      if (contact.email != null && contact.companyName != null)
                        Divider(
                          color: theme.colorScheme.outline.withOpacity(0.15),
                          height: 1,
                        ),
                      if (contact.companyName != null && contact.companyName!.isNotEmpty)
                        _DetailRow(
                          label: 'الشركة',
                          value: contact.companyName!,
                          icon: CupertinoIcons.building_2_fill,
                          iconColor: const Color(0xFF5856D6),
                        ),
                      if (contact.address != null && contact.address!.isNotEmpty) ...[
                        Divider(
                          color: theme.colorScheme.outline.withOpacity(0.15),
                          height: 1,
                        ),
                        _DetailRow(
                          label: 'العنوان',
                          value: contact.address!,
                          icon: CupertinoIcons.location_solid,
                          iconColor: const Color(0xFFFF3B30),
                        ),
                      ],
                    ],
                  ),

                if (contact.email != null || contact.companyName != null || contact.address != null)
                  const SizedBox(height: 12),

                // Notes
                if (contact.notes != null && contact.notes!.isNotEmpty)
                  _DetailCard(
                    isDark: isDark,
                    children: [
                      _DetailRow(
                        label: 'ملاحظات',
                        value: contact.notes!,
                        icon: CupertinoIcons.doc_text,
                        iconColor: const Color(0xFF8E8E93),
                      ),
                    ],
                  ),

                if (contact.notes != null && contact.notes!.isNotEmpty)
                  const SizedBox(height: 12),

                // Arabic/English names
                if ((contact.nameAr != null && contact.nameAr != contact.name) ||
                    (contact.nameEn != null && contact.nameEn != contact.name))
                  _DetailCard(
                    isDark: isDark,
                    children: [
                      if (contact.nameAr != null && contact.nameAr!.isNotEmpty && contact.nameAr != contact.name)
                        _DetailRow(
                          label: 'الاسم بالعربية',
                          value: contact.nameAr!,
                          icon: CupertinoIcons.textformat,
                          iconColor: const Color(0xFF007AFF),
                        ),
                      if (contact.nameAr != null && contact.nameEn != null &&
                          contact.nameAr != contact.name && contact.nameEn != contact.name)
                        Divider(
                          color: theme.colorScheme.outline.withOpacity(0.15),
                          height: 1,
                        ),
                      if (contact.nameEn != null && contact.nameEn!.isNotEmpty && contact.nameEn != contact.name)
                        _DetailRow(
                          label: 'Name (English)',
                          value: contact.nameEn!,
                          icon: CupertinoIcons.textformat_abc,
                          iconColor: const Color(0xFF007AFF),
                        ),
                    ],
                  ),

                const SizedBox(height: 80),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Action Button ──
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Detail Card ──
class _DetailCard extends StatelessWidget {
  final bool isDark;
  final List<Widget> children;

  const _DetailCard({required this.isDark, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Column(
          children: children,
        ),
      ),
    );
  }
}

// ── Detail Row ──
class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color iconColor;
  final Widget? trailing;

  const _DetailRow({
    required this.label,
    required this.value,
    required this.icon,
    required this.iconColor,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: theme.colorScheme.onSurface.withOpacity(0.45),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    color: theme.colorScheme.onSurface,
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}
