import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../calls/screens/call_history_screen.dart';
import '../../calls/screens/keypad_screen.dart';
import '../../contacts/screens/contacts_screen.dart';
import '../../settings/screens/settings_screen.dart';
import '../../settings/screens/sip_accounts_screen.dart';
import '../../settings/providers/selected_settings_provider.dart';
import '../../chat/screens/chat_list_screen.dart';
import '../../talkie/screens/nexa_talkie_screen.dart';
import '../../calls/providers/sip_provider.dart';
import '../../calls/providers/call_history_provider.dart';
import '../../../core/services/sip_service.dart';
import '../../../core/services/livekit_call_service.dart';
import '../../../core/providers/livekit_provider.dart';
import '../../calls/screens/livekit_call_screen.dart';
import '../../../core/layouts/adaptive_shell.dart';
import '../../chat/providers/selected_chat_provider.dart';
import '../../chat/screens/chat_conversation_screen.dart';
import '../../contacts/providers/selected_contact_provider.dart';
import '../../contacts/screens/contact_detail_screen.dart';
import '../../calls/providers/selected_call_provider.dart';
import '../../calls/screens/call_detail_sheet.dart';

/// Height of the custom glassmorphism tab bar (without safe area).
/// Exported so child screens can add matching bottom padding.
const double kTabBarHeight = 64.0;

class MainScreen extends ConsumerStatefulWidget {
  const MainScreen({super.key});

  @override
  ConsumerState<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends ConsumerState<MainScreen> {
  int _currentIndex = 2; // Default to Keypad (center)

  // Keys for notifying screens of re-tap
  final GlobalKey<ContactsScreenState> _contactsKey = GlobalKey();
  final GlobalKey<ChatListScreenState> _chatsKey = GlobalKey();

  late final PageController _pageController;
  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(
      initialPage: _currentIndex,
      keepPage: true,
    );
    _screens = [
      const CallHistoryScreen(),
      ContactsScreen(key: _contactsKey),
      const KeypadScreen(),
      ChatListScreen(key: _chatsKey),
      const NexaTalkieScreen(),
      const SettingsScreen(),
    ];

    // Eagerly initialize ERP Bridge for bidirectional sync
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(erpBridgeProvider);
      // Initialize call history provider eagerly so onCallEnded is always wired
      ref.read(callHistoryProvider);
      // Listen for call state changes to show call screen
      ref.read(sipServiceProvider).addListener(_onSipStateChanged);
      // Initialize LiveKit call service (listens for incoming calls)
      ref.read(livekitCallProvider).addListener(_onLiveKitCallStateChanged);
    });
  }

  bool _isCallScreenShowing = false;

  void _onSipStateChanged() {
    final sip = ref.read(sipServiceProvider);
    final isInCall = sip.callState != NexaCallState.idle &&
        sip.callState != NexaCallState.ended;

    // Skip PTT conference calls — they run invisibly
    if (sip.isPttConference) return;

    if (isInCall && !_isCallScreenShowing) {
      _isCallScreenShowing = true;
      // Switch to Keypad tab which has the integrated call screen + WebRTC audio
      _goToPage(2);
    } else if (!isInCall && _isCallScreenShowing) {
      _isCallScreenShowing = false;
    }
  }

  bool _isLiveKitCallShowing = false;

  void _onLiveKitCallStateChanged() {
    final callService = ref.read(livekitCallProvider);
    final isIncoming = callService.state == LiveCallState.incomingRinging;
    
    if (isIncoming && !_isLiveKitCallShowing) {
      _isLiveKitCallShowing = true;
      Navigator.of(context).push(
        MaterialPageRoute(
          fullscreenDialog: true,
          builder: (_) => LiveKitCallScreen(
            targetUserId: callService.activeCall!.remoteUserId,
            targetName: callService.activeCall!.remoteName,
            isIncoming: true,
          ),
        ),
      ).then((_) => _isLiveKitCallShowing = false);
    }
  }

  @override
  void dispose() {
    ref.read(sipServiceProvider).removeListener(_onSipStateChanged);
    ref.read(livekitCallProvider).removeListener(_onLiveKitCallStateChanged);
    _pageController.dispose();
    super.dispose();
  }

  void _goToPage(int index) {
    setState(() => _currentIndex = index);
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeOutCubic,
    );
  }

  void _onTabTapped(int index) {
    if (index == _currentIndex) {
      // Re-tapped same tab
      if (index == 1) {
        _contactsKey.currentState?.toggleSearch();
      } else if (index == 3) {
        _chatsKey.currentState?.toggleSearch();
      }
      return;
    }
    _goToPage(index);
  }

  void _onPageChanged(int index) {
    setState(() => _currentIndex = index);
  }

  // Tab definitions
  static const _tabIcons = <IconData>[
    CupertinoIcons.clock,
    CupertinoIcons.person_2,
    Icons.dialpad_rounded,
    CupertinoIcons.chat_bubble_2,
    CupertinoIcons.antenna_radiowaves_left_right,
    CupertinoIcons.settings,
  ];
  static const _tabActiveIcons = <IconData>[
    CupertinoIcons.clock_fill,
    CupertinoIcons.person_2_fill,
    Icons.dialpad_rounded,
    CupertinoIcons.chat_bubble_2_fill,
    CupertinoIcons.antenna_radiowaves_left_right,
    CupertinoIcons.settings_solid,
  ];

  List<String> get _tabLabels => [
        'Recents',
        'contacts'.tr(),
        'Keypad',
        'Chats',
        'NexaLive',
        'settings'.tr(),
      ];

  @override
  Widget build(BuildContext context) {
    final sip = ref.watch(sipServiceProvider);
    final isInCall = sip.callState != NexaCallState.idle &&
        sip.callState != NexaCallState.ended &&
        !sip.isPttConference;

    Widget? currentDetailView;

    // Handle dynamic detail views based on current tab
    if (_currentIndex == 0) {
      // Recents
      final selectedCall = ref.watch(selectedCallLogProvider);
      if (selectedCall != null) {
        currentDetailView = CallDetailSheet(
          log: selectedCall, 
          isSplitView: true,
        );
      }
    } else if (_currentIndex == 1) {
      // Contacts
      final selectedContact = ref.watch(selectedContactProvider);
      if (selectedContact != null) {
        currentDetailView = ContactDetailScreen(contact: selectedContact);
      }
    } else if (_currentIndex == 3) {
      // Chats
      final selectedChatId = ref.watch(selectedChatIdProvider);
      final selectedChatName = ref.watch(selectedChatNameProvider);
      if (selectedChatId != null && selectedChatName != null) {
        currentDetailView = ChatConversationScreen(
          conversationId: selectedChatId,
          contactName: selectedChatName,
        );
      }
    } else if (_currentIndex == 5) {
      // Settings
      final selectedSettingsPage = ref.watch(selectedSettingsPageProvider);
      if (selectedSettingsPage == SettingsPage.sipAccounts) {
        currentDetailView = const SipAccountsScreen(isSplitView: true);
      }
    }

    return AdaptiveShell(
      currentIndex: _currentIndex,
      onTabTapped: _onTabTapped,
      screens: _screens,
      tabIcons: _tabIcons,
      tabActiveIcons: _tabActiveIcons,
      tabLabels: _tabLabels,
      isInCall: isInCall,
      detailView: currentDetailView,
    );
  }
}
