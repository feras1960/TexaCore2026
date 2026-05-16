import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/call_log.dart';

/// Service to persist call logs to Supabase `pbx_call_logs` table
class CallLogService {
  final SupabaseClient _client;
  final String _companyId;

  CallLogService(this._client, this._companyId);

  /// Save a call log after call ends
  Future<void> saveCallLog({
    required String caller,
    required String callee,
    required CallDirection direction,
    required int durationSeconds,
    required String status, // 'answered', 'missed', 'busy', 'failed'
    String? recordingUrl,
  }) async {
    try {
      final directionStr = direction == CallDirection.outgoing
          ? 'outbound'
          : direction == CallDirection.incoming
              ? 'inbound'
              : 'missed';

      await _client.from('pbx_call_logs').insert({
        'company_id': _companyId,
        'caller': caller,
        'callee': callee,
        'direction': directionStr,
        'duration_seconds': durationSeconds,
        'status': status,
        'recording_url': recordingUrl,
        'call_date': DateTime.now().toUtc().toIso8601String(),
      });

      debugPrint(
          '[CallLog] ✅ Saved: $caller → $callee ($directionStr, ${durationSeconds}s)');
    } catch (e) {
      debugPrint('[CallLog] ❌ Error saving: $e');
    }
  }

  /// Fetch recent call logs from Supabase
  Future<List<CallLog>> fetchRecentCalls({int limit = 50}) async {
    try {
      final response = await _client
          .from('pbx_call_logs')
          .select()
          .eq('company_id', _companyId)
          .order('call_date', ascending: false)
          .limit(limit);

      return (response as List).map((row) {
        final direction = switch (row['direction']) {
          'outbound' => CallDirection.outgoing,
          'inbound' => CallDirection.incoming,
          _ => CallDirection.missed,
        };

        // Override to missed if status is 'missed'
        final finalDirection =
            row['status'] == 'missed' ? CallDirection.missed : direction;

        return CallLog(
          id: row['id'],
          number: finalDirection == CallDirection.outgoing
              ? row['callee']
              : row['caller'],
          name: null, // Will be resolved from contacts
          timestamp: DateTime.parse(row['call_date']),
          duration: Duration(seconds: row['duration_seconds'] ?? 0),
          direction: finalDirection,
        );
      }).toList();
    } catch (e) {
      debugPrint('[CallLog] ❌ Error fetching: $e');
      return [];
    }
  }

  /// Subscribe to realtime call log changes
  RealtimeChannel subscribeToCallLogs(void Function(List<CallLog>) onUpdate) {
    return _client
        .channel('pbx_call_logs_realtime')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'pbx_call_logs',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'company_id',
            value: _companyId,
          ),
          callback: (payload) {
            debugPrint('[CallLog] 🔔 Realtime: new call log received');
            // Refetch all to stay in sync
            fetchRecentCalls().then(onUpdate);
          },
        )
        .subscribe();
  }
}
