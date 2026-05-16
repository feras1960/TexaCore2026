import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'sip_service.dart';

/// Config received from ERP Frontend
class ErpConfig {
  final String domain;
  final String port;
  final String extension;
  final String password;
  final String wssUrl;
  final String userId;
  final String userEmail;
  final String userName;
  final String companyId;
  final String tenantId;
  final String supabaseUrl;
  final String supabaseAnonKey;

  ErpConfig({
    this.domain = '',
    this.port = '',
    this.extension = '',
    this.password = '',
    this.wssUrl = '',
    this.userId = '',
    this.userEmail = '',
    this.userName = '',
    this.companyId = '',
    this.tenantId = '',
    this.supabaseUrl = '',
    this.supabaseAnonKey = '',
  });

  factory ErpConfig.fromPayload(Map<String, dynamic> payload) {
    return ErpConfig(
      domain: payload['domain'] as String? ?? '',
      port: payload['port'] as String? ?? '',
      extension: payload['extension'] as String? ?? '',
      password: payload['password'] as String? ?? '',
      wssUrl: payload['wss_url'] as String? ?? '',
      userId: payload['user_id'] as String? ?? '',
      userEmail: payload['user_email'] as String? ?? '',
      userName: payload['user_name'] as String? ?? '',
      companyId: payload['company_id'] as String? ?? '',
      tenantId: payload['tenant_id'] as String? ?? '',
      supabaseUrl: payload['supabase_url'] as String? ?? '',
      supabaseAnonKey: payload['supabase_anon_key'] as String? ?? '',
    );
  }

  bool get isValid => companyId.isNotEmpty && tenantId.isNotEmpty;
}

/// ErpBridgeService — Bridges Nexa Connect ↔ ERP Frontend
/// Uses the SAME Supabase Realtime protocol as the Electron Desktop app:
///   Channel: pbx_softphone_sync
///   Presence: { type: 'desktop_softphone', extension: '101' }
///   Broadcasts: dial, hangup, softphone-config, desktop_call_state
class ErpBridgeService extends ChangeNotifier {
  final SupabaseClient _client;
  final SipService _sipService;
  final String _extension;

  RealtimeChannel? _syncChannel;
  bool _isConnected = false;
  Timer? _callStateTimer;
  ErpConfig? _erpConfig;

  /// Callback when config is received from ERP
  void Function(ErpConfig config)? onConfigReceived;

  bool get isConnected => _isConnected;
  ErpConfig? get erpConfig => _erpConfig;

  ErpBridgeService(this._client, this._sipService, this._extension);

  /// Initialize: join the sync channel and announce presence
  Future<void> connect() async {
    debugPrint('[ErpBridge] 🔗 Connecting to pbx_softphone_sync as ext $_extension...');

    _syncChannel = _client.channel(
      'pbx_softphone_sync',
      opts: RealtimeChannelConfig(
        key: 'nexa_$_extension',
        self: true,
      ),
    );

    // Listen for commands from ERP Frontend
    _syncChannel!
        // 1. Dial command from ERP
        .onBroadcast(
          event: 'dial',
          callback: (payload) {
            final number = payload['number'] as String?;
            if (number != null && number.isNotEmpty) {
              debugPrint('[ErpBridge] 📞 Dial command from ERP: $number');
              _sipService.makeCall(number);
            }
          },
        )
        // 2. Hangup command from ERP
        .onBroadcast(
          event: 'hangup',
          callback: (payload) {
            debugPrint('[ErpBridge] 📴 Hangup command from ERP');
            _sipService.hangup();
          },
        )
        // 3. Full config from ERP (company, tenant, user, extension, credentials)
        .onBroadcast(
          event: 'softphone-config',
          callback: (payload) {
            _erpConfig = ErpConfig.fromPayload(payload);
            debugPrint('[ErpBridge] ⚙️ Config received from ERP:');
            debugPrint('  📧 User: ${_erpConfig!.userEmail}');
            debugPrint('  🏢 Company: ${_erpConfig!.companyId}');
            debugPrint('  🏗️ Tenant: ${_erpConfig!.tenantId}');
            debugPrint('  📞 Extension: ${_erpConfig!.extension}');
            notifyListeners();
            onConfigReceived?.call(_erpConfig!);
          },
        )
        // 4. Web call request from ERP
        .onBroadcast(
          event: 'web-call',
          callback: (payload) {
            final visitorId = payload['visitor_id'] as String?;
            debugPrint('[ErpBridge] 🌐 Web call request: visitor=$visitorId');
          },
        );

    // Subscribe with presence tracking
    _syncChannel!.subscribe((status, error) {
      debugPrint('[ErpBridge] Channel status: $status');
      if (status == RealtimeSubscribeStatus.subscribed) {
        // Announce presence as desktop_softphone (same as Electron)
        _syncChannel!.track({
          'type': 'desktop_softphone',
          'extension': _extension,
          'app': 'nexa_connect_flutter',
          'platform': defaultTargetPlatform.name,
          'online_at': DateTime.now().toUtc().toIso8601String(),
        });
        _isConnected = true;
        notifyListeners();
        debugPrint('[ErpBridge] ✅ Connected & Presence tracked as ext $_extension');
      } else if (status == RealtimeSubscribeStatus.closed) {
        _isConnected = false;
        notifyListeners();
      }
    });

    // Listen to SIP state changes and broadcast to ERP
    _sipService.addListener(_onSipStateChanged);

    // Periodic call state broadcast (every 1s during active call)
    _callStateTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      _broadcastCallState();
    });
  }

  void _onSipStateChanged() {
    _broadcastCallState();
  }

  /// Broadcast current call state to ERP Frontend
  void _broadcastCallState() {
    if (_syncChannel == null || !_isConnected) return;

    final activeCall = _sipService.activeCall;
    final callState = _sipService.callState;

    // Map SipService state to ERP-compatible state
    String stateStr;
    switch (callState) {
      case NexaCallState.idle:
        stateStr = 'idle';
        break;
      case NexaCallState.connecting:
        stateStr = 'connecting';
        break;
      case NexaCallState.ringing:
        stateStr = 'ringing';
        break;
      case NexaCallState.connected:
        stateStr = 'connected';
        break;
      case NexaCallState.ended:
        stateStr = 'idle';
        break;
    }

    // Calculate duration
    int duration = 0;
    if (activeCall != null && callState == NexaCallState.connected) {
      duration = DateTime.now().difference(activeCall.startTime ?? DateTime.now()).inSeconds;
    }

    final payload = {
      'state': stateStr,
      'remoteNumber': activeCall?.remoteNumber ?? '',
      'duration': duration,
      'direction': activeCall?.direction.name ?? '',
      'extension': _extension,
    };

    // Only broadcast when there's meaningful state (not idle with no info)
    if (stateStr != 'idle' || (activeCall != null)) {
      _syncChannel!.sendBroadcastMessage(
        event: 'desktop_call_state',
        payload: payload,
      );
    }
  }

  /// Send a dial command TO the ERP (for click-to-call FROM app)
  void notifyErpOfCall(String number, String direction) {
    if (_syncChannel == null || !_isConnected) return;
    
    _syncChannel!.sendBroadcastMessage(
      event: 'desktop_call_state',
      payload: {
        'state': 'connecting',
        'remoteNumber': number,
        'duration': 0,
        'direction': direction,
        'extension': _extension,
      },
    );
    debugPrint('[ErpBridge] 📤 Notified ERP of call to $number');
  }

  /// Disconnect and cleanup
  Future<void> disconnect() async {
    _callStateTimer?.cancel();
    _sipService.removeListener(_onSipStateChanged);

    if (_syncChannel != null) {
      await _syncChannel!.untrack();
      await _client.removeChannel(_syncChannel!);
      _syncChannel = null;
    }

    _isConnected = false;
    notifyListeners();
    debugPrint('[ErpBridge] 🔌 Disconnected');
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}
