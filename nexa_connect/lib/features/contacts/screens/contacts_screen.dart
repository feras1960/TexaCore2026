import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/contacts_provider.dart';
import '../../../widgets/shared/contact_card.dart';
import '../../../widgets/shared/floating_filter_bar.dart';

class ContactsScreen extends ConsumerStatefulWidget {
  const ContactsScreen({super.key});

  @override
  ConsumerState<ContactsScreen> createState() => ContactsScreenState();
}

class ContactsScreenState extends ConsumerState<ContactsScreen>
    with SingleTickerProviderStateMixin, AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;
  bool _showSearch = false;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocus = FocusNode();
  final ScrollController _scrollController = ScrollController();

  // Track scroll to auto-show search on pull-down
  double _scrollOffset = 0;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocus.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    final offset = _scrollController.offset;
    // Show search when overscrolling at top (pull down)
    if (offset < -50 && !_showSearch) {
      toggleSearch();
    }
    _scrollOffset = offset;
  }

  /// Called from MainScreen when user re-taps the Contacts tab
  void toggleSearch() {
    setState(() {
      _showSearch = !_showSearch;
      if (_showSearch) {
        Future.delayed(const Duration(milliseconds: 200), () {
          _searchFocus.requestFocus();
        });
      } else {
        _searchFocus.unfocus();
        _searchController.clear();
        _searchQuery = '';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // Required by AutomaticKeepAliveClientMixin
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final allContacts = ref.watch(filteredContactsProvider);
    final currentFilter = ref.watch(contactFilterProvider);

    // Apply search filter
    final contacts = _searchQuery.isEmpty
        ? allContacts
        : allContacts
            .where((c) =>
                c.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                c.number.contains(_searchQuery))
            .toList();

    String filterLabel(ContactFilter f) {
      switch (f) {
        case ContactFilter.all:
          return 'All';
        case ContactFilter.phone:
          return 'Phone';
        case ContactFilter.customers:
          return 'Customers';
        case ContactFilter.suppliers:
          return 'Suppliers';
      }
    }

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          children: [
                // Header
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Row(
                    children: [
                      Icon(CupertinoIcons.person_add,
                          color: theme.colorScheme.primary, size: 24),
                      const SizedBox(width: 12),
                      GestureDetector(
                        onTap: toggleSearch,
                        child: Icon(CupertinoIcons.search,
                            color: theme.colorScheme.primary, size: 24),
                      ),
                      const Spacer(),
                      Text(
                        'Contacts',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                          fontSize: 20,
                        ),
                      ),
                      const Spacer(),
                      const SizedBox(width: 60),
                    ],
                  ),
                ),
                // Animated search bar
                AnimatedSlide(
                  offset: _showSearch ? Offset.zero : const Offset(0, 1.5),
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeOutCubic,
                  child: AnimatedOpacity(
                    opacity: _showSearch ? 1.0 : 0.0,
                    duration: const Duration(milliseconds: 250),
                    child: Container(
                      margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                      height: 42,
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF2C2C2E) : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(isDark ? 0.3 : 0.08),
                            blurRadius: 16,
                            offset: const Offset(0, 2),
                          ),
                        ],
                        border: Border.all(
                          color: theme.colorScheme.primary.withOpacity(0.3),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          const SizedBox(width: 12),
                          Icon(CupertinoIcons.search,
                              color: theme.colorScheme.primary, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: _searchController,
                              focusNode: _searchFocus,
                              onChanged: (v) => setState(() => _searchQuery = v),
                              style: TextStyle(
                                fontSize: 15,
                                color: theme.colorScheme.onSurface,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Search contacts...',
                                hintStyle: TextStyle(
                                  color: theme.colorScheme.onSurface
                                      .withOpacity(0.4),
                                  fontSize: 15,
                                ),
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.zero,
                                isDense: true,
                              ),
                            ),
                          ),
                          if (_searchQuery.isNotEmpty)
                            GestureDetector(
                              onTap: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                              child: Padding(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 8),
                                child: Icon(
                                  CupertinoIcons.xmark_circle_fill,
                                  color: theme.colorScheme.onSurface
                                      .withOpacity(0.3),
                                  size: 18,
                                ),
                              ),
                            ),
                          GestureDetector(
                            onTap: toggleSearch,
                            child: Padding(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 12),
                              child: Text(
                                'Cancel',
                                style: TextStyle(
                                  color: theme.colorScheme.primary,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Filter bar
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: FloatingFilterBar(
                    filters: const ['All', 'Phone', 'Customers', 'Suppliers'],
                    selected: filterLabel(currentFilter),
                    icons: const [
                      CupertinoIcons.person_2,
                      CupertinoIcons.phone,
                      CupertinoIcons.cart,
                      CupertinoIcons.building_2_fill,
                    ],
                    colors: const [
                      Color(0xFF007AFF),
                      Color(0xFF34C759),
                      Color(0xFFFF9500),
                      Color(0xFF5856D6),
                    ],
                    onSelected: (f) {
                      final map = {
                        'All': ContactFilter.all,
                        'Phone': ContactFilter.phone,
                        'Customers': ContactFilter.customers,
                        'Suppliers': ContactFilter.suppliers,
                      };
                      ref
                          .read(contactFilterProvider.notifier)
                          .setFilter(map[f] ?? ContactFilter.all);
                    },
                  ),
                ),

            // Contacts List
            Expanded(
              child: ListView.separated(
                controller: _scrollController,
                physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics(),
                ),
                padding: const EdgeInsets.only(bottom: 200),
                itemCount: contacts.length,
                separatorBuilder: (context, index) => Divider(
                  color: theme.colorScheme.outline.withAlpha(60),
                  indent: 72,
                  height: 1,
                ),
                itemBuilder: (context, index) {
                  return ContactCard(
                    contact: contacts[index],
                    onTap: () {},
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
