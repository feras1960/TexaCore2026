import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

/// Attachment picker bottom sheet — Nexa Connect style
class AttachmentPicker extends StatelessWidget {
  final VoidCallback? onCamera;
  final VoidCallback? onGallery;
  final VoidCallback? onDocument;
  final VoidCallback? onLocation;
  final VoidCallback? onContact;
  final VoidCallback? onMeeting;

  const AttachmentPicker({
    super.key,
    this.onCamera,
    this.onGallery,
    this.onDocument,
    this.onLocation,
    this.onContact,
    this.onMeeting,
  });

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => const AttachmentPicker(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.4 : 0.1),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle bar
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurface.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),

              // Grid of options
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _AttachOption(
                    icon: CupertinoIcons.camera_fill,
                    label: 'Camera',
                    gradient: const [Color(0xFFFF6B6B), Color(0xFFFF8E53)],
                    onTap: () {
                      Navigator.pop(context);
                      onCamera?.call();
                    },
                  ),
                  _AttachOption(
                    icon: CupertinoIcons.photo_fill,
                    label: 'Photos',
                    gradient: const [Color(0xFF7C3AED), Color(0xFFA78BFA)],
                    onTap: () {
                      Navigator.pop(context);
                      onGallery?.call();
                    },
                  ),
                  _AttachOption(
                    icon: CupertinoIcons.doc_fill,
                    label: 'Document',
                    gradient: const [Color(0xFF3B82F6), Color(0xFF60A5FA)],
                    onTap: () {
                      Navigator.pop(context);
                      onDocument?.call();
                    },
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _AttachOption(
                    icon: CupertinoIcons.location_solid,
                    label: 'Location',
                    gradient: const [Color(0xFF10B981), Color(0xFF34D399)],
                    onTap: () {
                      Navigator.pop(context);
                      onLocation?.call();
                    },
                  ),
                  _AttachOption(
                    icon: CupertinoIcons.person_circle_fill,
                    label: 'Contact',
                    gradient: const [Color(0xFF0EA5E9), Color(0xFF38BDF8)],
                    onTap: () {
                      Navigator.pop(context);
                      onContact?.call();
                    },
                  ),
                  _AttachOption(
                    icon: CupertinoIcons.video_camera_solid,
                    label: 'Meeting',
                    gradient: const [Color(0xFFF59E0B), Color(0xFFFBBF24)],
                    onTap: () {
                      Navigator.pop(context);
                      onMeeting?.call();
                    },
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}

class _AttachOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final List<Color> gradient;
  final VoidCallback? onTap;

  const _AttachOption({
    required this.icon,
    required this.label,
    required this.gradient,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: LinearGradient(
                colors: gradient,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: gradient[0].withOpacity(0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Icon(icon, color: Colors.white, size: 28),
          ),
          const SizedBox(height: 8),
          Text(label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: theme.colorScheme.onSurface.withOpacity(0.7),
              )),
        ],
      ),
    );
  }
}
