import 'dart:ui';
import 'package:flutter/material.dart';
import '../utils/responsive.dart';

class AdaptiveShell extends StatefulWidget {
  final int currentIndex;
  final ValueChanged<int> onTabTapped;
  final List<Widget> screens;
  final List<IconData> tabIcons;
  final List<IconData> tabActiveIcons;
  final List<String> tabLabels;
  final bool isInCall;
  final Widget? detailView; // For desktop 3-pane layout later

  const AdaptiveShell({
    super.key,
    required this.currentIndex,
    required this.onTabTapped,
    required this.screens,
    required this.tabIcons,
    required this.tabActiveIcons,
    required this.tabLabels,
    required this.isInCall,
    this.detailView,
  });

  @override
  State<AdaptiveShell> createState() => _AdaptiveShellState();
}

class _AdaptiveShellState extends State<AdaptiveShell> {
  double _masterWidth = 360.0;

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: _buildMobileLayout(context),
      tablet: _buildTabletDesktopLayout(context, isDesktop: false),
      desktop: _buildTabletDesktopLayout(context, isDesktop: true),
    );
  }

  Widget _buildMobileLayout(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bottomInset = MediaQuery.of(context).viewPadding.bottom;
    final safeBottom = bottomInset > 0 ? bottomInset : 8.0;

    return Scaffold(
      body: Stack(
        children: [
          // Main content
          Positioned.fill(
            child: IndexedStack(
              index: widget.currentIndex,
              children: widget.screens,
            ),
          ),
          
          // Bottom Glassmorphism Bar
          if (!widget.isInCall)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: GestureDetector(
                onHorizontalDragEnd: (details) {
                  final velocity = details.primaryVelocity ?? 0;
                  if (velocity < -300 && widget.currentIndex < 5) {
                    widget.onTabTapped(widget.currentIndex + 1);
                  } else if (velocity > 300 && widget.currentIndex > 0) {
                    widget.onTabTapped(widget.currentIndex - 1);
                  }
                },
                child: ClipRect(
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
                    child: Container(
                      decoration: BoxDecoration(
                        color: isDark
                            ? const Color(0xFF1C1C1E).withOpacity(0.88)
                            : const Color(0xFFF9F9F9).withOpacity(0.88),
                        border: Border(
                          top: BorderSide(
                            color: isDark
                                ? Colors.white.withOpacity(0.08)
                                : Colors.black.withOpacity(0.08),
                            width: 0.5,
                          ),
                        ),
                      ),
                      padding: EdgeInsets.only(
                        top: 8,
                        bottom: safeBottom,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: List.generate(6, (i) {
                          final isSelected = widget.currentIndex == i;
                          final color = isSelected
                              ? (isDark ? Colors.white : theme.colorScheme.onSurface)
                              : (isDark ? const Color(0xFF98989F) : const Color(0xFF8E8E93));
                          final iconSize = (i == 1) ? 28.0 : (i == 4 ? 24.0 : 26.0);

                          return GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onTap: () => widget.onTabTapped(i),
                            child: SizedBox(
                              width: 64,
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  SizedBox(
                                    height: 30,
                                    child: Align(
                                      alignment: Alignment.bottomCenter,
                                      child: Icon(
                                        isSelected ? widget.tabActiveIcons[i] : widget.tabIcons[i],
                                        size: iconSize,
                                        color: color,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    widget.tabLabels[i],
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                                      color: color,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTabletDesktopLayout(BuildContext context, {required bool isDesktop}) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isRtl = Directionality.of(context) == TextDirection.rtl;

    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final double minWidth = widget.isInCall ? 350.0 : 700.0;
          final double minHeight = 500.0;

          final needsHorizontalScroll = constraints.maxWidth < minWidth;
          final needsVerticalScroll = constraints.maxHeight < minHeight;

          Widget content = Row(
            children: [
              // Navigation Rail on the left
              if (!widget.isInCall)
                NavigationRail(
                  selectedIndex: widget.currentIndex,
                  onDestinationSelected: widget.onTabTapped,
                  labelType: NavigationRailLabelType.all,
                  backgroundColor: isDark ? const Color(0xFF101418) : const Color(0xFFF5F7F5),
                  indicatorColor: Colors.transparent,
                  selectedIconTheme: IconThemeData(
                    color: isDark ? Colors.white : theme.colorScheme.onSurface,
                  ),
                  unselectedIconTheme: IconThemeData(
                    color: isDark ? const Color(0xFF98989F) : const Color(0xFF8E8E93),
                  ),
                  selectedLabelTextStyle: TextStyle(
                    color: isDark ? Colors.white : theme.colorScheme.onSurface,
                    fontWeight: FontWeight.w600,
                    fontSize: 11,
                  ),
                  unselectedLabelTextStyle: TextStyle(
                    color: isDark ? const Color(0xFF98989F) : const Color(0xFF8E8E93),
                    fontWeight: FontWeight.w500,
                    fontSize: 11,
                  ),
                  destinations: List.generate(6, (i) {
                    return NavigationRailDestination(
                      icon: Icon(widget.tabIcons[i]),
                      selectedIcon: Icon(widget.tabActiveIcons[i]),
                      label: Text(widget.tabLabels[i]),
                    );
                  }),
                ),

              // Divider
              if (!widget.isInCall)
                VerticalDivider(
                  width: 1,
                  thickness: 1,
                  color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.08),
                ),

              // Master View (The List)
              SizedBox(
                width: _masterWidth, // Dynamic width for master view on desktop/tablet
                child: IndexedStack(
                  index: widget.currentIndex,
                  children: widget.screens,
                ),
              ),

              // Resizable Divider
              MouseRegion(
                cursor: SystemMouseCursors.resizeLeftRight,
                child: GestureDetector(
                  behavior: HitTestBehavior.translucent,
                  onPanUpdate: (details) {
                    setState(() {
                      if (isRtl) {
                        _masterWidth -= details.delta.dx;
                      } else {
                        _masterWidth += details.delta.dx;
                      }
                      // Set min and max limits for the master width
                      if (_masterWidth < 360) _masterWidth = 360;
                      if (_masterWidth > 600) _masterWidth = 600;
                    });
                  },
                  child: Container(
                    width: 5, // Slightly wider for easier grabbing
                    color: Colors.transparent, // Invisible draggable area
                    child: Center(
                      child: Container(
                        width: 1, // Visible divider line
                        color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.08),
                      ),
                    ),
                  ),
                ),
              ),

              // Detail View (The Chat/Keypad)
              Expanded(
                child: widget.detailView ?? _buildPlaceholder(context),
              ),
            ],
          );

          if (needsHorizontalScroll || needsVerticalScroll) {
            return SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: needsHorizontalScroll ? const AlwaysScrollableScrollPhysics() : const NeverScrollableScrollPhysics(),
              child: SingleChildScrollView(
                scrollDirection: Axis.vertical,
                physics: needsVerticalScroll ? const AlwaysScrollableScrollPhysics() : const NeverScrollableScrollPhysics(),
                child: SizedBox(
                  width: needsHorizontalScroll ? minWidth : constraints.maxWidth,
                  height: needsVerticalScroll ? minHeight : constraints.maxHeight,
                  child: content,
                ),
              ),
            );
          }

          return content;
        },
      ),
    );
  }

  Widget _buildPlaceholder(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Container(
      color: theme.scaffoldBackgroundColor,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.blur_on_rounded, // Temporary Nexa icon
              size: 100,
              color: isDark ? Colors.white24 : Colors.black12,
            ),
            const SizedBox(height: 24),
            Text(
              'Nexa Connect for Desktop',
              style: theme.textTheme.headlineSmall?.copyWith(
                color: isDark ? Colors.white54 : Colors.black54,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Select a chat or a call to start',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: isDark ? Colors.white38 : Colors.black38,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
