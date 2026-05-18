import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/config/env.dart';
import 'core/theme/app_theme.dart';
import 'core/providers/theme_provider.dart';
import 'features/home/screens/main_screen.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/auth/providers/auth_provider.dart';
import 'core/services/home_widget_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();

  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabaseAnonKey,
  );

  await HomeWidgetService.initialize();

  runApp(
    EasyLocalization(
      supportedLocales: const [Locale('en'), Locale('ar'), Locale('uk'), Locale('ru')],
      path: 'assets/translations',
      fallbackLocale: const Locale('en'),
      useOnlyLangCode: true,
      child: const ProviderScope(child: NexaConnectApp()),
    ),
  );
}

class NexaConnectApp extends ConsumerWidget {
  const NexaConnectApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'Nexa Connect',
      debugShowCheckedModeBanner: false,
      localizationsDelegates: context.localizationDelegates,
      supportedLocales: context.supportedLocales,
      locale: context.locale,
      theme: AppTheme.lightTheme(context.locale.languageCode),
      darkTheme: AppTheme.darkTheme(context.locale.languageCode),
      themeMode: ref.watch(themeModeProvider),
      home: switch (authState.status) {
        NexaAuthStatus.loading => const Scaffold(body: Center(child: CircularProgressIndicator())),
        NexaAuthStatus.authenticated => const MainScreen(),
        NexaAuthStatus.unauthenticated => const LoginScreen(),
      },
    );
  }
}
