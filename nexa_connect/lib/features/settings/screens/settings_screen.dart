import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/providers/theme_provider.dart';
import '../../../core/utils/responsive.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/selected_settings_provider.dart';
import 'sip_accounts_screen.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final currentLocale = context.locale.languageCode;
    final isDark = theme.brightness == Brightness.dark;
    final themeMode = ref.watch(themeModeProvider);
    final user = Supabase.instance.client.auth.currentUser;

    return Scaffold(
      backgroundColor: isDark ? Colors.black : const Color(0xFFF2F2F7),
      body: SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // Title
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Text(
                  'settings'.tr(),
                  style: theme.textTheme.displayLarge?.copyWith(
                    fontSize: 34,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),

            // Profile Card
            SliverToBoxAdapter(
              child: GestureDetector(
                onTap: () {
                  // TODO: Open profile editing
                },
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 60,
                        height: 60,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            colors: [Color(0xFF34C759), Color(0xFF30D158)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            _getInitials(user),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _getDisplayName(user),
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w600,
                                fontSize: 20,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              user?.email ?? 'settings_screen.not_signed_in'.tr(),
                              style: const TextStyle(
                                color: Color(0xFF8E8E93),
                                fontSize: 14,
                              ),
                            ),
                            if (user?.phone != null && user!.phone!.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(
                                  user.phone!,
                                  style: const TextStyle(
                                    color: Color(0xFF8E8E93),
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const Icon(CupertinoIcons.chevron_forward,
                          color: Color(0xFFC7C7CC), size: 20),
                    ],
                  ),
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 24)),

            // ─── Appearance Section ───
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.only(left: 20, bottom: 6),
                child: Text(
                  'settings_screen.appearance'.tr(),
                  style: TextStyle(
                    color: theme.colorScheme.onSurface.withOpacity(0.4),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: _buildSection(
                context,
                isDark: isDark,
                children: [
                  // Theme picker (3-segment)
                  Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    child: Row(
                      children: [
                        Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            color: const Color(0xFF5856D6),
                            borderRadius: BorderRadius.circular(7),
                          ),
                          child: const Icon(CupertinoIcons.moon_fill,
                              color: Colors.white, size: 18),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Text(
                            'settings_screen.theme'.tr(),
                            style: theme.textTheme.bodyLarge
                                ?.copyWith(fontSize: 16),
                          ),
                        ),
                        Flexible(
                          child: CupertinoSlidingSegmentedControl<ThemeMode>(
                          groupValue: themeMode,
                          backgroundColor: isDark
                              ? Colors.white.withOpacity(0.08)
                              : Colors.black.withOpacity(0.06),
                          thumbColor: isDark
                              ? const Color(0xFF3A3A3C)
                              : Colors.white,
                          children: {
                            ThemeMode.light: Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 6),
                              child: Icon(
                                CupertinoIcons.sun_max_fill,
                                size: 16,
                                color: themeMode == ThemeMode.light
                                    ? const Color(0xFFFF9500)
                                    : theme.colorScheme.onSurface
                                        .withOpacity(0.5),
                              ),
                            ),
                            ThemeMode.dark: Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 6),
                              child: Icon(
                                CupertinoIcons.moon_fill,
                                size: 16,
                                color: themeMode == ThemeMode.dark
                                    ? const Color(0xFF5856D6)
                                    : theme.colorScheme.onSurface
                                        .withOpacity(0.5),
                              ),
                            ),
                            ThemeMode.system: Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 6),
                              child: Text(
                                'settings_screen.auto'.tr(),
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: themeMode == ThemeMode.system
                                      ? theme.colorScheme.primary
                                      : theme.colorScheme.onSurface
                                          .withOpacity(0.5),
                                ),
                              ),
                            ),
                          },
                          onValueChanged: (mode) {
                            if (mode != null) {
                              ref
                                  .read(themeModeProvider.notifier)
                                  .setMode(mode);
                            }
                          },
                         ),
                        ),
                      ],
                    ),
                  ),
                  _buildDivider(),
                  _buildListTile(
                    context,
                    icon: CupertinoIcons.globe,
                    iconBg: const Color(0xFF007AFF),
                    title: 'settings_screen.language'.tr(),
                    trailing: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: currentLocale,
                        isDense: true,
                        icon: const Icon(CupertinoIcons.chevron_down,
                            size: 14, color: Color(0xFF8E8E93)),
                        style: const TextStyle(
                            color: Color(0xFF8E8E93), fontSize: 15),
                        items: const [
                          DropdownMenuItem(
                              value: 'ar', child: Text('العربية')),
                          DropdownMenuItem(
                              value: 'en', child: Text('English')),
                          DropdownMenuItem(
                              value: 'uk', child: Text('Українська')),
                          DropdownMenuItem(
                              value: 'ru', child: Text('Русский')),
                        ],
                        onChanged: (value) {
                          if (value != null) {
                            context.setLocale(Locale(value));
                          }
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 24)),

            // ─── VoIP & Communication Section ───
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.only(left: 20, bottom: 6),
                child: Text(
                  'settings_screen.communications'.tr(),
                  style: TextStyle(
                    color: theme.colorScheme.onSurface.withOpacity(0.4),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: _buildSection(
                context,
                isDark: isDark,
                children: [
                  InkWell(
                    onTap: () {
                      if (ResponsiveLayout.isDesktop(context) ||
                          ResponsiveLayout.isTablet(context)) {
                        ref.read(selectedSettingsPageProvider.notifier).setPage(SettingsPage.sipAccounts);
                      } else {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const SipAccountsScreen(),
                          ),
                        );
                      }
                    },
                    child: _buildListTile(
                      context,
                      icon: CupertinoIcons.phone_circle_fill,
                      iconBg: const Color(0xFF34C759),
                      title: 'settings_screen.sip_accounts'.tr(),
                      subtitle: 'settings_screen.sip_accounts_subtitle'.tr(),
                      showChevron: true,
                    ),
                  ),
                  _buildDivider(),
                  _buildListTile(
                    context,
                    icon: CupertinoIcons.bell_fill,
                    iconBg: const Color(0xFFFF3B30),
                    title: 'settings_screen.notifications'.tr(),
                    showChevron: true,
                  ),
                  _buildDivider(),
                  _buildListTile(
                    context,
                    icon: CupertinoIcons.lock_shield_fill,
                    iconBg: const Color(0xFF007AFF),
                    title: 'settings_screen.privacy'.tr(),
                    showChevron: true,
                  ),
                ],
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 24)),

            // Logout
            SliverToBoxAdapter(
              child: _buildSection(
                context,
                isDark: isDark,
                children: [
                  InkWell(
                    onTap: () async {
                      await ref.read(authProvider.notifier).signOut();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      alignment: Alignment.center,
                      child: Text(
                        'settings_screen.log_out'.tr(),
                        style: TextStyle(
                          color: Color(0xFFFF3B30),
                          fontSize: 17,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 40)),
          ],
        ),
      ),
    );
  }

  String _getInitials(User? user) {
    if (user == null) return '?';
    final name = user.userMetadata?['full_name'] as String? ??
        user.userMetadata?['name'] as String? ??
        user.email ??
        '?';
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.substring(0, 1).toUpperCase();
  }

  String _getDisplayName(User? user) {
    if (user == null) return 'مستخدم';
    return user.userMetadata?['full_name'] as String? ??
        user.userMetadata?['name'] as String? ??
        user.email?.split('@').first ??
        'مستخدم';
  }

  Widget _buildSection(BuildContext context,
      {required bool isDark, required List<Widget> children}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(children: children),
    );
  }

  Widget _buildListTile(
    BuildContext context, {
    required IconData icon,
    required Color iconBg,
    required String title,
    String? subtitle,
    Widget? trailing,
    bool showChevron = false,
  }) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(7),
            ),
            child: Icon(icon, color: Colors.white, size: 18),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.bodyLarge?.copyWith(fontSize: 16),
                ),
                if (subtitle != null)
                  Text(
                    subtitle,
                    style: const TextStyle(
                        color: Color(0xFF8E8E93), fontSize: 13),
                  ),
              ],
            ),
          ),
          if (trailing != null) trailing,
          if (showChevron)
            const Icon(CupertinoIcons.chevron_forward,
                color: Color(0xFFC7C7CC), size: 18),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return const Padding(
      padding: EdgeInsets.only(left: 60),
      child: Divider(height: 1, thickness: 0.5, color: Color(0xFFE5E5EA)),
    );
  }
}
