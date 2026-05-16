import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Light Mode Colors (iOS WhatsApp Style)
  static const Color _lightPrimary = Color(0xFF25D366); // WhatsApp Green
  static const Color _lightOnPrimary = Color(0xFFFFFFFF);
  static const Color _lightPrimaryContainer = Color(0xFFDCF8C6); // Light WA Green bubble
  static const Color _lightOnPrimaryContainer = Color(0xFF075E54); // Dark WA Green
  static const Color _lightSurface = Color(0xFFFFFFFF);
  static const Color _lightOnSurface = Color(0xFF000000);
  static const Color _lightSurfaceVariant = Color(0xFFF2F2F7); // iOS Grouped Background
  static const Color _lightOutline = Color(0xFFC6C6C8); // iOS Gray Divider
  static const Color _lightBackground = Color(0xFFFFFFFF);
  static const Color _lightScaffoldBackground = Color(0xFFFFFFFF);

  // Dark Mode Colors (iOS WhatsApp Style)
  static const Color _darkPrimary = Color(0xFF25D366);
  static const Color _darkOnPrimary = Color(0xFFFFFFFF);
  static const Color _darkPrimaryContainer = Color(0xFF056162); // Dark WA bubble
  static const Color _darkOnPrimaryContainer = Color(0xFFE1F5FE);
  static const Color _darkSurface = Color(0xFF000000); // Pure black
  static const Color _darkOnSurface = Color(0xFFFFFFFF);
  static const Color _darkSurfaceVariant = Color(0xFF1C1C1E); // iOS Dark Surface
  static const Color _darkOutline = Color(0xFF38383A); // iOS Dark Divider
  static const Color _darkBackground = Color(0xFF000000);
  static const Color _darkScaffoldBackground = Color(0xFF000000);

  // Status Colors (Shared)
  static const Color successColor = Color(0xFF34C759); // iOS Green
  static const Color errorColor = Color(0xFFFF3B30); // iOS Red
  static const Color warningColor = Color(0xFFFFCC00); // iOS Yellow
  static const Color infoColor = Color(0xFF007AFF); // iOS Blue
  static const Color onlineColor = Color(0xFF34C759);

  static TextTheme _buildTextTheme(TextTheme base, String locale) {
    // SF Pro / System Font look. Inter is the closest free Google font to SF Pro.
    final fontFamily = locale == 'ar' ? GoogleFonts.notoSansArabic().fontFamily : GoogleFonts.inter().fontFamily;

    return base.copyWith(
      displayLarge: TextStyle(fontFamily: fontFamily, fontSize: 34, fontWeight: FontWeight.bold, letterSpacing: 0.3),
      displayMedium: TextStyle(fontFamily: fontFamily, fontSize: 28, fontWeight: FontWeight.bold, letterSpacing: 0.3),
      headlineLarge: TextStyle(fontFamily: fontFamily, fontSize: 24, fontWeight: FontWeight.w600, letterSpacing: -0.5),
      headlineMedium: TextStyle(fontFamily: fontFamily, fontSize: 20, fontWeight: FontWeight.w600, letterSpacing: -0.5),
      titleLarge: TextStyle(fontFamily: fontFamily, fontSize: 18, fontWeight: FontWeight.w600, letterSpacing: -0.5),
      titleMedium: TextStyle(fontFamily: fontFamily, fontSize: 17, fontWeight: FontWeight.w500, letterSpacing: -0.4), // iOS standard list text
      bodyLarge: TextStyle(fontFamily: fontFamily, fontSize: 17, fontWeight: FontWeight.w400, letterSpacing: -0.4), // iOS standard body
      bodyMedium: TextStyle(fontFamily: fontFamily, fontSize: 15, fontWeight: FontWeight.w400, letterSpacing: -0.2), // iOS secondary text
      bodySmall: TextStyle(fontFamily: fontFamily, fontSize: 13, fontWeight: FontWeight.w400, letterSpacing: 0),
      labelLarge: TextStyle(fontFamily: fontFamily, fontSize: 14, fontWeight: FontWeight.w600),
      labelSmall: TextStyle(fontFamily: fontFamily, fontSize: 11, fontWeight: FontWeight.w500), // iOS Tab bar text
    );
  }

  static ThemeData lightTheme(String locale) {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: const ColorScheme.light(
        primary: _lightPrimary,
        onPrimary: _lightOnPrimary,
        primaryContainer: _lightPrimaryContainer,
        onPrimaryContainer: _lightOnPrimaryContainer,
        surface: _lightSurface,
        onSurface: _lightOnSurface,
        surfaceContainerHighest: _lightSurfaceVariant,
        outline: _lightOutline,
        error: errorColor,
      ),
      scaffoldBackgroundColor: _lightScaffoldBackground,
      textTheme: _buildTextTheme(ThemeData.light().textTheme, locale),
      appBarTheme: const AppBarTheme(
        backgroundColor: _lightSurface,
        foregroundColor: _lightOnSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: infoColor), // iOS uses blue for navigation actions often, but WA uses green
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: const Color(0xFFF9F9F9), // iOS Tab Bar Color
        indicatorColor: Colors.transparent, // Disable the Android pill indicator!
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: _lightOnSurface);
          }
          return const TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: Color(0xFF8E8E93));
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return IconThemeData(color: _lightOnSurface, size: 26);
          }
          return const IconThemeData(color: Color(0xFF8E8E93), size: 26);
        }),
        elevation: 0,
      ),
      cardTheme: const CardThemeData(
        color: _lightSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.zero,
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: _lightOutline,
        thickness: 0.5,
        space: 0,
      ),
    );
  }

  static ThemeData darkTheme(String locale) {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: const ColorScheme.dark(
        primary: _darkPrimary,
        onPrimary: _darkOnPrimary,
        primaryContainer: _darkPrimaryContainer,
        onPrimaryContainer: _darkOnPrimaryContainer,
        surface: _darkSurface,
        onSurface: _darkOnSurface,
        surfaceContainerHighest: _darkSurfaceVariant,
        outline: _darkOutline,
        error: errorColor,
      ),
      scaffoldBackgroundColor: _darkScaffoldBackground,
      textTheme: _buildTextTheme(ThemeData.dark().textTheme, locale),
      appBarTheme: const AppBarTheme(
        backgroundColor: _darkSurface,
        foregroundColor: _darkOnSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: const Color(0xFF161616),
        indicatorColor: Colors.transparent,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: _darkOnSurface);
          }
          return const TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: Color(0xFF98989F));
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return IconThemeData(color: _darkOnSurface, size: 26);
          }
          return const IconThemeData(color: Color(0xFF98989F), size: 26);
        }),
        elevation: 0,
      ),
      cardTheme: const CardThemeData(
        color: _darkSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      ),
      dividerTheme: const DividerThemeData(
        color: _darkOutline,
        thickness: 0.5,
        space: 0,
      ),
    );
  }
}
