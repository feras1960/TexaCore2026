/// SIP Account model for multi-account support
class SipAccount {
  final String id;
  final String displayName;
  final String server;
  final int port;
  final String username;
  final String password;
  final bool isActive;
  final String transport; // WS, WSS

  SipAccount({
    required this.id,
    required this.displayName,
    required this.server,
    this.port = 8089,
    required this.username,
    required this.password,
    this.isActive = false,
    this.transport = 'WSS',
  });

  SipAccount copyWith({
    String? id,
    String? displayName,
    String? server,
    int? port,
    String? username,
    String? password,
    bool? isActive,
    String? transport,
  }) {
    return SipAccount(
      id: id ?? this.id,
      displayName: displayName ?? this.displayName,
      server: server ?? this.server,
      port: port ?? this.port,
      username: username ?? this.username,
      password: password ?? this.password,
      isActive: isActive ?? this.isActive,
      transport: transport ?? this.transport,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'displayName': displayName,
        'server': server,
        'port': port,
        'username': username,
        'password': password,
        'isActive': isActive,
        'transport': transport,
      };

  factory SipAccount.fromJson(Map<String, dynamic> json) => SipAccount(
        id: json['id'],
        displayName: json['displayName'],
        server: json['server'],
        port: json['port'] ?? 8089,
        username: json['username'],
        password: json['password'],
        isActive: json['isActive'] ?? false,
        transport: json['transport'] ?? 'WSS',
      );
}
