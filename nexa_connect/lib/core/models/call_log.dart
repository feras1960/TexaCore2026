enum CallDirection { incoming, outgoing, missed }

class CallLog {
  final String id;
  final String number;
  final String? name;
  final DateTime timestamp;
  final Duration duration;
  final CallDirection direction;

  CallLog({
    required this.id,
    required this.number,
    this.name,
    required this.timestamp,
    required this.duration,
    required this.direction,
  });
}
