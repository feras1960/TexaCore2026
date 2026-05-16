import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/models/call_log.dart';
import '../../../core/services/call_log_service.dart';
import '../../../core/providers/supabase_provider.dart';
import 'sip_provider.dart';

import '../../../core/config/env.dart';
import '../../../core/services/erp_bridge_service.dart';

/// Company ID provider — priority: ERP config → auth user → default
final companyIdProvider = Provider<String>((ref) {
  // 1. From ERP Frontend config (sent via Bridge)
  final erpConfig = ref.watch(erpConfigStateProvider);
  if (erpConfig != null && erpConfig.companyId.isNotEmpty) {
    return erpConfig.companyId;
  }
  // 2. From Supabase auth user
  final client = ref.watch(supabaseClientProvider);
  final user = client.auth.currentUser;
  final fromAuth = user?.userMetadata?['company_id'] as String?;
  if (fromAuth != null && fromAuth.isNotEmpty) return fromAuth;
  // 3. Default fallback
  return Env.defaultCompanyId;
});

/// Tenant ID provider — priority: ERP config → auth user → default
final tenantIdProvider = Provider<String>((ref) {
  final erpConfig = ref.watch(erpConfigStateProvider);
  if (erpConfig != null && erpConfig.tenantId.isNotEmpty) {
    return erpConfig.tenantId;
  }
  final client = ref.watch(supabaseClientProvider);
  final user = client.auth.currentUser;
  final fromAuth = user?.userMetadata?['tenant_id'] as String?;
  if (fromAuth != null && fromAuth.isNotEmpty) return fromAuth;
  return Env.defaultTenantId;
});

/// CallLogService provider
final callLogServiceProvider = Provider<CallLogService?>((ref) {
  final client = ref.watch(supabaseClientProvider);
  final companyId = ref.watch(companyIdProvider);
  if (companyId.isEmpty) return null;
  return CallLogService(client, companyId);
});

/// Call history provider — loads from Supabase with realtime sync
final callHistoryProvider =
    NotifierProvider<CallHistoryNotifier, List<CallLog>>(() {
  return CallHistoryNotifier();
});

class CallHistoryNotifier extends Notifier<List<CallLog>> {
  RealtimeChannel? _realtimeChannel;

  @override
  List<CallLog> build() {
    final logService = ref.watch(callLogServiceProvider);
    final sipService = ref.read(sipServiceProvider);

    // Wire up SIP call-ended → Supabase
    sipService.onCallEnded = (call, durationSeconds) {
      debugPrint(
          '[CallHistory] 📞 Call ended: ${call.remoteNumber} (${durationSeconds}s)');

      final status = durationSeconds > 0 ? 'answered' : 'missed';
      final isOutbound = call.direction.name == 'outbound';

      logService?.saveCallLog(
        caller: isOutbound ? '101' : call.remoteNumber,
        callee: isOutbound ? call.remoteNumber : '101',
        direction: isOutbound
            ? CallDirection.outgoing
            : CallDirection.incoming,
        durationSeconds: durationSeconds,
        status: status,
      );

      // Add to local state immediately (optimistic)
      final newLog = CallLog(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        number: call.remoteNumber,
        name: null,
        timestamp: DateTime.now(),
        duration: Duration(seconds: durationSeconds),
        direction: durationSeconds == 0
            ? CallDirection.missed
            : (isOutbound
                ? CallDirection.outgoing
                : CallDirection.incoming),
      );
      state = [newLog, ...state];
    };

    // Load initial data from Supabase
    _loadFromSupabase(logService);

    // Setup realtime
    _setupRealtime(logService);

    ref.onDispose(() {
      _realtimeChannel?.unsubscribe();
    });

    // Start with empty list — real data loads from Supabase
    return [];
  }

  Future<void> _loadFromSupabase(CallLogService? service) async {
    if (service == null) return;
    try {
      final logs = await service.fetchRecentCalls();
      state = logs;
      debugPrint('[CallHistory] ✅ Loaded ${logs.length} call logs from Supabase');
    } catch (e) {
      debugPrint('[CallHistory] ⚠️ Could not load from Supabase: $e');
    }
  }

  void _setupRealtime(CallLogService? service) {
    if (service == null) return;
    _realtimeChannel = service.subscribeToCallLogs((logs) {
      state = logs;
      debugPrint('[CallHistory] 🔄 Realtime update: ${logs.length} logs');
    });
  }

  void addLog(CallLog log) {
    state = [log, ...state];
  }
}
