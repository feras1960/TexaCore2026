import 'package:flutter_riverpod/flutter_riverpod.dart';
// ignore: depend_on_referenced_packages
import 'package:flutter_riverpod/legacy.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'package:flutter/foundation.dart';
import '../../../core/services/sip_service.dart';
import '../../../core/services/erp_bridge_service.dart';
import '../../../core/providers/supabase_provider.dart';
import '../../../core/config/env.dart';

/// Provides the singleton SipService instance (ChangeNotifier-based)
final sipServiceProvider = ChangeNotifierProvider<SipService>((ref) {
  final service = SipService();
  
  // Determine SIP extension:
  // 1. LocalStorage saved account
  // 2. URL param ?ext=102
  // 3. Port-based: 8092→102, default→101
  String? extParam = html.window.localStorage['active_sip_ext'];
  
  // Check URL search params
  if (extParam == null) {
    final search = html.window.location.search ?? '';
    if (search.contains('ext=')) {
      extParam = Uri.parse('http://x$search').queryParameters['ext'];
    }
  }
  
  // Check hash params
  if (extParam == null) {
    final hash = html.window.location.hash ?? '';
    if (hash.contains('ext=')) {
      final hashQuery = hash.contains('?') ? hash.substring(hash.indexOf('?')) : '';
      extParam = Uri.parse('http://x$hashQuery').queryParameters['ext'];
    }
  }
  
  // Port-based fallback: 8092 → ext 102
  if (extParam == null) {
    final port = html.window.location.port;
    if (port == '8092') extParam = '102';
    if (port == '8093') extParam = '103';
  }
  
  if (extParam != null && extParam.isNotEmpty) {
    service.register(
      username: extParam,
      password: 'TexaCore2026Pbx$extParam',
    );
    debugPrint('[SIP] 📱 Using extension: $extParam (saved in storage or port: ${html.window.location.port})');
  } else {
    service.register();
  }
  
  ref.onDispose(() => service.dispose());
  return service;
});

/// ErpBridge — connects Nexa Connect ↔ ERP Frontend (bidirectional)
final erpBridgeProvider = Provider<ErpBridgeService>((ref) {
  final client = ref.watch(supabaseClientProvider);
  final sipService = ref.watch(sipServiceProvider);
  // Extension from SIP config (default 101)
  const extension = '101';

  final bridge = ErpBridgeService(client, sipService, extension);

  // When config arrives from ERP, update company/tenant and reload contacts
  bridge.onConfigReceived = (config) {
    if (config.isValid) {
      ref.read(erpConfigStateProvider.notifier).update(config);
    }
  };

  // Auto-connect
  bridge.connect();
  ref.onDispose(() => bridge.disconnect());
  return bridge;
});

/// Stores the ERP config received from the frontend
final erpConfigStateProvider = NotifierProvider<ErpConfigNotifier, ErpConfig?>(() {
  return ErpConfigNotifier();
});

class ErpConfigNotifier extends Notifier<ErpConfig?> {
  @override
  ErpConfig? build() => null;

  void update(ErpConfig config) {
    state = config;
  }
}

/// Watches SIP registration state reactively
final sipRegistrationProvider =
    NotifierProvider<SipRegistrationNotifier, String>(() {
  return SipRegistrationNotifier();
});

class SipRegistrationNotifier extends Notifier<String> {
  late SipService _sipService;

  @override
  String build() {
    _sipService = ref.watch(sipServiceProvider);

    // Listen to changes from SipService
    void listener() {
      final newState = _sipService.registrationState;
      if (state != newState) {
        state = newState;
      }
    }

    _sipService.addListener(listener);
    ref.onDispose(() => _sipService.removeListener(listener));

    return _sipService.registrationState;
  }

  void register(String sipServer, String username, String password) {
    _sipService.register(
      server: sipServer,
      username: username,
      password: password,
    );
  }
}

/// Watches the current call state reactively
final callStateProvider = NotifierProvider<CallStateNotifier, NexaCallState>(() {
  return CallStateNotifier();
});

class CallStateNotifier extends Notifier<NexaCallState> {
  late SipService _sipService;

  @override
  NexaCallState build() {
    _sipService = ref.watch(sipServiceProvider);

    void listener() {
      if (state != _sipService.callState) {
        state = _sipService.callState;
      }
    }

    _sipService.addListener(listener);
    ref.onDispose(() => _sipService.removeListener(listener));

    return _sipService.callState;
  }
}

/// Watches the active call info reactively
final activeCallProvider = NotifierProvider<ActiveCallNotifier, ActiveCall?>(() {
  return ActiveCallNotifier();
});

class ActiveCallNotifier extends Notifier<ActiveCall?> {
  late SipService _sipService;

  @override
  ActiveCall? build() {
    _sipService = ref.watch(sipServiceProvider);

    void listener() {
      state = _sipService.activeCall;
    }

    _sipService.addListener(listener);
    ref.onDispose(() => _sipService.removeListener(listener));

    return _sipService.activeCall;
  }
}

/// Watches the held call (for multi-call / transfer scenarios)
final heldCallProvider = NotifierProvider<HeldCallNotifier, ActiveCall?>(() {
  return HeldCallNotifier();
});

class HeldCallNotifier extends Notifier<ActiveCall?> {
  late SipService _sipService;

  @override
  ActiveCall? build() {
    _sipService = ref.watch(sipServiceProvider);

    void listener() {
      state = _sipService.heldCall;
    }

    _sipService.addListener(listener);
    ref.onDispose(() => _sipService.removeListener(listener));

    return _sipService.heldCall;
  }
}

/// Whether we are in multi-call mode (active + held)
final isMultiCallProvider = Provider<bool>((ref) {
  final sip = ref.watch(sipServiceProvider);
  return sip.isMultiCall;
});

/// Whether we are in transfer consultation mode
final isTransferConsultationProvider = Provider<bool>((ref) {
  final sip = ref.watch(sipServiceProvider);
  return sip.isTransferConsultation;
});
