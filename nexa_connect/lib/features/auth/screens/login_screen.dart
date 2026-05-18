import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import 'register_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  late AnimationController _animController;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _animController.forward();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _animController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    if (email.isEmpty || password.isEmpty) {
      _showError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setState(() => _isLoading = true);
    final success = await ref.read(authProvider.notifier).signIn(
          email: email,
          password: password,
        );
    setState(() => _isLoading = false);
    if (!success && mounted) {
      final error = ref.read(authProvider).error ?? 'فشل تسجيل الدخول';
      _showError(error);
    }
  }

  Future<void> _handleForgotPassword() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      _showError('يرجى إدخال البريد الإلكتروني أولاً');
      return;
    }
    final success = await ref.read(authProvider.notifier).resetPassword(email);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success
              ? '📧 تم إرسال رابط إعادة التعيين إلى بريدك'
              : '❌ حدث خطأ — تأكد من البريد الإلكتروني'),
          backgroundColor: success ? const Color(0xFF34C759) : const Color(0xFFFF3B30),
        ),
      );
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
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: FadeTransition(
            opacity: _fadeAnim,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // ── Logo ──
                Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF6366F1).withOpacity(0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Icon(CupertinoIcons.antenna_radiowaves_left_right,
                      color: Colors.white, size: 42),
                ),
                const SizedBox(height: 24),
                Text('NexaConnect',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      color: isDark ? Colors.white : const Color(0xFF1A1A2E),
                      letterSpacing: -1,
                    )),
                const SizedBox(height: 6),
                Text('Unified Communications',
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white54 : Colors.black45,
                      fontWeight: FontWeight.w500,
                    )),
                const SizedBox(height: 48),

                // ── Email Field ──
                _buildTextField(
                  controller: _emailController,
                  hint: 'البريد الإلكتروني',
                  icon: CupertinoIcons.mail,
                  isDark: isDark,
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),

                // ── Password Field ──
                _buildTextField(
                  controller: _passwordController,
                  hint: 'كلمة المرور',
                  icon: CupertinoIcons.lock,
                  isDark: isDark,
                  obscure: _obscurePassword,
                  suffix: GestureDetector(
                    onTap: () => setState(() => _obscurePassword = !_obscurePassword),
                    child: Icon(
                      _obscurePassword ? CupertinoIcons.eye_slash : CupertinoIcons.eye,
                      color: isDark ? Colors.white38 : Colors.black38,
                      size: 20,
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // ── Forgot Password ──
                Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: GestureDetector(
                    onTap: _handleForgotPassword,
                    child: Text('نسيت كلمة المرور؟',
                        style: TextStyle(
                          color: const Color(0xFF6366F1),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        )),
                  ),
                ),
                const SizedBox(height: 32),

                // ── Login Button ──
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366F1),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2.5))
                        : const Text('تسجيل الدخول',
                            style: TextStyle(
                                fontSize: 17, fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(height: 24),

                // ── Register Link ──
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('ليس لديك حساب؟',
                        style: TextStyle(
                          color: isDark ? Colors.white54 : Colors.black45,
                          fontSize: 14,
                        )),
                    const SizedBox(width: 6),
                    GestureDetector(
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const RegisterScreen()),
                      ),
                      child: const Text('إنشاء حساب',
                          style: TextStyle(
                            color: Color(0xFF6366F1),
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          )),
                    ),
                  ],
                ),
                const SizedBox(height: 48),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    required bool isDark,
    TextInputType? keyboardType,
    bool obscure = false,
    Widget? suffix,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1C2E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.white10 : Colors.black.withOpacity(0.06),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.1 : 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        obscureText: obscure,
        style: TextStyle(
          color: isDark ? Colors.white : Colors.black87,
          fontSize: 15,
        ),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(
            color: isDark ? Colors.white30 : Colors.black26,
          ),
          prefixIcon: Icon(icon,
              color: isDark ? Colors.white30 : Colors.black26, size: 20),
          suffixIcon: suffix != null ? Padding(padding: const EdgeInsets.only(right: 12), child: suffix) : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        ),
      ),
    );
  }
}
