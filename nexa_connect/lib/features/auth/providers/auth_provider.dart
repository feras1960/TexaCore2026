import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;

enum NexaAuthStatus { loading, authenticated, unauthenticated }

class NexaAuthState {
  final NexaAuthStatus status;
  final User? user;
  final String? error;

  const NexaAuthState({
    this.status = NexaAuthStatus.loading,
    this.user,
    this.error,
  });

  NexaAuthState copyWith({NexaAuthStatus? status, User? user, String? error}) {
    return NexaAuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      error: error,
    );
  }
}

class AuthNotifier extends Notifier<NexaAuthState> {
  @override
  NexaAuthState build() {
    final supabase = Supabase.instance.client;
    final session = supabase.auth.currentSession;

    supabase.auth.onAuthStateChange.listen((data) {
      final event = data.event;
      if (event == AuthChangeEvent.signedIn || event == AuthChangeEvent.tokenRefreshed) {
        state = NexaAuthState(status: NexaAuthStatus.authenticated, user: data.session?.user);
      } else if (event == AuthChangeEvent.signedOut) {
        state = const NexaAuthState(status: NexaAuthStatus.unauthenticated);
      }
    });

    if (session != null) {
      return NexaAuthState(status: NexaAuthStatus.authenticated, user: supabase.auth.currentUser);
    }
    return const NexaAuthState(status: NexaAuthStatus.unauthenticated);
  }

  SupabaseClient get _supabase => Supabase.instance.client;

  Future<bool> signIn({required String email, required String password}) async {
    state = state.copyWith(status: NexaAuthStatus.loading, error: null);
    try {
      await _supabase.auth.signInWithPassword(email: email, password: password);
      return true;
    } on AuthException catch (e) {
      state = NexaAuthState(status: NexaAuthStatus.unauthenticated, error: e.message);
      return false;
    } catch (e) {
      state = NexaAuthState(status: NexaAuthStatus.unauthenticated, error: e.toString());
      return false;
    }
  }

  Future<bool> signUp({required String email, required String password, required String fullName, String? phone}) async {
    state = state.copyWith(status: NexaAuthStatus.loading, error: null);
    try {
      await _supabase.auth.signUp(email: email, password: password, data: {
        'full_name': fullName,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      });
      return true;
    } on AuthException catch (e) {
      state = NexaAuthState(status: NexaAuthStatus.unauthenticated, error: e.message);
      return false;
    } catch (e) {
      state = NexaAuthState(status: NexaAuthStatus.unauthenticated, error: e.toString());
      return false;
    }
  }

  Future<bool> signUpWithPhone({required String phone, required String fullName}) async {
    state = state.copyWith(status: NexaAuthStatus.loading, error: null);
    try {
      await _supabase.auth.signInWithOtp(phone: phone, data: {'full_name': fullName});
      return true;
    } on AuthException catch (e) {
      state = NexaAuthState(status: NexaAuthStatus.unauthenticated, error: e.message);
      return false;
    } catch (e) {
      state = NexaAuthState(status: NexaAuthStatus.unauthenticated, error: e.toString());
      return false;
    }
  }

  Future<bool> verifyOtp({required String phone, required String token}) async {
    state = state.copyWith(status: NexaAuthStatus.loading, error: null);
    try {
      await _supabase.auth.verifyOTP(phone: phone, token: token, type: OtpType.sms);
      return true;
    } on AuthException catch (e) {
      state = NexaAuthState(status: NexaAuthStatus.unauthenticated, error: e.message);
      return false;
    } catch (e) {
      state = NexaAuthState(status: NexaAuthStatus.unauthenticated, error: e.toString());
      return false;
    }
  }

  Future<bool> resetPassword(String email) async {
    try {
      await _supabase.auth.resetPasswordForEmail(email);
      return true;
    } catch (e) {
      debugPrint('[Auth] Reset password error: $e');
      return false;
    }
  }
  /// تسجيل دخول بحساب Google
  Future<bool> signInWithGoogle() async {
    state = state.copyWith(status: NexaAuthStatus.loading, error: null);
    try {
      await _supabase.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'io.supabase.nexaconnect://login-callback/',
      );
      return true;
    } on AuthException catch (e) {
      state = NexaAuthState(status: NexaAuthStatus.unauthenticated, error: e.message);
      return false;
    } catch (e) {
      state = NexaAuthState(status: NexaAuthStatus.unauthenticated, error: e.toString());
      return false;
    }
  }

  /// تسجيل دخول بحساب Apple
  Future<bool> signInWithApple() async {
    state = state.copyWith(status: NexaAuthStatus.loading, error: null);
    try {
      await _supabase.auth.signInWithOAuth(
        OAuthProvider.apple,
        redirectTo: 'io.supabase.nexaconnect://login-callback/',
      );
      return true;
    } on AuthException catch (e) {
      state = NexaAuthState(status: NexaAuthStatus.unauthenticated, error: e.message);
      return false;
    } catch (e) {
      state = NexaAuthState(status: NexaAuthStatus.unauthenticated, error: e.toString());
      return false;
    }
  }

  Future<void> signOut() async {
    await _supabase.auth.signOut();
    state = const NexaAuthState(status: NexaAuthStatus.unauthenticated);
  }
}

final authProvider = NotifierProvider<AuthNotifier, NexaAuthState>(AuthNotifier.new);
