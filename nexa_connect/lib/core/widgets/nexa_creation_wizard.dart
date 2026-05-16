import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../features/contacts/providers/contacts_provider.dart';
import '../../core/models/contact.dart';

class NexaCreationWizard extends ConsumerStatefulWidget {
  final String title;
  final List<WizardAction> actions;
  final Function(Contact)? onContactSelected;

  const NexaCreationWizard({
    Key? key,
    required this.title,
    required this.actions,
    this.onContactSelected,
  }) : super(key: key);

  static Future<void> show(
    BuildContext context, {
    required String title,
    required List<WizardAction> actions,
    Function(Contact)? onContactSelected,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => NexaCreationWizard(
        title: title,
        actions: actions,
        onContactSelected: onContactSelected,
      ),
    );
  }

  @override
  ConsumerState<NexaCreationWizard> createState() => _NexaCreationWizardState();
}

class WizardAction {
  final String title;
  final IconData icon;
  final Color iconColor;
  final VoidCallback onTap;

  WizardAction({
    required this.title,
    required this.icon,
    this.iconColor = Colors.green,
    required this.onTap,
  });
}

class _NexaCreationWizardState extends ConsumerState<NexaCreationWizard> {
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    // Get all contacts
    final allContacts = ref.watch(filteredContactsProvider);
    
    // Filter by search query
    final displayContacts = _searchQuery.isEmpty 
        ? allContacts 
        : allContacts.where((c) => 
            c.name.toLowerCase().contains(_searchQuery.toLowerCase()) || 
            c.allNumbers.any((n) => n.contains(_searchQuery))).toList();

    // Compute frequently contacted (simple mock algorithm for now: top 5 by ID or favorite)
    // We will refine this later if needed. For now, let's just take favorites or first 5
    final frequentlyContacted = displayContacts.where((c) => c.isFavorite).toList();
    if (frequentlyContacted.isEmpty && displayContacts.length > 5) {
      frequentlyContacted.addAll(displayContacts.take(5));
    } else if (frequentlyContacted.isEmpty) {
      frequentlyContacted.addAll(displayContacts);
    }
    // Remove frequently contacted from alphabetical list to avoid duplication if desired,
    // but WhatsApp shows them in both. We'll show in both.

    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              color: theme.scaffoldBackgroundColor.withOpacity(isDark ? 0.8 : 0.9),
              child: Column(
                children: [
                  _buildHeader(context, theme),
                  _buildSearchBar(theme),
                  Expanded(
                    child: CustomScrollView(
                      controller: scrollController,
                      slivers: [
                        _buildActionsList(theme),
                        if (frequentlyContacted.isNotEmpty && _searchQuery.isEmpty)
                          _buildSectionHeader(theme, 'Frequently contacted'),
                        if (frequentlyContacted.isNotEmpty && _searchQuery.isEmpty)
                          _buildContactsList(theme, frequentlyContacted, isFrequent: true),
                        _buildSectionHeader(theme, _searchQuery.isEmpty ? 'All Contacts' : 'Search Results'),
                        _buildContactsList(theme, displayContacts, isFrequent: false),
                        const SliverToBoxAdapter(child: SizedBox(height: 40)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context, ThemeData theme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: theme.dividerColor.withOpacity(0.1))),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('Cancel', style: TextStyle(color: theme.colorScheme.primary, fontSize: 16)),
              ),
              const SizedBox(width: 60), // Balance
            ],
          ),
          Column(
            children: [
              Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: theme.dividerColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Text(
                widget.title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: CupertinoSearchTextField(
        placeholder: 'Search name or number',
        style: TextStyle(color: theme.colorScheme.onSurface),
        onChanged: (val) {
          setState(() {
            _searchQuery = val;
          });
        },
      ),
    );
  }

  Widget _buildActionsList(ThemeData theme) {
    if (_searchQuery.isNotEmpty) return const SliverToBoxAdapter(child: SizedBox.shrink());

    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final action = widget.actions[index];
            return InkWell(
              onTap: action.onTap,
              borderRadius: BorderRadius.circular(12),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: action.iconColor.withOpacity(0.15),
                      ),
                      child: Icon(action.icon, color: action.iconColor, size: 20),
                    ),
                    const SizedBox(width: 16),
                    Text(
                      action.title,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
          childCount: widget.actions.length,
        ),
      ),
    );
  }

  Widget _buildSectionHeader(ThemeData theme, String title) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
        child: Text(
          title,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: theme.colorScheme.onSurface.withOpacity(0.5),
            letterSpacing: 0.5,
          ),
        ),
      ),
    );
  }

  Widget _buildContactsList(ThemeData theme, List<Contact> contacts, {required bool isFrequent}) {
    if (contacts.isEmpty) {
      return const SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Center(child: Text('No contacts found')),
        ),
      );
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final contact = contacts[index];
          return InkWell(
            onTap: () {
              if (widget.onContactSelected != null) {
                widget.onContactSelected!(contact);
              }
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                    child: Text(
                      contact.name.isNotEmpty ? contact.name[0].toUpperCase() : '?',
                      style: TextStyle(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          contact.name,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                        if (contact.number.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            contact.number,
                            style: TextStyle(
                              fontSize: 13,
                              color: theme.colorScheme.onSurface.withOpacity(0.5),
                            ),
                          ),
                        ]
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
        childCount: contacts.length,
      ),
    );
  }
}
