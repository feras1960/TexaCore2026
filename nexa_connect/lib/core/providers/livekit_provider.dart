import 'dart:math';
// ignore: depend_on_referenced_packages
import 'package:flutter_riverpod/legacy.dart';
import '../services/livekit_service.dart';
import '../services/livekit_ptt_service.dart';
import '../services/livekit_call_service.dart';
import 'supabase_provider.dart';
import '../config/env.dart';

/// Generate a unique UUID v4 per browser tab for testing
String _generateGuestUUID() {
  final rand = Random.secure();
  final bytes = List<int>.generate(16, (_) => rand.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0,8)}-${hex.substring(8,12)}-${hex.substring(12,16)}-${hex.substring(16,20)}-${hex.substring(20)}';
}

/// Shared guest user ID — same across PTT and Calls
final _guestUserId = _generateGuestUUID();

/// LiveKit Service Provider (Singleton)
final livekitServiceProvider = ChangeNotifierProvider<LiveKitService>((ref) {
  return LiveKitService();
});

/// Get the current user ID (auth or guest)
String _getUserId(dynamic ref) {
  final client = ref.read(supabaseClientProvider);
  return client.auth.currentUser?.id ?? _guestUserId;
}

/// LiveKit PTT Service Provider
final livekitPttProvider = ChangeNotifierProvider<LiveKitPttService>((ref) {
  final livekit = ref.read(livekitServiceProvider);
  final client = ref.read(supabaseClientProvider);
  final userId = _getUserId(ref);
  
  final service = LiveKitPttService(livekit, client, userId);
  service.loadChannels();
  return service;
});

/// LiveKit Call Service Provider (1:1 voice/video calls — مستقل عن PTT)
final livekitCallProvider = ChangeNotifierProvider<LiveKitCallService>((ref) {
  final client = ref.read(supabaseClientProvider);
  final userId = _getUserId(ref);
  
  final service = LiveKitCallService(client, userId, 'User');
  service.initialize();
  return service;
});
