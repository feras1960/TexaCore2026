import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/call_history_provider.dart';
import '../providers/sip_provider.dart';
import '../../../core/models/call_log.dart';
import '../../../widgets/shared/call_history_card.dart';
import '../../../widgets/shared/floating_filter_bar.dart';
import '../../contacts/providers/contacts_provider.dart';
import 'call_detail_sheet.dart';
import '../../../core/widgets/nexa_creation_wizard.dart';
import '../../shared/screens/wizard_step_members.dart';
import '../../../core/utils/responsive.dart';
import '../providers/selected_call_provider.dart';

class CallHistoryScreen extends ConsumerStatefulWidget {
  const CallHistoryScreen({super.key});

  @override
  ConsumerState<CallHistoryScreen> createState() => _CallHistoryScreenState();
}

class _CallHistoryScreenState extends ConsumerState<CallHistoryScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;
  String _selectedFilter = 'All';

  Widget _buildSipStatusBar(ThemeData theme) {
    final registrationState = ref.watch(sipRegistrationProvider);
    final isRegistered = registrationState == 'REGISTERED';
    final isConnecting = registrationState == 'PROGRESS';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isRegistered
            ? const Color(0xFF34C759).withAlpha(20)
            : isConnecting
                ? Colors.orange.withAlpha(20)
                : const Color(0xFFFF3B30).withAlpha(20),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isRegistered
              ? const Color(0xFF34C759).withAlpha(50)
              : isConnecting
                  ? Colors.orange.withAlpha(50)
                  : const Color(0xFFFF3B30).withAlpha(50),
          width: 0.5,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isRegistered
                  ? const Color(0xFF34C759)
                  : isConnecting
                      ? Colors.orange
                      : const Color(0xFFFF3B30),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isRegistered
                      ? 'Connected'
                      : isConnecting
                          ? 'Connecting...'
                          : 'Disconnected',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isRegistered
                        ? const Color(0xFF34C759)
                        : isConnecting
                            ? Colors.orange.shade700
                            : const Color(0xFFFF3B30),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Ext: 101 • DID: +49 176 32383842',
                  style: TextStyle(
                    fontSize: 11,
                    color: theme.colorScheme.onSurface.withAlpha(150),
                  ),
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: () {},
            child: Icon(CupertinoIcons.gear,
                size: 20,
                color: theme.colorScheme.onSurface.withAlpha(120)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // Required by AutomaticKeepAliveClientMixin
    final theme = Theme.of(context);
    final history = ref.watch(callHistoryProvider);

    // Filter
    var filtered = history;
    if (_selectedFilter == 'Missed') {
      filtered = history.where((h) => h.direction == CallDirection.missed).toList();
    }

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
                // App Bar
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 8),
                    child: Row(
                      children: [
                        Icon(CupertinoIcons.ellipsis_circle,
                            color: theme.colorScheme.onSurface, size: 26),
                        const Spacer(),
                        Text(
                          'Recents',
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
                              title: 'New Call',
                              actions: [
                                WizardAction(
                                  title: 'Dial Number',
                                  icon: CupertinoIcons.phone_fill,
                                  iconColor: Colors.blue,
                                  onTap: () {
                                    Navigator.pop(context);
                                    // TODO: Open Dialpad
                                  },
                                ),
                                WizardAction(
                                  title: 'Conference Call',
                                  icon: CupertinoIcons.person_3_fill,
                                  iconColor: Colors.orange,
                                  onTap: () {
                                    Navigator.pop(context);
                                    WizardStepMembers.show(context, GroupWizardType.conference);
                                  },
                                ),
                              ],
                              onContactSelected: (contact) {
                                Navigator.pop(context);
                                // TODO: Initiate call to contact
                                debugPrint('Calling contact: ${contact.name}');
                              },
                            );
                          },
                          child: Icon(CupertinoIcons.plus_circle_fill,
                              color: theme.colorScheme.primary, size: 28),
                        ),
                      ],
                    ),
                  ),
                ),

                // SIP Status Bar
                SliverToBoxAdapter(child: _buildSipStatusBar(theme)),

                // "Recent" Header
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
                    child: Text(
                      'Recent',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        fontSize: 22,
                      ),
                    ),
                  ),
                ),

                // Filter bar
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: FloatingFilterBar(
                      filters: const ['All', 'Missed', 'Favorites', 'Scheduled'],
                      selected: _selectedFilter,
                      icons: const [
                        CupertinoIcons.clock,
                        CupertinoIcons.phone_arrow_down_left,
                        CupertinoIcons.heart_fill,
                        CupertinoIcons.calendar,
                      ],
                      colors: const [
                        Color(0xFF007AFF),
                        Color(0xFFFF3B30),
                        Color(0xFFFF2D55),
                        Color(0xFF5856D6),
                      ],
                      onSelected: (f) => setState(() => _selectedFilter = f),
                    ),
                  ),
                ),

                // Call List
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final log = filtered[index];
                      // Resolve contact name
                      final contact = ref.read(contactsProvider.notifier)
                          .findByNumber(log.number);
                      final resolvedLog = contact != null && log.name == null
                          ? CallLog(
                              id: log.id,
                              number: log.number,
                              name: contact.name,
                              timestamp: log.timestamp,
                              duration: log.duration,
                              direction: log.direction,
                            )
                          : log;
                      return Column(
                        children: [
                          CallHistoryCard(
                            log: resolvedLog,
                            onCall: () {
                              final sip = ref.read(sipServiceProvider);
                              sip.makeCall(log.number);
                            },
                            onInfoTap: () {
                              if (ResponsiveLayout.isMobile(context)) {
                                showModalBottomSheet(
                                  context: context,
                                  isScrollControlled: true,
                                  backgroundColor: Colors.transparent,
                                  builder: (_) => CallDetailSheet(log: resolvedLog),
                                );
                              } else {
                                ref.read(selectedCallLogProvider.notifier).set(resolvedLog);
                              }
                            },
                          ),
                          if (index < filtered.length - 1)
                            Divider(
                              color:
                                  theme.colorScheme.outline.withAlpha(60),
                              indent: 72,
                              height: 1,
                            ),
                        ],
                      );
                    },
                    childCount: filtered.length,
                  ),
                ),

              ],
            ),
      ),
    );
  }
}
