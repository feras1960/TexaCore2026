import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _useEmail = false; // افتراضياً: تسجيل بالهاتف

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      _showError('يرجى إدخال اسمك');
      return;
    }

    setState(() => _isLoading = true);
    bool success;

    if (_useEmail) {
      final email = _emailController.text.trim();
      final password = _passwordController.text.trim();
      if (email.isEmpty || password.isEmpty) {
        _showError('يرجى ملء البريد وكلمة المرور');
        setState(() => _isLoading = false);
        return;
      }
      if (password.length < 6) {
        _showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        setState(() => _isLoading = false);
        return;
      }
      success = await ref.read(authProvider.notifier).signUp(
            email: email,
            password: password,
            fullName: name,
          );
    } else {
      final phone = _phoneController.text.trim();
      if (phone.isEmpty) {
        _showError('يرجى إدخال رقم الهاتف');
        setState(() => _isLoading = false);
        return;
      }
      success = await ref.read(authProvider.notifier).signUpWithPhone(
            phone: phone,
            fullName: name,
          );
    }

    setState(() => _isLoading = false);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_useEmail
                ? '✅ تم إنشاء الحساب! يمكنك تسجيل الدخول الآن'
                : '✅ تم إرسال رمز التحقق إلى هاتفك'),
            backgroundColor: const Color(0xFF34C759),
          ),
        );
        if (_useEmail) Navigator.pop(context);
      } else {
        _showError(ref.read(authProvider).error ?? 'فشل إنشاء الحساب');
      }
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: const Color(0xFFFF3B30)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0A0A0F) : const Color(0xFFF0F2F5),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(CupertinoIcons.back,
              color: isDark ? Colors.white : Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            children: [
              Container(
                width: 70, height: 70,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                      colors: [Color(0xFF34C759), Color(0xFF30D158)]),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(CupertinoIcons.person_add_solid,
                    color: Colors.white, size: 32),
              ),
              const SizedBox(height: 20),
              Text('إنشاء حساب جديد',
                  style: TextStyle(
                    fontSize: 26, fontWeight: FontWeight.w900,
                    color: isDark ? Colors.white : const Color(0xFF1A1A2E),
                  )),
              const SizedBox(height: 8),
              Text('فقط اسمك ورقم هاتفك',
                  style: TextStyle(fontSize: 14,
                      color: isDark ? Colors.white54 : Colors.black45)),
              const SizedBox(height: 40),

              // ── الاسم ──
              _buildField(_nameController, 'اسم المستخدم',
                  CupertinoIcons.person, isDark),
              const SizedBox(height: 14),

              // ── الهاتف أو البريد ──
              if (!_useEmail) ...[
                _buildField(_phoneController, 'رقم الهاتف (مع رمز الدولة)',
                    CupertinoIcons.phone, isDark,
                    keyboardType: TextInputType.phone),
              ] else ...[
                _buildField(_emailController, 'البريد الإلكتروني',
                    CupertinoIcons.mail, isDark,
                    keyboardType: TextInputType.emailAddress),
                const SizedBox(height: 14),
                _buildField(_passwordController, 'كلمة المرور',
                    CupertinoIcons.lock, isDark,
                    obscure: _obscurePassword),
              ],
              const SizedBox(height: 12),

              // ── التبديل بين الهاتف والبريد ──
              GestureDetector(
                onTap: () => setState(() => _useEmail = !_useEmail),
                child: Text(
                  _useEmail ? '← التسجيل برقم الهاتف' : 'أو التسجيل بالبريد الإلكتروني →',
                  style: TextStyle(
                    color: const Color(0xFF6366F1),
                    fontSize: 13, fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // ── زر التسجيل ──
              SizedBox(
                width: double.infinity, height: 54,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleRegister,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF34C759),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: _isLoading
                      ? const SizedBox(width: 24, height: 24,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2.5))
                      : Text(_useEmail ? 'إنشاء الحساب' : 'إرسال رمز التحقق',
                          style: const TextStyle(
                              fontSize: 17, fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('لديك حساب بالفعل؟',
                      style: TextStyle(fontSize: 14,
                          color: isDark ? Colors.white54 : Colors.black45)),
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: const Text('تسجيل الدخول',
                        style: TextStyle(color: Color(0xFF6366F1),
                            fontSize: 14, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(TextEditingController ctrl, String hint, IconData icon,
      bool isDark, {TextInputType? keyboardType, bool obscure = false}) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1C2E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: isDark ? Colors.white10 : Colors.black.withOpacity(0.06)),
      ),
      child: TextField(
        controller: ctrl, keyboardType: keyboardType, obscureText: obscure,
        style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontSize: 15),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(color: isDark ? Colors.white30 : Colors.black26),
          prefixIcon: Icon(icon, color: isDark ? Colors.white30 : Colors.black26, size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        ),
      ),
    );
  }
}
