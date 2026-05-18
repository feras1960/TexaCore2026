import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart' hide TextDirection;
import '../providers/auth_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;

// ─── Country codes with flag emoji ───
const _countries = <String, (String, String)>{
  '1': ('🇺🇸', 'US'), '7': ('🇷🇺', 'RU'),
  '20': ('🇪🇬', 'EG'), '27': ('🇿🇦', 'ZA'),
  '30': ('🇬🇷', 'GR'), '31': ('🇳🇱', 'NL'), '32': ('🇧🇪', 'BE'), '33': ('🇫🇷', 'FR'),
  '34': ('🇪🇸', 'ES'), '36': ('🇭🇺', 'HU'), '39': ('🇮🇹', 'IT'),
  '40': ('🇷🇴', 'RO'), '41': ('🇨🇭', 'CH'), '43': ('🇦🇹', 'AT'), '44': ('🇬🇧', 'GB'),
  '45': ('🇩🇰', 'DK'), '46': ('🇸🇪', 'SE'), '47': ('🇳🇴', 'NO'), '48': ('🇵🇱', 'PL'),
  '49': ('🇩🇪', 'DE'),
  '51': ('🇵🇪', 'PE'), '52': ('🇲🇽', 'MX'), '55': ('🇧🇷', 'BR'),
  '60': ('🇲🇾', 'MY'), '61': ('🇦🇺', 'AU'), '62': ('🇮🇩', 'ID'), '63': ('🇵🇭', 'PH'),
  '64': ('🇳🇿', 'NZ'), '65': ('🇸🇬', 'SG'), '66': ('🇹🇭', 'TH'),
  '81': ('🇯🇵', 'JP'), '82': ('🇰🇷', 'KR'), '86': ('🇨🇳', 'CN'),
  '90': ('🇹🇷', 'TR'), '91': ('🇮🇳', 'IN'), '92': ('🇵🇰', 'PK'), '93': ('🇦🇫', 'AF'),
  '94': ('🇱🇰', 'LK'), '95': ('🇲🇲', 'MM'), '98': ('🇮🇷', 'IR'),
  '212': ('🇲🇦', 'MA'), '213': ('🇩🇿', 'DZ'), '216': ('🇹🇳', 'TN'),
  '218': ('🇱🇾', 'LY'), '220': ('🇬🇲', 'GM'), '221': ('🇸🇳', 'SN'),
  '249': ('🇸🇩', 'SD'), '250': ('🇷🇼', 'RW'), '251': ('🇪🇹', 'ET'),
  '252': ('🇸🇴', 'SO'), '253': ('🇩🇯', 'DJ'), '254': ('🇰🇪', 'KE'), '256': ('🇺🇬', 'UG'),
  '351': ('🇵🇹', 'PT'), '353': ('🇮🇪', 'IE'), '354': ('🇮🇸', 'IS'),
  '358': ('🇫🇮', 'FI'), '370': ('🇱🇹', 'LT'), '371': ('🇱🇻', 'LV'), '372': ('🇪🇪', 'EE'),
  '380': ('🇺🇦', 'UA'), '381': ('🇷🇸', 'RS'),
  '420': ('🇨🇿', 'CZ'), '421': ('🇸🇰', 'SK'),
  '961': ('🇱🇧', 'LB'), '962': ('🇯🇴', 'JO'), '963': ('🇸🇾', 'SY'),
  '964': ('🇮🇶', 'IQ'), '965': ('🇰🇼', 'KW'), '966': ('🇸🇦', 'SA'),
  '967': ('🇾🇪', 'YE'), '968': ('🇴🇲', 'OM'), '970': ('🇵🇸', 'PS'),
  '971': ('🇦🇪', 'AE'), '972': ('🇮🇱', 'IL'), '973': ('🇧🇭', 'BH'),
  '974': ('🇶🇦', 'QA'), '975': ('🇧🇹', 'BT'), '976': ('🇲🇳', 'MN'),
};

/// Convert Arabic/Hindi numerals to English
String _normalizeDigits(String input) {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const hindiDigits  = '۰۱۲۳۴۵۶۷۸۹';
  var result = input;
  for (int i = 0; i < 10; i++) {
    result = result.replaceAll(arabicDigits[i], '$i').replaceAll(hindiDigits[i], '$i');
  }
  return result;
}

/// Detect country from phone digits
(String, String) _detectCountry(String digits) {
  // Try 3-digit, 2-digit, 1-digit codes
  if (digits.length >= 3 && _countries.containsKey(digits.substring(0, 3))) return _countries[digits.substring(0, 3)]!;
  if (digits.length >= 2 && _countries.containsKey(digits.substring(0, 2))) return _countries[digits.substring(0, 2)]!;
  if (digits.isNotEmpty && _countries.containsKey(digits.substring(0, 1))) return _countries[digits.substring(0, 1)]!;
  return ('🌍', '');
}

/// Input formatter that normalizes Arabic/Hindi numerals
class _ArabicDigitFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final normalized = _normalizeDigits(newValue.text).replaceAll(RegExp(r'[^0-9]'), '');
    if (normalized == newValue.text) return newValue;
    return TextEditingValue(text: normalized, selection: TextSelection.collapsed(offset: normalized.length));
  }
}

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final List<TextEditingController> _otpControllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _otpFocusNodes = List.generate(6, (_) => FocusNode());
  String _countryFlag = '🌍';
  String _countryCode = '';

  bool _isLoading = false;
  bool _showOtp = false;
  bool _showEmail = false;
  bool _obscure = true;
  int _resendSeconds = 0;

  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
    _fadeAnim = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutCubic);
    _animCtrl.forward();
    _phoneController.addListener(_onPhoneChanged);
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    for (final c in _otpControllers) c.dispose();
    for (final f in _otpFocusNodes) f.dispose();
    _animCtrl.dispose();
    super.dispose();
  }

  void _onPhoneChanged() {
    final digits = _phoneController.text.replaceAll(RegExp(r'[^0-9]'), '');
    final detected = _detectCountry(digits);
    if (detected.$1 != _countryFlag) setState(() { _countryFlag = detected.$1; _countryCode = detected.$2; });
  }

  // ─── Actions ───
  Future<void> _sendOtp() async {
    final phone = _phoneController.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (phone.length < 8) { _err('auth.invalid_phone'.tr()); return; }
    setState(() => _isLoading = true);
    try {
      final full = '+$phone';
      await Supabase.instance.client.auth.signInWithOtp(phone: full);
      if (mounted) {
        setState(() { _isLoading = false; _showOtp = true; _resendSeconds = 60; });
        _startResendTimer();
        Future.delayed(const Duration(milliseconds: 100), () {
          if (mounted) _otpFocusNodes[0].requestFocus();
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        _err(e.toString());
      }
    }
  }

  Future<void> _verifyOtp() async {
    final otp = _otpControllers.map((c) => _normalizeDigits(c.text)).join();
    if (otp.length < 6) { _err('auth.invalid_otp'.tr()); return; }
    setState(() => _isLoading = true);
    try {
      final phone = _phoneController.text.replaceAll(RegExp(r'[^0-9]'), '');
      final full = '+$phone';
      await Supabase.instance.client.auth.verifyOTP(
        phone: full, token: otp, type: OtpType.sms,
      );
      if (mounted) setState(() => _isLoading = false);
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        _err(e.toString());
      }
    }
  }

  void _startResendTimer() {
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      setState(() => _resendSeconds--);
      return _resendSeconds > 0;
    });
  }

  void _resendCode() {
    for (final c in _otpControllers) c.clear();
    _sendOtp();
  }

  Future<void> _emailLogin() async {
    final e = _emailController.text.trim();
    final p = _passwordController.text.trim();
    if (e.isEmpty || p.isEmpty) { _err('auth.invalid_email'.tr()); return; }
    setState(() => _isLoading = true);
    final ok = await ref.read(authProvider.notifier).signIn(email: e, password: p);
    setState(() => _isLoading = false);
    if (!ok && mounted) _err(ref.read(authProvider).error ?? 'auth.login'.tr());
  }

  void _err(String m) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(m), backgroundColor: const Color(0xFFFF3B30)));

  // ─── Build ───
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final size = MediaQuery.sizeOf(context);
    final isWide = size.width > 600;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0A0A0F) : const Color(0xFFF2F4F7),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(
              horizontal: isWide ? size.width * 0.1 : 24,
              vertical: 32,
            ),
            child: FadeTransition(
              opacity: _fadeAnim,
              child: isWide ? _wideLayout(isDark, size) : _mobileLayout(isDark),
            ),
          ),
        ),
      ),
    );
  }

  // ═══ Desktop/Tablet Layout ═══
  Widget _wideLayout(bool isDark, Size size) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 900),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF12121F) : Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(isDark ? 0.3 : 0.08), blurRadius: 40, offset: const Offset(0, 12))],
      ),
      child: Row(children: [
        // ── Left: Branding ──
        Expanded(
          flex: 5,
          child: Container(
            padding: const EdgeInsets.all(48),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6), Color(0xFFA855F7)],
                begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: const BorderRadius.only(topLeft: Radius.circular(28), bottomLeft: Radius.circular(28)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 64, height: 64,
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(18)),
                  child: const Icon(CupertinoIcons.antenna_radiowaves_left_right, color: Colors.white, size: 32),
                ),
                const SizedBox(height: 28),
                const Text('NexaLive', style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -1)),
                const SizedBox(height: 8),
                Text('Unified Communications Platform', style: TextStyle(fontSize: 16, color: Colors.white.withOpacity(0.8), fontWeight: FontWeight.w500)),
                const SizedBox(height: 32),
                _featureRow(CupertinoIcons.phone_fill, 'auth.feature_voip'.tr()),
                const SizedBox(height: 14),
                _featureRow(CupertinoIcons.speaker_2_fill, 'auth.feature_ptt'.tr()),
                const SizedBox(height: 14),
                _featureRow(CupertinoIcons.shield_lefthalf_fill, 'auth.feature_e2e'.tr()),
                const SizedBox(height: 14),
                _featureRow(CupertinoIcons.globe, 'auth.feature_mesh'.tr()),
              ],
            ),
          ),
        ),
        // ── Right: Form ──
        Expanded(
          flex: 5,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 48),
            child: _formContent(isDark),
          ),
        ),
      ]),
    );
  }

  Widget _featureRow(IconData icon, String text) {
    return Row(children: [
      Icon(icon, color: Colors.white70, size: 18),
      const SizedBox(width: 12),
      Text(text, style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 14, fontWeight: FontWeight.w500)),
    ]);
  }

  // ═══ Mobile Layout ═══
  Widget _mobileLayout(bool isDark) {
    return Column(children: [
      // Logo
      Container(
        width: 72, height: 72,
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)], begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: const Color(0xFF6366F1).withOpacity(0.3), blurRadius: 18, offset: const Offset(0, 8))],
        ),
        child: const Icon(CupertinoIcons.antenna_radiowaves_left_right, color: Colors.white, size: 34),
      ),
      const SizedBox(height: 16),
      Text('NexaLive', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: isDark ? Colors.white : const Color(0xFF1A1A2E), letterSpacing: -1)),
      const SizedBox(height: 4),
      Text('Unified Communications', style: TextStyle(fontSize: 12, color: isDark ? Colors.white54 : Colors.black45)),
      const SizedBox(height: 32),
      // Card
      Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF12121F) : Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(isDark ? 0.2 : 0.06), blurRadius: 24, offset: const Offset(0, 8))],
        ),
        child: _formContent(isDark),
      ),
    ]);
  }

  // ═══ Shared Form ═══
  Widget _formContent(bool isDark) {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
      Text(_showEmail ? 'auth.email_title'.tr() : 'auth.enter_phone'.tr(),
        style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: isDark ? Colors.white : const Color(0xFF1A1A2E))),
      const SizedBox(height: 6),
      Text(_showEmail ? 'auth.email_desc'.tr() : 'auth.phone_verify_desc'.tr(),
        style: TextStyle(fontSize: 13, color: isDark ? Colors.white.withValues(alpha: 0.45) : Colors.black45)),
      const SizedBox(height: 28),

      if (!_showEmail && !_showOtp) ...[
        // Phone with built-in + prefix and country flag
        _phoneField(isDark),
        const SizedBox(height: 20),
        _primaryBtn('auth.send_code'.tr(), _sendOtp),
      ] else if (_showOtp) ...[
        // ═══ OTP Verification Screen ═══
        _otpVerificationView(isDark),
      ] else ...[
        // Email
        _field(_emailController, 'auth.email_hint'.tr(), CupertinoIcons.mail, isDark,
            keyboard: TextInputType.emailAddress),
        const SizedBox(height: 12),
        _field(_passwordController, 'auth.password_hint'.tr(), CupertinoIcons.lock, isDark,
            obscure: _obscure,
            suffix: GestureDetector(
              onTap: () => setState(() => _obscure = !_obscure),
              child: Icon(_obscure ? CupertinoIcons.eye_slash : CupertinoIcons.eye,
                  color: isDark ? Colors.white.withValues(alpha: 0.3) : Colors.black.withValues(alpha: 0.3), size: 20),
            )),
        const SizedBox(height: 20),
        _primaryBtn('auth.login'.tr(), _emailLogin),
      ],

      const SizedBox(height: 20),

      // ── Divider ──
      Row(children: [
        Expanded(child: Divider(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.08))),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Text('auth.or'.tr(), style: TextStyle(fontSize: 12, color: isDark ? Colors.white.withValues(alpha: 0.3) : Colors.black.withValues(alpha: 0.3)))),
        Expanded(child: Divider(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.08))),
      ]),
      const SizedBox(height: 16),

      // ── Social ──
      _socialBtn(() => ref.read(authProvider.notifier).signInWithGoogle(), isDark,
        'auth.google'.tr(), const Icon(Icons.g_mobiledata_rounded, size: 26, color: Color(0xFF4285F4))),
      const SizedBox(height: 10),
      _socialBtn(() => ref.read(authProvider.notifier).signInWithApple(), isDark,
        'auth.apple'.tr(), Icon(CupertinoIcons.at, size: 18, color: isDark ? Colors.black87 : Colors.white),
        isApple: true),

      const SizedBox(height: 24),

      // ── Toggle email/phone link ──
      Center(
        child: GestureDetector(
          onTap: () => setState(() { _showEmail = !_showEmail; }),
          child: RichText(text: TextSpan(
            style: TextStyle(fontSize: 13, color: isDark ? Colors.white.withValues(alpha: 0.45) : Colors.black45),
            children: [
              TextSpan(text: _showEmail ? 'auth.switch_phone'.tr() : 'auth.switch_email'.tr()),
              const TextSpan(text: ' ←', style: TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.w700)),
            ],
          )),
        ),
      ),
    ]);
  }

  // ═══ OTP Verification View ═══
  Widget _otpVerificationView(bool isDark) {
    final phone = _phoneController.text.replaceAll(RegExp(r'[^0-9]'), '');
    return Column(crossAxisAlignment: CrossAxisAlignment.center, mainAxisSize: MainAxisSize.min, children: [
      // Lock icon
      Container(
        width: 56, height: 56,
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)]),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Icon(CupertinoIcons.lock_shield_fill, color: Colors.white, size: 28),
      ),
      const SizedBox(height: 16),
      Text('auth.otp_hint'.tr(),
        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: isDark ? Colors.white : const Color(0xFF1A1A2E))),
      const SizedBox(height: 8),
      Text('auth.flash_call_msg'.tr(),
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 13, color: isDark ? Colors.white.withValues(alpha: 0.45) : Colors.black45)),
      const SizedBox(height: 6),
      // Show phone number
      Directionality(
        textDirection: TextDirection.ltr,
        child: Text('+$phone', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700,
          color: const Color(0xFF6366F1), letterSpacing: 1)),
      ),
      const SizedBox(height: 28),
      // 6 digit boxes
      Directionality(
        textDirection: TextDirection.ltr,
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(6, (i) {
          return Container(
            width: 46, height: 54,
            margin: EdgeInsets.only(left: i == 0 ? 0 : 8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1A1A2A) : const Color(0xFFF7F8FA),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _otpControllers[i].text.isNotEmpty
                  ? const Color(0xFF6366F1)
                  : (isDark ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.08)),
                width: _otpControllers[i].text.isNotEmpty ? 2 : 1,
              ),
            ),
            child: TextField(
              controller: _otpControllers[i],
              focusNode: _otpFocusNodes[i],
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              maxLength: 1,
              inputFormatters: [_ArabicDigitFormatter()],
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800,
                color: isDark ? Colors.white : Colors.black87),
              decoration: const InputDecoration(
                counterText: '', border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(vertical: 12),
              ),
              onChanged: (val) {
                setState(() {}); // rebuild border colors
                if (val.isNotEmpty && i < 5) {
                  _otpFocusNodes[i + 1].requestFocus();
                } else if (val.isEmpty && i > 0) {
                  _otpFocusNodes[i - 1].requestFocus();
                }
                // Auto-submit when all 6 filled
                if (i == 5 && val.isNotEmpty) {
                  final code = _otpControllers.map((c) => c.text).join();
                  if (code.length == 6) _verifyOtp();
                }
              },
            ),
          );
        })),
      ),
      const SizedBox(height: 24),
      // Verify button
      _primaryBtn('auth.verify_login'.tr(), _verifyOtp),
      const SizedBox(height: 16),
      // Resend / Timer
      if (_resendSeconds > 0)
        Text('${'auth.send_code'.tr()} (${_resendSeconds}s)',
          style: TextStyle(fontSize: 13, color: isDark ? Colors.white.withValues(alpha: 0.3) : Colors.black38))
      else
        GestureDetector(
          onTap: _resendCode,
          child: Text('auth.send_code'.tr(),
            style: const TextStyle(fontSize: 14, color: Color(0xFF6366F1), fontWeight: FontWeight.w700)),
        ),
      const SizedBox(height: 12),
      // Back / change number
      GestureDetector(
        onTap: () => setState(() { _showOtp = false; for (final c in _otpControllers) c.clear(); }),
        child: Text('auth.switch_phone'.tr(),
          style: TextStyle(fontSize: 13, color: isDark ? Colors.white.withValues(alpha: 0.45) : Colors.black45)),
      ),
    ]);
  }

  // ─── Professional Phone Field ───
  Widget _phoneField(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1A2A) : const Color(0xFFF7F8FA),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.06)),
      ),
      child: Row(children: [
        // Country flag + "+"
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Text(_countryFlag, style: const TextStyle(fontSize: 22)),
            const SizedBox(width: 6),
            Text('+', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700,
              color: isDark ? Colors.white70 : Colors.black54)),
          ]),
        ),
        Container(width: 1, height: 28, color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.08)),
        // Phone input
        Expanded(
          child: TextField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            textDirection: TextDirection.ltr,
            textAlign: TextAlign.left,
            inputFormatters: [_ArabicDigitFormatter()],
            style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontSize: 17,
              fontWeight: FontWeight.w600, letterSpacing: 1.2),
            decoration: InputDecoration(
              hintText: '971 50 123 4567',
              hintStyle: TextStyle(color: isDark ? Colors.white24 : Colors.black26, fontSize: 15,
                fontWeight: FontWeight.w400, letterSpacing: 1),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
              suffixIcon: _countryCode.isNotEmpty ? Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Center(widthFactor: 1, child: Text(_countryCode,
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                    color: const Color(0xFF6366F1).withOpacity(0.7)))),
              ) : null,
            ),
          ),
        ),
      ]),
    );
  }

  // ─── Helpers ───
  Widget _primaryBtn(String label, VoidCallback action) {
    return SizedBox(
      height: 52,
      child: ElevatedButton(
        onPressed: _isLoading ? null : action,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF6366F1), foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          elevation: 0,
        ),
        child: _isLoading
            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
            : Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
      ),
    );
  }

  Widget _field(TextEditingController c, String hint, IconData icon, bool isDark,
      {TextInputType? keyboard, bool obscure = false, Widget? suffix, bool ltr = false}) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1A2A) : const Color(0xFFF7F8FA),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.06)),
      ),
      child: TextField(
        controller: c, keyboardType: keyboard, obscureText: obscure,
        textDirection: ltr ? TextDirection.ltr : null,
        textAlign: ltr ? TextAlign.left : TextAlign.start,
        style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontSize: 15),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(color: isDark ? Colors.white24 : Colors.black26, fontSize: 14),
          prefixIcon: Icon(icon, color: isDark ? Colors.white24 : Colors.black26, size: 20),
          suffixIcon: suffix != null ? Padding(padding: const EdgeInsets.only(right: 12), child: suffix) : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        ),
      ),
    );
  }

  Widget _socialBtn(VoidCallback onTap, bool isDark, String label, Widget icon, {bool isApple = false}) {
    return SizedBox(
      height: 48,
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          backgroundColor: isApple ? (isDark ? Colors.white : Colors.black) : (isDark ? const Color(0xFF1A1A2A) : Colors.white),
          side: BorderSide(color: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.06)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          icon, const SizedBox(width: 10),
          Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600,
            color: isApple ? (isDark ? Colors.black87 : Colors.white) : (isDark ? Colors.white60 : Colors.black87))),
        ]),
      ),
    );
  }
}
