import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../widgets/ptt_invitation_card.dart';
import '../widgets/ptt_availability_sheet.dart';

/// Invitations screen — shows all pending PTT invitations
class PttInvitationsScreen extends StatelessWidget {
  const PttInvitationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Mock invitations
    final invitations = [
      {
        'type': 'group',
        'from_name': 'أحمد المدير',
        'channel_name': 'فريق المبيعات',
        'message': 'انضم لقناة التوكي ووكي الخاصة بالفريق',
        'member_count': 8,
        'created_at': DateTime.now().subtract(const Duration(hours: 2)),
      },
      {
        'type': 'buddy',
        'from_name': 'محمد — +966 5XX',
        'channel_name': null,
        'message': 'مرحباً! أريد ربط التوكي ووكي معك',
        'member_count': 0,
        'created_at': DateTime.now().subtract(const Duration(minutes: 30)),
      },
    ];

    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: const Text('🔔 الدعوات'),
        backgroundColor: isDark ? const Color(0xFF111111) : null,
        border: null,
      ),
      child: SafeArea(
        child: invitations.isEmpty
            ? _buildEmpty(theme)
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: invitations.length,
                itemBuilder: (context, index) {
                  final inv = invitations[index];
                  return PttInvitationCard(
                    type: inv['type'] as String,
                    fromName: inv['from_name'] as String,
                    channelName: inv['channel_name'] as String?,
                    message: inv['message'] as String?,
                    memberCount: inv['member_count'] as int,
                    createdAt: inv['created_at'] as DateTime,
                    onAccept: () {
                      _showAcceptSheet(
                        context,
                        inv['channel_name'] as String? ??
                            inv['from_name'] as String,
                      );
                    },
                    onReject: () {
                      // TODO: call service.respondToInvitation(id, false)
                      Navigator.pop(context);
                    },
                  );
                },
              ),
      ),
    );
  }

  void _showAcceptSheet(BuildContext context, String channelName) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PttAvailabilitySheet(
        channelName: channelName,
        onConfirm: (availability, start, end, days) {
          // TODO: call service.respondToInvitation(id, true, ...)
          debugPrint(
              '[NexaTalkie] Accepted: $availability, $start-$end, $days');
        },
      ),
    );
  }

  Widget _buildEmpty(ThemeData theme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(CupertinoIcons.bell_slash,
              size: 48, color: theme.colorScheme.onSurface.withOpacity(0.2)),
          const SizedBox(height: 12),
          Text(
            'لا توجد دعوات',
            style: TextStyle(
              color: theme.colorScheme.onSurface.withOpacity(0.4),
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
