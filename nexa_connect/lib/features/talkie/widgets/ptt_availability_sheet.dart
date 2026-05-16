import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

/// Availability settings sheet — shown when accepting PTT invitation
/// User chooses: always, scheduled, silent, or off
class PttAvailabilitySheet extends StatefulWidget {
  final String channelName;
  final Function(String availability, String? start, String? end, List<String>? days) onConfirm;

  const PttAvailabilitySheet({
    super.key,
    required this.channelName,
    required this.onConfirm,
  });

  @override
  State<PttAvailabilitySheet> createState() => _PttAvailabilitySheetState();
}

class _PttAvailabilitySheetState extends State<PttAvailabilitySheet> {
  String _availability = 'always';
  TimeOfDay _startTime = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 17, minute: 0);
  final Map<String, bool> _days = {
    'Sun': true,
    'Mon': true,
    'Tue': true,
    'Wed': true,
    'Thu': true,
    'Fri': false,
    'Sat': false,
  };

  final Map<String, String> _dayLabels = {
    'Sun': 'أحد',
    'Mon': 'اثنين',
    'Tue': 'ثلاثاء',
    'Wed': 'أربعاء',
    'Thu': 'خميس',
    'Fri': 'جمعة',
    'Sat': 'سبت',
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1A1A) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
            20, 16, 20, MediaQuery.of(context).padding.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurface.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Title
            Row(
              children: [
                const Text('✅', style: TextStyle(fontSize: 22)),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'قبول الدعوة',
                        style: TextStyle(
                          color: theme.colorScheme.onSurface,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        widget.channelName,
                        style: TextStyle(
                          color: theme.colorScheme.primary,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Subtitle
            Text(
              'متى تريد استقبال رسائل التوكي ووكي؟',
              style: TextStyle(
                color: theme.colorScheme.onSurface.withOpacity(0.5),
                fontSize: 14,
              ),
            ),

            const SizedBox(height: 16),

            // Options
            _buildOption('always', '🟢', 'كل الوقت',
                'ستصلك الرسائل الصوتية في أي وقت', theme, isDark),
            _buildOption('scheduled', '⏰', 'ساعات محددة',
                'حدد أوقات الاستقبال', theme, isDark),

            // Schedule details
            if (_availability == 'scheduled') ...[
              const SizedBox(height: 12),
              _buildScheduleSection(theme, isDark),
            ],

            _buildOption('silent', '🔇', 'صامت',
                'تصل بدون صوت — يمكنك الرد لاحقاً', theme, isDark),
            _buildOption(
                'off', '⛔', 'مغلق', 'لن تصلك أي رسائل', theme, isDark),

            const SizedBox(height: 24),

            // Confirm button
            GestureDetector(
              onTap: () {
                final selectedDays = _days.entries
                    .where((e) => e.value)
                    .map((e) => e.key)
                    .toList();

                widget.onConfirm(
                  _availability,
                  _availability == 'scheduled'
                      ? '${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}'
                      : null,
                  _availability == 'scheduled'
                      ? '${_endTime.hour.toString().padLeft(2, '0')}:${_endTime.minute.toString().padLeft(2, '0')}'
                      : null,
                  _availability == 'scheduled' ? selectedDays : null,
                );
                Navigator.pop(context);
              },
              child: Container(
                width: double.infinity,
                height: 52,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  color: theme.colorScheme.primary,
                ),
                child: const Center(
                  child: Text(
                    'تأكيد القبول ✅',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOption(String value, String emoji, String title,
      String subtitle, ThemeData theme, bool isDark) {
    final isSelected = _availability == value;

    return GestureDetector(
      onTap: () => setState(() => _availability = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? theme.colorScheme.primary.withOpacity(isDark ? 0.15 : 0.06)
              : isDark
                  ? Colors.white.withOpacity(0.04)
                  : Colors.black.withOpacity(0.02),
          borderRadius: BorderRadius.circular(14),
          border: isSelected
              ? Border.all(
                  color: theme.colorScheme.primary.withOpacity(0.4), width: 1.5)
              : Border.all(color: Colors.transparent),
        ),
        child: Row(
          children: [
            Text(emoji, style: const TextStyle(fontSize: 22)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: theme.colorScheme.onSurface,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: theme.colorScheme.onSurface.withOpacity(0.4),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              isSelected
                  ? CupertinoIcons.checkmark_circle_fill
                  : CupertinoIcons.circle,
              color: isSelected
                  ? theme.colorScheme.primary
                  : theme.colorScheme.onSurface.withOpacity(0.2),
              size: 22,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScheduleSection(ThemeData theme, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.04)
            : theme.colorScheme.primary.withOpacity(0.03),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Time range
          Row(
            children: [
              Expanded(
                child: _buildTimePicker('من', _startTime, (t) {
                  setState(() => _startTime = t);
                }, theme, isDark),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildTimePicker('إلى', _endTime, (t) {
                  setState(() => _endTime = t);
                }, theme, isDark),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Days
          Text(
            'الأيام:',
            style: TextStyle(
              color: theme.colorScheme.onSurface.withOpacity(0.5),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            children: _days.entries.map((entry) {
              final isOn = entry.value;
              return GestureDetector(
                onTap: () =>
                    setState(() => _days[entry.key] = !entry.value),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: isOn
                        ? theme.colorScheme.primary.withOpacity(0.15)
                        : isDark
                            ? Colors.white.withOpacity(0.06)
                            : Colors.black.withOpacity(0.04),
                    borderRadius: BorderRadius.circular(8),
                    border: isOn
                        ? Border.all(
                            color: theme.colorScheme.primary.withOpacity(0.4))
                        : null,
                  ),
                  child: Text(
                    _dayLabels[entry.key] ?? entry.key,
                    style: TextStyle(
                      color: isOn
                          ? theme.colorScheme.primary
                          : theme.colorScheme.onSurface.withOpacity(0.4),
                      fontSize: 12,
                      fontWeight: isOn ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildTimePicker(String label, TimeOfDay time,
      Function(TimeOfDay) onChanged, ThemeData theme, bool isDark) {
    return GestureDetector(
      onTap: () async {
        final picked = await showTimePicker(
          context: context,
          initialTime: time,
        );
        if (picked != null) onChanged(picked);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withOpacity(0.08)
              : Colors.black.withOpacity(0.04),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              label,
              style: TextStyle(
                color: theme.colorScheme.onSurface.withOpacity(0.5),
                fontSize: 13,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
              style: TextStyle(
                color: theme.colorScheme.onSurface,
                fontSize: 16,
                fontWeight: FontWeight.w700,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
