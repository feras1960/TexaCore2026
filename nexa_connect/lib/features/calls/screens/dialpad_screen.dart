import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../providers/sip_provider.dart';
import '../../contacts/providers/contacts_provider.dart';
import '../../../widgets/shared/dialpad_button.dart';

class DialpadScreen extends ConsumerStatefulWidget {
  const DialpadScreen({super.key});

  @override
  ConsumerState<DialpadScreen> createState() => _DialpadScreenState();
}

class _DialpadScreenState extends ConsumerState<DialpadScreen>
    with SingleTickerProviderStateMixin {
  String _number = '';
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _onKeyPress(String value) {
    setState(() {
      if (_number.length < 15) {
        _number += value;
        _animationController.forward(from: 0.0);
      }
    });
  }

  void _onBackspace() {
    if (_number.isNotEmpty) {
      setState(() {
        _number = _number.substring(0, _number.length - 1);
      });
    }
  }

  void _onLongBackspace() {
    setState(() {
      _number = '';
    });
  }

  void _onCall() {
    if (_number.isNotEmpty) {
      final sipService = ref.read(sipServiceProvider);
      sipService.makeCall(_number);
      debugPrint('Calling $_number...');
    }
  }

  String _formatNumber(String number) {
    if (number.length <= 3) return number;
    if (number.length <= 6) {
      return '${number.substring(0, 3)} ${number.substring(3)}';
    }
    return '${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}';
  }

  Widget _buildSuggestedContact(ThemeData theme) {
    if (_number.isEmpty) return const SizedBox(height: 40);

    final contacts = ref.watch(contactsProvider);
    final match =
        contacts.where((c) => c.number.contains(_number)).firstOrNull;

    if (match == null) return const SizedBox(height: 40);

    return AnimatedOpacity(
      opacity: 1.0,
      duration: const Duration(milliseconds: 200),
      child: Container(
        height: 40,
        alignment: Alignment.center,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              match.name,
              style: theme.textTheme.titleMedium?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final registrationState = ref.watch(sipRegistrationProvider);
    final theme = Theme.of(context);

    return Column(
      children: [
        // Connection status
        if (registrationState != 'REGISTERED')
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 4),
            color: Colors.orange.withAlpha(25),
            child: Text(
              'dialpad.connecting'.tr(),
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: Colors.orange.shade700, fontSize: 12),
            ),
          ),

        const Spacer(),

        // Smart Contact Suggestion
        _buildSuggestedContact(theme),

        // Number Display
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 32.0),
          alignment: Alignment.center,
          height: 60,
          child: AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 150),
            style: TextStyle(
              color: theme.colorScheme.onSurface,
              fontWeight: FontWeight.w300,
              fontSize: _number.length > 10 ? 28 : 38,
              letterSpacing: 1,
            ),
            child: Text(
              _formatNumber(_number),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ),

        const SizedBox(height: 16),

        // Dialpad Grid
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 36.0),
          child: Column(
            children: [
              _buildRow(['1', '2', '3'], ['', 'A B C', 'D E F']),
              const SizedBox(height: 12),
              _buildRow(['4', '5', '6'], ['G H I', 'J K L', 'M N O']),
              const SizedBox(height: 12),
              _buildRow(
                  ['7', '8', '9'], ['P Q R S', 'T U V', 'W X Y Z']),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  DialpadButton(
                      title: '*', subtitle: '', onTap: () => _onKeyPress('*')),
                  DialpadButton(
                    title: '0',
                    subtitle: '+',
                    onTap: () => _onKeyPress('0'),
                    onLongPress: () => _onKeyPress('+'),
                  ),
                  DialpadButton(
                      title: '#', subtitle: '', onTap: () => _onKeyPress('#')),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Call + Backspace Row
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 36.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              const SizedBox(width: 76),
              // Green call button
              DialpadButton(
                title: '',
                isCallButton: true,
                onTap: _onCall,
              ),
              // Backspace
              SizedBox(
                width: 76,
                child: AnimatedOpacity(
                  opacity: _number.isNotEmpty ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 200),
                  child: IconButton(
                    icon: const Icon(CupertinoIcons.delete_left),
                    iconSize: 26,
                    color: theme.colorScheme.onSurface,
                    onPressed: _number.isNotEmpty ? _onBackspace : null,
                    onLongPress:
                        _number.isNotEmpty ? _onLongBackspace : null,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildRow(List<String> titles, List<String> subtitles) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: List.generate(
        3,
        (i) => DialpadButton(
          title: titles[i],
          subtitle: subtitles[i],
          onTap: () => _onKeyPress(titles[i]),
        ),
      ),
    );
  }
}
