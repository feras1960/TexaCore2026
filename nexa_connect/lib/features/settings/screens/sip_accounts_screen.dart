import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../core/models/sip_account.dart';
import '../../../core/config/env.dart';
import '../../calls/providers/sip_provider.dart';

// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

/// Provider to manage SIP accounts list
final sipAccountsProvider =
    NotifierProvider<SipAccountsNotifier, List<SipAccount>>(
        SipAccountsNotifier.new);

class SipAccountsNotifier extends Notifier<List<SipAccount>> {
  @override
  List<SipAccount> build() {
    final activeExt = html.window.localStorage['active_sip_ext'] ?? '101';
    return [
      SipAccount(
        id: '101',
        displayName: 'TexaCore PBX (101)',
        server: Env.pbxDomain,
        port: int.tryParse(Env.pbxWssPort) ?? 8089,
        username: '101',
        password: 'TexaCore2026Pbx101',
        isActive: activeExt == '101',
      ),
      SipAccount(
        id: '102',
        displayName: 'TexaCore PBX (102)',
        server: Env.pbxDomain,
        port: int.tryParse(Env.pbxWssPort) ?? 8089,
        username: '102',
        password: 'TexaCore2026Pbx102',
        isActive: activeExt == '102',
      ),
    ];
  }

  void addAccount(SipAccount account) {
    state = [...state, account];
  }

  void removeAccount(String id) {
    state = state.where((a) => a.id != id).toList();
  }

  void updateAccount(SipAccount updated) {
    state = state.map((a) => a.id == updated.id ? updated : a).toList();
  }

  void setActive(String id) {
    html.window.localStorage['active_sip_ext'] = id;
    state = state.map((a) => a.copyWith(isActive: a.id == id)).toList();
  }
}

class SipAccountsScreen extends ConsumerStatefulWidget {
  final bool isSplitView;

  const SipAccountsScreen({
    super.key,
    this.isSplitView = false,
  });

  @override
  ConsumerState<SipAccountsScreen> createState() => _SipAccountsScreenState();
}

class _SipAccountsScreenState extends ConsumerState<SipAccountsScreen> {
  SipAccount? _editingAccount;
  bool _isAddingNew = false;

  void _showAddAccount(BuildContext context, bool isDark) {
    setState(() {
      _isAddingNew = true;
      _editingAccount = null;
    });
  }

  void _showEditAccount(BuildContext context, bool isDark, SipAccount account) {
    setState(() {
      _isAddingNew = false;
      _editingAccount = account;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isAddingNew || _editingAccount != null) {
      return _AccountFormWidget(
        existingAccount: _editingAccount,
        onCancel: () {
          setState(() {
            _isAddingNew = false;
            _editingAccount = null;
          });
        },
        onSave: (account) {
          if (_editingAccount != null) {
            ref.read(sipAccountsProvider.notifier).updateAccount(account);
          } else {
            ref.read(sipAccountsProvider.notifier).addAccount(account);
          }
          setState(() {
            _isAddingNew = false;
            _editingAccount = null;
          });
        },
      );
    }

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final accounts = ref.watch(sipAccountsProvider);
    final sipService = ref.watch(sipServiceProvider);

    return Scaffold(
      backgroundColor: isDark ? Colors.black : const Color(0xFFF2F2F7),
      body: SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // ─── Header ───
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 4, 16, 16),
                child: Row(
                  children: [
                    if (!widget.isSplitView)
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: Icon(
                          CupertinoIcons.chevron_back,
                          color: theme.colorScheme.primary,
                          size: 28,
                        ),
                      ),
                    if (!widget.isSplitView) const Spacer(),
                    Text(
                      'sip_screen.title'.tr(),
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        fontSize: 20,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () => _showAddAccount(context, isDark),
                      icon: Icon(
                        CupertinoIcons.plus_circle_fill,
                        color: theme.colorScheme.primary,
                        size: 28,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // ─── Active Status ───
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: sipService.isRegistered
                      ? const Color(0xFF34C759).withOpacity(0.1)
                      : const Color(0xFFFF3B30).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: sipService.isRegistered
                        ? const Color(0xFF34C759).withOpacity(0.3)
                        : const Color(0xFFFF3B30).withOpacity(0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: sipService.isRegistered
                            ? const Color(0xFF34C759)
                            : const Color(0xFFFF3B30),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        sipService.isRegistered
                            ? 'sip_screen.connected'.tr()
                            : 'sip_screen.disconnected'.tr(),
                        style: TextStyle(
                          color: sipService.isRegistered
                              ? const Color(0xFF34C759)
                              : const Color(0xFFFF3B30),
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    Text(
                      'Ext: ${accounts.firstWhere((a) => a.isActive, orElse: () => accounts.first).username}',
                      style: TextStyle(
                        color: theme.colorScheme.onSurface.withOpacity(0.5),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // ─── Section Title ───
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  'sip_screen.registered_accounts'.tr(),
                  style: TextStyle(
                    color: theme.colorScheme.onSurface.withOpacity(0.4),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 8)),

            // ─── Account Cards ───
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final account = accounts[index];
                  return _buildAccountCard(account, isDark, theme);
                },
                childCount: accounts.length,
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 24)),

            // ─── Add Account Button ───
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: GestureDetector(
                  onTap: () => _showAddAccount(context, isDark),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: theme.colorScheme.primary.withOpacity(0.3),
                        width: 1.5,
                        strokeAlign: BorderSide.strokeAlignInside,
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(CupertinoIcons.plus_circle,
                            color: theme.colorScheme.primary, size: 22),
                        const SizedBox(width: 8),
                        Text(
                          'sip_screen.add_new'.tr(),
                          style: TextStyle(
                            color: theme.colorScheme.primary,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 40)),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountCard(
      SipAccount account, bool isDark, ThemeData theme) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: account.isActive
            ? Border.all(color: const Color(0xFF34C759), width: 1.5)
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.15 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            Row(
              children: [
                // Avatar
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: LinearGradient(
                      colors: account.isActive
                          ? [const Color(0xFF34C759), const Color(0xFF30D158)]
                          : [const Color(0xFF8E8E93), const Color(0xFFAEAEB2)],
                    ),
                  ),
                  child: const Icon(CupertinoIcons.phone_fill,
                      color: Colors.white, size: 22),
                ),
                const SizedBox(width: 12),

                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              account.displayName,
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                                fontSize: 16,
                              ),
                            ),
                          ),
                          if (account.isActive)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF34C759).withOpacity(0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'sip_screen.active'.tr(),
                                style: TextStyle(
                                  color: Color(0xFF34C759),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${account.username}@${account.server}:${account.port}',
                        style: TextStyle(
                          color: theme.colorScheme.onSurface.withOpacity(0.4),
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 10),

            // Action row
            Row(
              children: [
                // Activate
                if (!account.isActive)
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        ref.read(sipAccountsProvider.notifier).setActive(account.id);
                        // Re-register with this account
                        ref.read(sipServiceProvider).register(
                              server: account.server,
                              username: account.username,
                              password: account.password,
                            );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF007AFF).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(CupertinoIcons.checkmark_circle,
                                color: Color(0xFF007AFF), size: 16),
                            const SizedBox(width: 4),
                            Text('sip_screen.activate'.tr(),
                                style: TextStyle(
                                    color: Color(0xFF007AFF),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    ),
                  ),
                if (!account.isActive) const SizedBox(width: 8),

                // Edit
                Expanded(
                  child: GestureDetector(
                    onTap: () => _showEditAccount(context, isDark, account),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.onSurface.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(CupertinoIcons.pencil,
                              color: theme.colorScheme.onSurface.withOpacity(0.6),
                              size: 16),
                          const SizedBox(width: 4),
                          Text('sip_screen.edit'.tr(),
                              style: TextStyle(
                                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Delete
                if (account.id != 'default')
                  GestureDetector(
                    onTap: () {
                      ref
                          .read(sipAccountsProvider.notifier)
                          .removeAccount(account.id);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          vertical: 8, horizontal: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFF3B30).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(CupertinoIcons.trash,
                          color: Color(0xFFFF3B30), size: 16),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AccountFormWidget extends StatefulWidget {
  final SipAccount? existingAccount;
  final VoidCallback onCancel;
  final void Function(SipAccount) onSave;

  const _AccountFormWidget({
    Key? key,
    this.existingAccount,
    required this.onCancel,
    required this.onSave,
  }) : super(key: key);

  @override
  State<_AccountFormWidget> createState() => _AccountFormWidgetState();
}

class _AccountFormWidgetState extends State<_AccountFormWidget> {
  late TextEditingController nameCtrl;
  late TextEditingController serverCtrl;
  late TextEditingController portCtrl;
  late TextEditingController userCtrl;
  late TextEditingController passCtrl;
  bool obscurePass = true;

  @override
  void initState() {
    super.initState();
    nameCtrl = TextEditingController(text: widget.existingAccount?.displayName ?? '');
    serverCtrl = TextEditingController(text: widget.existingAccount?.server ?? Env.pbxDomain);
    portCtrl = TextEditingController(text: (widget.existingAccount?.port ?? 8089).toString());
    userCtrl = TextEditingController(text: widget.existingAccount?.username ?? '');
    passCtrl = TextEditingController(text: widget.existingAccount?.password ?? '');
  }

  @override
  void dispose() {
    nameCtrl.dispose();
    serverCtrl.dispose();
    portCtrl.dispose();
    userCtrl.dispose();
    passCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? Colors.black : const Color(0xFFF2F2F7),
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 4, 16, 16),
              child: Row(
                children: [
                  IconButton(
                    onPressed: widget.onCancel,
                    icon: Icon(
                      CupertinoIcons.chevron_back,
                      color: theme.colorScheme.primary,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    widget.existingAccount != null ? 'sip_screen.edit_account'.tr() : 'sip_screen.new_account'.tr(),
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      fontSize: 20,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () {
                      if (userCtrl.text.isEmpty || serverCtrl.text.isEmpty) return;
                      final account = SipAccount(
                        id: widget.existingAccount?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
                        displayName: nameCtrl.text.isNotEmpty ? nameCtrl.text : 'SIP ${userCtrl.text}',
                        server: serverCtrl.text,
                        port: int.tryParse(portCtrl.text) ?? 8089,
                        username: userCtrl.text,
                        password: passCtrl.text,
                        isActive: widget.existingAccount?.isActive ?? false,
                      );
                      widget.onSave(account);
                    },
                    child: Text(
                      'sip_screen.save'.tr(),
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  children: [
                    _buildField('sip_screen.account_name'.tr(), nameCtrl, isDark, icon: CupertinoIcons.tag),
                    const SizedBox(height: 12),
                    _buildField('sip_screen.server'.tr(), serverCtrl, isDark, icon: CupertinoIcons.globe),
                    const SizedBox(height: 12),
                    _buildField('sip_screen.port'.tr(), portCtrl, isDark, icon: CupertinoIcons.number, keyboardType: TextInputType.number),
                    const SizedBox(height: 12),
                    _buildField('sip_screen.username'.tr(), userCtrl, isDark, icon: CupertinoIcons.person),
                    const SizedBox(height: 12),
                    _buildField('sip_screen.password'.tr(), passCtrl, isDark, icon: CupertinoIcons.lock, obscure: obscurePass, suffixIcon: GestureDetector(
                      onTap: () => setState(() => obscurePass = !obscurePass),
                      child: Icon(
                        obscurePass ? CupertinoIcons.eye_slash : CupertinoIcons.eye,
                        size: 20,
                        color: theme.colorScheme.onSurface.withOpacity(0.4),
                      ),
                    )),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController ctrl, bool isDark,
      {IconData? icon, bool obscure = false, Widget? suffixIcon, TextInputType? keyboardType}) {
    return TextField(
      controller: ctrl,
      obscureText: obscure,
      keyboardType: keyboardType,
      style: TextStyle(color: isDark ? Colors.white : Colors.black, fontSize: 16),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(
          color: isDark ? Colors.white.withOpacity(0.5) : Colors.black.withOpacity(0.4),
          fontSize: 14,
        ),
        prefixIcon: icon != null
            ? Icon(icon, size: 20, color: isDark ? Colors.white.withOpacity(0.4) : Colors.black.withOpacity(0.3))
            : null,
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.04),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}
