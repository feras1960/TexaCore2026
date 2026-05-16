import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/chat_provider.dart';
import '../widgets/chat_preview_card.dart';
import '../../../widgets/shared/floating_filter_bar.dart';
import '../../../core/widgets/nexa_creation_wizard.dart';
import '../../shared/screens/wizard_step_members.dart';

class ChatListScreen extends ConsumerStatefulWidget {
  const ChatListScreen({super.key});

  @override
  ConsumerState<ChatListScreen> createState() => ChatListScreenState();
}

class ChatListScreenState extends ConsumerState<ChatListScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;
  String _selectedFilter = 'All';
  bool _showSearch = false;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocus = FocusNode();
  final ScrollController _scrollController = ScrollController();

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
    if (_scrollController.offset < -50 && !_showSearch) {
      toggleSearch();
    }
  }

  /// Called from MainScreen when user re-taps the Chats tab
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
    final chats = ref.watch(chatProvider);

    // Apply filter
    var filteredChats = chats;
    if (_selectedFilter == 'Unread') {
      filteredChats = chats.where((c) => c.unreadCount > 0).toList();
    } else if (_selectedFilter == 'Groups') {
      filteredChats = chats.where((c) => c.isGroup).toList();
    } else if (_selectedFilter == 'Favorites') {
      filteredChats = chats.where((c) => c.isPinned).toList();
    }

    // Apply search
    if (_searchQuery.isNotEmpty) {
      filteredChats = filteredChats
          .where((c) =>
              c.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
              (c.lastMessage
                      ?.toLowerCase()
                      .contains(_searchQuery.toLowerCase()) ??
                  false))
          .toList();
    }

    final isMobile = MediaQuery.sizeOf(context).width < 600;

    Widget buildFilterBar() {
      return FloatingFilterBar(
        filters: const ['All', 'Unread', 'Favorites', 'Groups'],
        selected: _selectedFilter,
        icons: const [
          CupertinoIcons.chat_bubble_2,
          CupertinoIcons.envelope_badge,
          CupertinoIcons.heart_fill,
          CupertinoIcons.person_3,
        ],
        colors: const [
          Color(0xFF007AFF),
          Color(0xFFFF3B30),
          Color(0xFFFF2D55),
          Color(0xFF34C759),
        ],
        onSelected: (f) => setState(() => _selectedFilter = f),
      );
    }

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Row(
                    children: [
                      Icon(CupertinoIcons.ellipsis_circle,
                          color: theme.colorScheme.onSurface, size: 26),
                      const SizedBox(width: 12),
                      Icon(CupertinoIcons.camera,
                          color: theme.colorScheme.onSurface, size: 24),
                      const Spacer(),
                      Text(
                        'Chats',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                          fontSize: 20,
                        ),
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: () {
                          NexaCreationWizard.show(
                            context,
                            title: 'New Chat',
                            actions: [
                              WizardAction(
                                title: 'New Group',
                                icon: CupertinoIcons.person_3_fill,
                                iconColor: Colors.blue,
                                onTap: () {
                                  Navigator.pop(context);
                                  WizardStepMembers.show(context, GroupWizardType.chat);
                                },
                              ),
                              WizardAction(
                                title: 'New Broadcast',
                                icon: CupertinoIcons.speaker_2_fill,
                                iconColor: Colors.orange,
                                onTap: () {
                                  Navigator.pop(context);
                                  // TODO: Create broadcast
                                },
                              ),
                            ],
                            onContactSelected: (contact) {
                              Navigator.pop(context);
                              // TODO: Open chat with contact
                              debugPrint('Selected contact for Chat: ${contact.name}');
                            },
                          );
                        },
                        child: Icon(CupertinoIcons.plus_circle_fill,
                            color: theme.colorScheme.primary, size: 28),
                      ),
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
                                hintText: 'Search chats...',
                                hintStyle: TextStyle(
                                  color: theme.colorScheme.onSurface.withOpacity(0.4),
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
                                padding: const EdgeInsets.symmetric(horizontal: 8),
                                child: Icon(
                                  CupertinoIcons.xmark_circle_fill,
                                  color: theme.colorScheme.onSurface.withOpacity(0.3),
                                  size: 18,
                                ),
                              ),
                            ),
                          GestureDetector(
                            onTap: toggleSearch,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
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

                // Filter bar for Desktop/Tablet
                if (!isMobile)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: buildFilterBar(),
                  ),

                // Archived Row
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Row(
                    children: [
                      const Icon(CupertinoIcons.archivebox,
                          color: Color(0xFF8E8E93), size: 20),
                      const SizedBox(width: 14),
                      Text(
                        'Archived',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const Spacer(),
                      const Text('2',
                          style: TextStyle(
                              color: Color(0xFF8E8E93),
                              fontWeight: FontWeight.w500)),
                      const SizedBox(width: 4),
                      const Icon(CupertinoIcons.chevron_forward,
                          color: Color(0xFFC7C7CC), size: 16),
                    ],
                  ),
                ),

                Divider(
                    color: theme.colorScheme.outline.withAlpha(60),
                    indent: 52,
                    height: 1),

                // Chats List
                Expanded(
                  child: ListView.separated(
                    controller: _scrollController,
                    physics: const AlwaysScrollableScrollPhysics(
                      parent: BouncingScrollPhysics(),
                    ),
                    padding: EdgeInsets.only(bottom: isMobile ? 240 : 200),
                    itemCount: filteredChats.length,
                    separatorBuilder: (context, index) => Divider(
                      color: theme.colorScheme.outline.withAlpha(60),
                      indent: 80,
                      height: 1,
                    ),
                    itemBuilder: (context, index) {
                      return ChatPreviewCard(chat: filteredChats[index]);
                    },
                  ),
                ),
              ],
            ),

            // Floating Filter Bar for Mobile
            if (isMobile)
              Positioned(
                left: 16,
                right: 16,
                bottom: 110,
                child: buildFilterBar(),
              ),
          ],
        ),
      ),
    );
  }
}
