import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/contact.dart';
import '../../features/contacts/providers/contacts_provider.dart';
import '../../features/calls/providers/sip_provider.dart';
import '../../features/contacts/screens/contact_detail_screen.dart';
import '../../core/utils/responsive.dart';
import '../../features/contacts/providers/selected_contact_provider.dart';

class ContactCard extends ConsumerWidget {
  final Contact contact;
  final VoidCallback onTap;

  const ContactCard({
    super.key,
    required this.contact,
    required this.onTap,
  });

  String _getTypeLabel(ContactType type) {
    switch (type) {
      case ContactType.phone:
        return 'Phone Contact';
      case ContactType.customer:
        return 'Customer';
      case ContactType.supplier:
        return 'Supplier';
    }
  }

  List<Color> _getAvatarGradient(String name) {
    final colors = [
      [const Color(0xFF6366F1), const Color(0xFF8B5CF6)],
      [const Color(0xFF14B8A6), const Color(0xFF0EA5E9)],
      [const Color(0xFFF59E0B), const Color(0xFFEF4444)],
      [const Color(0xFF10B981), const Color(0xFF3B82F6)],
      [const Color(0xFFEC4899), const Color(0xFF8B5CF6)],
    ];
    final index = name.codeUnits.fold<int>(0, (p, c) => p + c) % colors.length;
    return colors[index];
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: () {
        if (ResponsiveLayout.isMobile(context)) {
          Navigator.of(context).push(
            PageRouteBuilder(
              pageBuilder: (context, animation, secondaryAnimation) =>
                  ContactDetailScreen(contact: contact),
              transitionsBuilder:
                  (context, animation, secondaryAnimation, child) {
                return FadeTransition(
                  opacity: CurvedAnimation(
                    parent: animation,
                    curve: Curves.easeOutCubic,
                  ),
                  child: child,
                );
              },
              transitionDuration: const Duration(milliseconds: 350),
            ),
          );
        } else {
          // Desktop/Tablet: Update the provider to show in split-view
          ref.read(selectedContactProvider.notifier).set(contact);
        }
      },
      splashColor: Colors.transparent,
      highlightColor: theme.colorScheme.surfaceContainerHighest.withAlpha(80),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
        child: Row(
          children: [
            // Avatar with Hero
            Hero(
              tag: 'contact_avatar_${contact.id}',
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: _getAvatarGradient(contact.name),
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Center(
                  child: Text(
                    contact.name.substring(0, 1).toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),

            // Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    contact.name,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${_getTypeLabel(contact.type)} • ${contact.number}',
                    style: const TextStyle(
                      color: Color(0xFF8E8E93),
                      fontSize: 13,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),

            // Favorite star
            GestureDetector(
              onTap: () {
                ref.read(contactsProvider.notifier).toggleFavorite(contact.id);
              },
              child: Icon(
                contact.isFavorite
                    ? CupertinoIcons.star_fill
                    : CupertinoIcons.star,
                color: contact.isFavorite
                    ? Colors.amber.shade400
                    : const Color(0xFFC7C7CC),
                size: 20,
              ),
            ),
            const SizedBox(width: 16),

            // Call button
            GestureDetector(
              onTap: () {
                ref.read(sipServiceProvider).makeCall(contact.number);
              },
              child: Icon(
                CupertinoIcons.phone_fill,
                color: theme.colorScheme.primary,
                size: 22,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
