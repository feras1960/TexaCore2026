class Env {
  static const supabaseUrl = 'https://wzkklenfsaepegymfxfz.supabase.co';
  static const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2tsZW5mc2FlcGVneW1meGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTIxNzcsImV4cCI6MjA4NDMyODE3N30.ATYSK_WvOfbqEaInbg5nKau-wgixF0lIGaue3m8AJtI';
  
  // PBX Configuration (Asterisk — للمقاسم وربط الخطوط)
  static const pbxDomain = 'pbx.texacore.ai';
  static const pbxWssPort = '8089';
  static const pbxWssUrl = 'wss://pbx.texacore.ai:8089/ws';

  // LiveKit Configuration (للاتصالات الداخلية + PTT + فيديو)
  static const livekitUrl = 'wss://pbx.texacore.ai:7443';
  static const livekitApiKey = 'APITexaCore456c6933';
  // API Secret يجب ألا يكون في التطبيق — يُستخدم فقط في Edge Function

  // Default company (used when no auth session)
  // Feras / Next Revolution — TexaCore Admin tenant
  static const defaultCompanyId = '1313232a-6ad3-4002-891c-a9a9e8849a93';
  static const defaultTenantId = '681aa0e4-7692-4337-a3e8-2c127f80e573';
  static const defaultUserId = '85adc738-b893-4c84-8b80-156679b978c1';
}
