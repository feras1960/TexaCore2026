import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/call_log.dart';
import '../../../core/models/contact.dart';
import '../../contacts/providers/contacts_provider.dart';
import '../../contacts/screens/contact_detail_screen.dart';
import '../providers/sip_provider.dart';
import '../providers/call_history_provider.dart';
import 'keypad_screen.dart';

/// Shows call details for a specific number — similar to iPhone call info
class CallDetailSheet extends ConsumerWidget {
  final CallLog log;
  final bool isSplitView;

  const CallDetailSheet({
    super.key, 
    required this.log,
    this.isSplitView = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final contacts = ref.watch(contactsProvider);
    final allHistory = ref.watch(callHistoryProvider);

    // Find contact for this number
    final contact = ref.read(contactsProvider.notifier).findByNumber(log.number);
    final displayName = contact?.name ?? log.name ?? log.number;
    final isKnown = contact != null;

    // Filter all calls with this number
    final callsWithNumber = allHistory.where((h) =>
        h.number.replaceAll(RegExp(r'[\s\-\(\)\+]'), '') ==
        log.number.replaceAll(RegExp(r'[\s\-\(\)\+]'), '')).toList();

    final gradientColors = _getAvatarGradient(displayName);

    Widget content(ScrollController? scrollController) {
      return Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
          borderRadius: isSplitView 
              ? BorderRadius.zero 
              : const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: ListView(
          controller: scrollController,
          padding: EdgeInsets.symmetric(
            horizontal: 20, 
            vertical: isSplitView ? 24 : 0
          ),
          children: [
            // Handle (only in bottom sheet)
            if (!isSplitView)
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 10, bottom: 16),
                  width: 36,
                  height: 5,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.onSurface.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),

            // Avatar + Name
            Center(
              child: Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: gradientColors,
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: gradientColors[0].withOpacity(0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    displayName.substring(0, 1).toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 34,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Name
            Center(
              child: Text(
                displayName,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  fontSize: 22,
                ),
              ),
            ),

            // Subtitle: type or number
            if (isKnown)
              Center(
                child: Text(
                  contact!.type.name.toUpperCase(),
                  style: TextStyle(
                    color: theme.colorScheme.primary.withOpacity(0.7),
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.5,
                  ),
                ),
              )
            else if (log.name != null)
              Center(
                child: Text(
                  log.number,
                  style: TextStyle(
                    color: theme.colorScheme.onSurface.withOpacity(0.5),
                    fontSize: 15,
                  ),
                ),
              ),

            const SizedBox(height: 20),

            // ── Action Buttons ──
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _ActionBtn(
                  icon: CupertinoIcons.phone_fill,
                  label: 'Call',
                  color: const Color(0xFF34C759),
                  onTap: () {
                    if (!isSplitView) Navigator.pop(context);
                    ref.read(sipServiceProvider).makeCall(log.number);
                  },
                ),
                const SizedBox(width: 20),
                _ActionBtn(
                  icon: CupertinoIcons.chat_bubble_fill,
                  label: 'Message',
                  color: const Color(0xFF007AFF),
                  onTap: () {},
                ),
                if (!isKnown) ...[
                  const SizedBox(width: 20),
                  _ActionBtn(
                    icon: CupertinoIcons.person_add_solid,
                    label: 'Add',
                    color: const Color(0xFFFF9500),
                    onTap: () {
                      if (!isSplitView) Navigator.pop(context);
                      Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => AddContactFullScreen(
                          phoneNumber: log.number,
                          onSave: (newContact) {
                            ref.read(contactsProvider.notifier).addContact(newContact);
                          },
                        ),
                      ));
                    },
                  ),
                ],
              ],
            ),

            const SizedBox(height: 28),

            // ── Phone Numbers Card (always show) ──
            _SectionTitle('Phone', theme),
            const SizedBox(height: 8),
            _InfoCard(
              isDark: isDark,
              children: isKnown
                  ? [
                      for (var i = 0; i < contact!.allNumbers.length; i++)
                        _PhoneRow(
                          label: i == 0 ? 'Primary' : 'Phone ${i + 1}',
                          number: contact.allNumbers[i],
                          onCall: () {
                            if (!isSplitView) Navigator.pop(context);
                            ref.read(sipServiceProvider).makeCall(contact.allNumbers[i]);
                          },
                        ),
                    ]
                  : [
                      _PhoneRow(
                        label: 'Phone',
                        number: log.number,
                        onCall: () {
                          if (!isSplitView) Navigator.pop(context);
                          ref.read(sipServiceProvider).makeCall(log.number);
                        },
                      ),
                    ],
            ),

            const SizedBox(height: 20),

            // ── Contact Info Card (if known) ──
            if (isKnown) ...[
              _SectionTitle('Contact Info', theme),
              const SizedBox(height: 8),
              _InfoCard(
                isDark: isDark,
                children: [
                  if (contact!.companyName != null &&
                      contact.companyName!.isNotEmpty)
                    _InfoRow(
                      icon: CupertinoIcons.building_2_fill,
                      iconColor: const Color(0xFF5856D6),
                      label: 'Company',
                      value: contact.companyName!,
                    ),
                  if (contact.email != null && contact.email!.isNotEmpty)
                    _InfoRow(
                      icon: CupertinoIcons.mail,
                      iconColor: const Color(0xFFFF9500),
                      label: 'Email',
                      value: contact.email!,
                    ),
                  if (contact.address != null && contact.address!.isNotEmpty)
                    _InfoRow(
                      icon: CupertinoIcons.location_solid,
                      iconColor: const Color(0xFFFF3B30),
                      label: 'Address',
                      value: contact.address!,
                    ),
                ],
              ),
              const SizedBox(height: 24),
            ],

            // ── Call History with this number ──
            _SectionTitle(
              'Call History (${callsWithNumber.length})',
              theme,
            ),
            const SizedBox(height: 8),

            _InfoCard(
              isDark: isDark,
              children: callsWithNumber.isEmpty
                  ? [
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Center(
                          child: Text(
                            'No call history',
                            style: TextStyle(
                              color: theme.colorScheme.onSurface
                                  .withOpacity(0.4),
                              fontSize: 14,
                            ),
                          ),
                        ),
                      )
                    ]
                  : [
                      for (var i = 0; i < callsWithNumber.length; i++) ...[
                        if (i > 0)
                          Divider(
                            height: 1,
                            color:
                                theme.colorScheme.outline.withOpacity(0.1),
                          ),
                        _CallHistoryRow(call: callsWithNumber[i]),
                      ],
                    ],
            ),

            const SizedBox(height: 40),
          ],
        ),
      );
    }

    if (isSplitView) {
      return Scaffold(
        backgroundColor: isDark ? const Color(0xFF1C1C1E) : Colors.white,
        body: content(null),
      );
    }

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (context, scrollController) => content(scrollController),
    );
  }

  List<Color> _getAvatarGradient(String name) {
    final colors = [
      [const Color(0xFF6366F1), const Color(0xFF8B5CF6)],
      [const Color(0xFF14B8A6), const Color(0xFF0EA5E9)],
      [const Color(0xFFF59E0B), const Color(0xFFEF4444)],
      [const Color(0xFF10B981), const Color(0xFF3B82F6)],
      [const Color(0xFFEC4899), const Color(0xFF8B5CF6)],
    ];
    final index =
        name.codeUnits.fold<int>(0, (p, c) => p + c) % colors.length;
    return colors[index];
  }

  // Old _showAddContactSheet removed — now uses full-screen AddContactFullScreen
}

// ── Reusable Widgets ──

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionBtn({
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
          Text(label,
              style: TextStyle(
                  color: color, fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final ThemeData theme;
  const _SectionTitle(this.title, this.theme);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        title,
        style: TextStyle(
          color: theme.colorScheme.onSurface.withOpacity(0.5),
          fontSize: 13,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final bool isDark;
  final List<Widget> children;
  const _InfoCard({required this.isDark, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
        borderRadius: BorderRadius.circular(14),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Column(children: children),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 15, color: iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                      color: theme.colorScheme.onSurface.withOpacity(0.45),
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    )),
                Text(value,
                    style: TextStyle(
                      color: theme.colorScheme.onSurface,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PhoneRow extends StatelessWidget {
  final String label;
  final String number;
  final VoidCallback onCall;

  const _PhoneRow({
    required this.label,
    required this.number,
    required this.onCall,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Icon(CupertinoIcons.phone_fill,
              size: 18, color: const Color(0xFF34C759)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                      color: theme.colorScheme.onSurface.withOpacity(0.45),
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    )),
                Text(number,
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    )),
              ],
            ),
          ),
          GestureDetector(
            onTap: onCall,
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: const Color(0xFF34C759).withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(CupertinoIcons.phone_fill,
                  size: 16, color: Color(0xFF34C759)),
            ),
          ),
        ],
      ),
    );
  }
}

class _CallHistoryRow extends StatelessWidget {
  final CallLog call;
  const _CallHistoryRow({required this.call});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isMissed = call.direction == CallDirection.missed;

    IconData dirIcon;
    Color dirColor;
    String dirLabel;

    switch (call.direction) {
      case CallDirection.incoming:
        dirIcon = CupertinoIcons.phone_arrow_down_left;
        dirColor = const Color(0xFF8E8E93);
        dirLabel = 'Incoming';
        break;
      case CallDirection.outgoing:
        dirIcon = CupertinoIcons.phone_arrow_up_right;
        dirColor = const Color(0xFF8E8E93);
        dirLabel = 'Outgoing';
        break;
      case CallDirection.missed:
        dirIcon = CupertinoIcons.phone_arrow_down_left;
        dirColor = const Color(0xFFFF3B30);
        dirLabel = 'Missed';
        break;
    }

    final dateStr =
        '${call.timestamp.day}/${call.timestamp.month}/${call.timestamp.year}';
    final timeStr =
        '${call.timestamp.hour.toString().padLeft(2, '0')}:${call.timestamp.minute.toString().padLeft(2, '0')}';
    final durationStr = call.duration.inSeconds > 0
        ? '${call.duration.inMinutes}:${(call.duration.inSeconds % 60).toString().padLeft(2, '0')}'
        : '--:--';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Icon(dirIcon, size: 16, color: dirColor),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  dirLabel,
                  style: TextStyle(
                    color: isMissed
                        ? const Color(0xFFFF3B30)
                        : theme.colorScheme.onSurface,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  '$dateStr  $timeStr',
                  style: TextStyle(
                    color: theme.colorScheme.onSurface.withOpacity(0.45),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Text(
            durationStr,
            style: TextStyle(
              color: theme.colorScheme.onSurface.withOpacity(0.5),
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
