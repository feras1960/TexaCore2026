import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:easy_localization/easy_localization.dart';

/// Permission onboarding screen — shown once at first launch
/// Explains WHY each permission is needed before requesting it
class PermissionOnboardingScreen extends StatefulWidget {
  final VoidCallback onComplete;

  const PermissionOnboardingScreen({super.key, required this.onComplete});

  @override
  State<PermissionOnboardingScreen> createState() =>
      _PermissionOnboardingScreenState();
}

class _PermissionOnboardingScreenState
    extends State<PermissionOnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  List<_PermissionInfo> get _permissions => [
    _PermissionInfo(
      icon: CupertinoIcons.mic_fill,
      color: const Color(0xFFFF3B30),
      title: 'permissions.microphone'.tr(),
      description: 'permissions.microphone_desc'.tr(),
      features: [
        'permissions.mic_feature_1'.tr(),
        'permissions.mic_feature_2'.tr(),
        'permissions.mic_feature_3'.tr(),
      ],
    ),
    _PermissionInfo(
      icon: CupertinoIcons.person_2_fill,
      color: const Color(0xFF007AFF),
      title: 'permissions.contacts_title'.tr(),
      description: 'permissions.contacts_desc'.tr(),
      features: [
        'permissions.contacts_feature_1'.tr(),
        'permissions.contacts_feature_2'.tr(),
        'permissions.contacts_feature_3'.tr(),
      ],
    ),
    _PermissionInfo(
      icon: CupertinoIcons.bell_fill,
      color: const Color(0xFFFF9500),
      title: 'permissions.notifications_title'.tr(),
      description: 'permissions.notifications_desc'.tr(),
      features: [
        'permissions.notif_feature_1'.tr(),
        'permissions.notif_feature_2'.tr(),
        'permissions.notif_feature_3'.tr(),
      ],
    ),
    _PermissionInfo(
      icon: CupertinoIcons.camera_fill,
      color: const Color(0xFF5856D6),
      title: 'permissions.camera_title'.tr(),
      description: 'permissions.camera_desc'.tr(),
      features: [
        'permissions.camera_feature_1'.tr(),
        'permissions.camera_feature_2'.tr(),
        'permissions.camera_feature_3'.tr(),
      ],
    ),
    _PermissionInfo(
      icon: CupertinoIcons.location_fill,
      color: const Color(0xFF34C759),
      title: 'permissions.location_title'.tr(),
      description: 'permissions.location_desc'.tr(),
      features: [
        'permissions.loc_feature_1'.tr(),
        'permissions.loc_feature_2'.tr(),
        'permissions.loc_feature_3'.tr(),
      ],
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage < _permissions.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOutCubic,
      );
    } else {
      widget.onComplete();
    }
  }

  void _skip() {
    widget.onComplete();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final perms = _permissions;

    return Scaffold(
      backgroundColor: isDark ? Colors.black : Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Skip button
            Align(
              alignment: Alignment.topLeft,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: GestureDetector(
                  onTap: _skip,
                  child: Text(
                    'permissions.skip'.tr(),
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),

            // Pages
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: perms.length,
                onPageChanged: (i) => setState(() => _currentPage = i),
                itemBuilder: (context, index) {
                  final perm = perms[index];
                  return _buildPermissionPage(perm, isDark, theme);
                },
              ),
            ),

            // Page indicator + button
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: Column(
                children: [
                  // Dots
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(perms.length, (i) {
                      final isActive = i == _currentPage;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: isActive ? 24 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: isActive
                              ? perms[_currentPage].color
                              : theme.colorScheme.onSurface.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 24),

                  // Continue button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _nextPage,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: perms[_currentPage].color,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 0,
                      ),
                      child: Text(
                        _currentPage == perms.length - 1
                            ? 'permissions.start_app'.tr()
                            : 'permissions.allow_continue'.tr(),
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPermissionPage(
      _PermissionInfo perm, bool isDark, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Icon circle
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: perm.color.withOpacity(0.12),
            ),
            child: Icon(perm.icon, color: perm.color, size: 48),
          ),
          const SizedBox(height: 28),

          // Title
          Text(
            perm.title,
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w800,
              fontSize: 28,
            ),
          ),
          const SizedBox(height: 12),

          // Description
          Text(
            perm.description,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: theme.colorScheme.onSurface.withOpacity(0.6),
              fontSize: 16,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 28),

          // Features list
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withOpacity(0.06)
                  : Colors.black.withOpacity(0.03),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: perm.features.map((f) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    children: [
                      Icon(CupertinoIcons.checkmark_circle_fill,
                          color: perm.color, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          f,
                          style: TextStyle(
                            color: theme.colorScheme.onSurface.withOpacity(0.7),
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _PermissionInfo {
  final IconData icon;
  final Color color;
  final String title;
  final String description;
  final List<String> features;

  _PermissionInfo({
    required this.icon,
    required this.color,
    required this.title,
    required this.description,
    required this.features,
  });
}
