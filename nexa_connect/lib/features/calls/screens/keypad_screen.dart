import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'dart:async';
import '../providers/sip_provider.dart';
import '../../../core/services/sip_service.dart';
import '../../../widgets/shared/dialpad_button.dart';
import '../../contacts/providers/contacts_provider.dart';
import '../../contacts/screens/contact_detail_screen.dart';
import '../../../core/models/contact.dart';

/// Standalone Keypad tab with integrated Active Call screen.
/// When idle → shows the dialpad. When in a call → flips to active call view.
class KeypadScreen extends ConsumerStatefulWidget {
  const KeypadScreen({super.key});

  @override
  ConsumerState<KeypadScreen> createState() => _KeypadScreenState();
}

class _KeypadScreenState extends ConsumerState<KeypadScreen>
    with TickerProviderStateMixin {
  String _number = '';
  Timer? _callTimer;
  int _callSeconds = 0;
  final FocusNode _focusNode = FocusNode();

  // For in-call DTMF mini-keypad
  bool _showInCallDtmf = false;
  bool _showAllResults = false;

  /// Match contacts by phone number — simple digit matching (for dialpad)
  List<Contact> _matchContacts(List<Contact> contacts, String digits) {
    if (digits.isEmpty) return [];

    // Normalize: strip spaces, dashes, parens
    String normalize(String n) => n.replaceAll(RegExp(r'[\s\-\(\)\+]'), '');

    final normalizedInput = normalize(digits);
    if (normalizedInput.isEmpty) return [];

    final startsWithResults = <Contact>[];
    final containsResults = <Contact>[];

    for (final c in contacts) {
      for (final num in c.allNumbers) {
        final normalizedNum = normalize(num);
        if (normalizedNum.startsWith(normalizedInput)) {
          startsWithResults.add(c);
          break;
        } else if (normalizedNum.contains(normalizedInput)) {
          containsResults.add(c);
          break;
        }
      }
    }

    // startsWith matches are more relevant, show them first
    return [...startsWithResults, ...containsResults];
  }

  /// Search contacts by name OR number — for Transfer/AddCall overlays
  /// When query is empty → returns all contacts (favorites & extensions first)
  List<Contact> _searchAllContacts(List<Contact> contacts, String query) {
    final q = query.trim().toLowerCase();

    List<Contact> results;

    if (q.isEmpty) {
      // Show all contacts — sorted: favorites first, then by type
      results = List.from(contacts);
    } else {
      // Search by name (any language) AND number
      final normalize = (String n) => n.replaceAll(RegExp(r'[\s\-\(\)\+]'), '');
      results = contacts.where((c) {
        // Name match
        if (c.name.toLowerCase().contains(q)) return true;
        if (c.nameAr != null && c.nameAr!.toLowerCase().contains(q)) return true;
        if (c.nameEn != null && c.nameEn!.toLowerCase().contains(q)) return true;
        if (c.companyName != null && c.companyName!.toLowerCase().contains(q)) return true;
        // Number match
        final normalizedQ = normalize(q);
        if (normalizedQ.isNotEmpty) {
          for (final num in c.allNumbers) {
            if (normalize(num).contains(normalizedQ)) return true;
          }
        }
        return false;
      }).toList();
    }

    // Sort: favorites first, then extensions (short numbers), then alphabetical
    results.sort((a, b) {
      // Favorites first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      // Extensions (numbers <= 3 digits) second
      final aIsExt = a.number.length <= 3;
      final bIsExt = b.number.length <= 3;
      if (aIsExt && !bIsExt) return -1;
      if (!aIsExt && bIsExt) return 1;
      // Then alphabetical
      return a.name.compareTo(b.name);
    });

    return results;
  }

  void _onKeyPress(String value) {
    setState(() {
      if (_number.length < 20) _number += value;
      _showAllResults = false;
    });
  }

  void _onBackspace() {
    if (_number.isNotEmpty) {
      setState(() {
        _number = _number.substring(0, _number.length - 1);
        _showAllResults = false;
      });
    }
  }

  void _onLongBackspace() {
    setState(() => _number = '');
  }

  void _onCall() {
    if (_number.isNotEmpty) {
      final sip = ref.read(sipServiceProvider);
      sip.makeCall(_number);
      setState(() => _number = ''); // Clear dialpad after calling
    }
  }

  /// Handle physical keyboard input (desktop support)
  void _handleKeyEvent(KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) return;

    // Don't handle keyboard when in a call (unless DTMF pad is showing)
    final callState = ref.read(sipServiceProvider).callState;
    if (callState != NexaCallState.idle && !_showInCallDtmf) return;

    final key = event.logicalKey;

    // Number keys (both main keyboard and numpad)
    if (key == LogicalKeyboardKey.digit0 || key == LogicalKeyboardKey.numpad0) {
      _onKeyPress('0');
    } else if (key == LogicalKeyboardKey.digit1 || key == LogicalKeyboardKey.numpad1) {
      _onKeyPress('1');
    } else if (key == LogicalKeyboardKey.digit2 || key == LogicalKeyboardKey.numpad2) {
      _onKeyPress('2');
    } else if (key == LogicalKeyboardKey.digit3 || key == LogicalKeyboardKey.numpad3) {
      _onKeyPress('3');
    } else if (key == LogicalKeyboardKey.digit4 || key == LogicalKeyboardKey.numpad4) {
      _onKeyPress('4');
    } else if (key == LogicalKeyboardKey.digit5 || key == LogicalKeyboardKey.numpad5) {
      _onKeyPress('5');
    } else if (key == LogicalKeyboardKey.digit6 || key == LogicalKeyboardKey.numpad6) {
      _onKeyPress('6');
    } else if (key == LogicalKeyboardKey.digit7 || key == LogicalKeyboardKey.numpad7) {
      _onKeyPress('7');
    } else if (key == LogicalKeyboardKey.digit8 || key == LogicalKeyboardKey.numpad8) {
      _onKeyPress('8');
    } else if (key == LogicalKeyboardKey.digit9 || key == LogicalKeyboardKey.numpad9) {
      _onKeyPress('9');
    }
    // Special keys
    else if (key == LogicalKeyboardKey.asterisk || key == LogicalKeyboardKey.numpadMultiply) {
      _onKeyPress('*');
    } else if (key == LogicalKeyboardKey.numberSign) {
      _onKeyPress('#');
    } else if (key == LogicalKeyboardKey.add || key == LogicalKeyboardKey.numpadAdd) {
      _onKeyPress('+');
    }
    // Backspace
    else if (key == LogicalKeyboardKey.backspace || key == LogicalKeyboardKey.delete) {
      _onBackspace();
    }
    // Enter = Call
    else if (key == LogicalKeyboardKey.enter || key == LogicalKeyboardKey.numpadEnter) {
      _onCall();
    }
    // Escape = clear
    else if (key == LogicalKeyboardKey.escape) {
      _onLongBackspace();
    }
  }

  void _startTimer() {
    _callTimer?.cancel();
    _callSeconds = 0;
    _callTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _callSeconds++);
    });
  }

  void _stopTimer() {
    _callTimer?.cancel();
    _callTimer = null;
    _callSeconds = 0;
  }

  String _formatDuration(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  String _formatNumber(String number) {
    if (number.length <= 3) return number;
    if (number.length <= 6) {
      return '${number.substring(0, 3)} ${number.substring(3)}';
    }
    return '${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}';
  }

  @override
  void dispose() {
    _callTimer?.cancel();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final callState = ref.watch(callStateProvider);
    final activeCall = ref.watch(activeCallProvider);
    final registrationState = ref.watch(sipRegistrationProvider);
    final sipService = ref.watch(sipServiceProvider);
    final theme = Theme.of(context);

    // Start/stop timer based on state
    if (callState == NexaCallState.connected && _callTimer == null) {
      _startTimer();
    } else if (callState == NexaCallState.idle && _callTimer != null) {
      _stopTimer();
    }

    // If in a call → show active call screen
    if (callState != NexaCallState.idle && activeCall != null) {
      return _buildActiveCallScreen(theme, callState, activeCall);
    }

    // Otherwise → show dialpad with keyboard listener
    return KeyboardListener(
      focusNode: _focusNode,
      autofocus: true,
      onKeyEvent: _handleKeyEvent,
      child: _buildDialpad(theme, registrationState),
    );
  }

  Widget _buildDialpad(ThemeData theme, String registrationState) {
    final sipService = ref.watch(sipServiceProvider);
    final isRegistered = registrationState == 'REGISTERED';
    final isDark = theme.brightness == Brightness.dark;
    final contacts = ref.watch(contactsProvider);
    final matches = _matchContacts(contacts, _number);
    final bestMatch = matches.isNotEmpty ? matches.first : null;
    final moreCount = matches.length - 1;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            // Top bar with SIP status + Add Contact icon (top-right)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  GestureDetector(
                    onDoubleTap: () {
                      // Show debug log on long press
                      final sip = ref.read(sipServiceProvider);
                      showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        builder: (_) => Container(
                          height: MediaQuery.of(context).size.height * 0.7,
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Text('🔧 SIP Debug Log', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                  const Spacer(),
                                  IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
                                ],
                              ),
                              const Divider(),
                              Expanded(
                                child: ListView.builder(
                                  reverse: true,
                                  itemCount: sip.debugLogs.length,
                                  itemBuilder: (_, i) => Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 2),
                                    child: Text(
                                      sip.debugLogs[sip.debugLogs.length - 1 - i],
                                      style: const TextStyle(fontSize: 11, fontFamily: 'monospace'),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                    child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isRegistered
                          ? const Color(0xFF34C759).withAlpha(20)
                          : Colors.orange.withAlpha(20),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isRegistered
                                ? const Color(0xFF34C759)
                                : Colors.orange,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          isRegistered ? 'Ext ${sipService.currentUsername}' : 'Connecting...',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: isRegistered
                                ? const Color(0xFF34C759)
                                : Colors.orange.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  ),
                  const Spacer(),
                  Text(
                    'Keypad',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      fontSize: 20,
                    ),
                  ),
                  const Spacer(),
                  // Add Contact button (top-right, iPhone-style)
                  AnimatedOpacity(
                    opacity: _number.isNotEmpty ? 1.0 : 0.0,
                    duration: const Duration(milliseconds: 200),
                    child: PopupMenuButton<String>(
                      enabled: _number.isNotEmpty,
                      icon: Icon(
                        CupertinoIcons.person_crop_circle_badge_plus,
                        color: theme.colorScheme.primary,
                        size: 26,
                      ),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                      color: isDark ? const Color(0xFF2C2C2E) : Colors.white,
                      elevation: 8,
                      offset: const Offset(0, 40),
                      onSelected: (value) {
                        if (value == 'new') {
                          Navigator.of(context).push(MaterialPageRoute(
                            builder: (_) => AddContactFullScreen(
                              phoneNumber: _number,
                              onSave: (contact) {
                                ref.read(contactsProvider.notifier)
                                    .addContact(contact);
                              },
                            ),
                          ));
                        }
                      },
                      itemBuilder: (_) => [
                        PopupMenuItem(
                          value: 'new',
                          child: Row(
                            children: [
                              const Icon(CupertinoIcons.plus, size: 18),
                              const SizedBox(width: 10),
                              Text('Create New Contact',
                                  style: TextStyle(
                                    color: theme.colorScheme.onSurface,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w500,
                                  )),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'existing',
                          child: Row(
                            children: [
                              const Icon(CupertinoIcons.person_2, size: 18),
                              const SizedBox(width: 10),
                              Text('Add to Existing Contact',
                                  style: TextStyle(
                                    color: theme.colorScheme.onSurface,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w500,
                                  )),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const Spacer(flex: 1),

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
                  _number.isEmpty ? '' : _formatNumber(_number),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),

            // ── Single best match bar (fixed height — never pushes keypad) ──
            SizedBox(
              height: 44,
              child: (_number.isNotEmpty && bestMatch != null)
                  ? Container(
                      margin: const EdgeInsets.symmetric(horizontal: 20),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withOpacity(0.06)
                            : Colors.black.withOpacity(0.04),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () {
                          setState(() {
                            _number = bestMatch.number
                                .replaceAll(RegExp(r'[\s\-\(\)\+]'), '');
                          });
                        },
                        onLongPress: () {
                          Navigator.of(context).push(MaterialPageRoute(
                            builder: (_) =>
                                ContactDetailScreen(contact: bestMatch),
                          ));
                        },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          child: Row(
                            children: [
                              // Mini avatar
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: LinearGradient(
                                    colors: _getAvatarGradient(bestMatch.name),
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                ),
                                child: Center(
                                  child: Text(
                                    bestMatch.name
                                        .substring(0, 1)
                                        .toUpperCase(),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              // Name (truncated)
                              Expanded(
                                child: Text(
                                  bestMatch.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: theme.colorScheme.onSurface,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              // Number with highlight
                              _buildHighlightedNumber(
                                  bestMatch.number, _number, theme),
                            ],
                          ),
                        ),
                      ),
                    )
                  : const SizedBox.shrink(),
            ),

            // "X More Results" — compact text below
            SizedBox(
              height: 20,
              child: (_number.isNotEmpty && moreCount > 0)
                  ? Padding(
                      padding: const EdgeInsets.only(left: 32),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(CupertinoIcons.search,
                                size: 12,
                                color: theme.colorScheme.onSurface
                                    .withOpacity(0.35)),
                            const SizedBox(width: 4),
                            Text(
                              '$moreCount More Results',
                              style: TextStyle(
                                color: theme.colorScheme.primary,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  : const SizedBox.shrink(),
            ),

            const SizedBox(height: 4),

            // Dialpad Grid (Centered & Fixed width with LTR direction)
            Center(
              child: SizedBox(
                width: 320,
                child: Directionality(
                  textDirection: TextDirection.ltr,
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        child: Column(
                          children: [
                            _buildRow(['1', '2', '3'], ['', 'A B C', 'D E F']),
                            const SizedBox(height: 14),
                            _buildRow(['4', '5', '6'], ['G H I', 'J K L', 'M N O']),
                            const SizedBox(height: 14),
                            _buildRow(
                                ['7', '8', '9'], ['P Q R S', 'T U V', 'W X Y Z']),
                            const SizedBox(height: 14),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                DialpadButton(
                                    title: '*',
                                    subtitle: '',
                                    onTap: () => _onKeyPress('*')),
                                DialpadButton(
                                  title: '0',
                                  subtitle: '+',
                                  onTap: () => _onKeyPress('0'),
                                  onLongPress: () => _onKeyPress('+'),
                                ),
                                DialpadButton(
                                    title: '#',
                                    subtitle: '',
                                    onTap: () => _onKeyPress('#')),
                              ],
                            ),
                          ],
                        ),
                      ),

                    const SizedBox(height: 20),

                    // Call + Backspace (original layout, no add contact here)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 28.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          const SizedBox(width: 80),
                          DialpadButton(
                            title: '',
                            isCallButton: true,
                            onTap: _onCall,
                          ),
                          SizedBox(
                            width: 80,
                            child: AnimatedOpacity(
                              opacity: _number.isNotEmpty ? 1.0 : 0.0,
                              duration: const Duration(milliseconds: 200),
                              child: GestureDetector(
                                onLongPress: _number.isNotEmpty ? _onLongBackspace : null,
                                child: IconButton(
                                  icon: const Icon(CupertinoIcons.delete_left),
                                  iconSize: 26,
                                  color: theme.colorScheme.onSurface,
                                  onPressed: _number.isNotEmpty ? _onBackspace : null,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
            const SizedBox(height: 16),
            const Spacer(flex: 1),
          ],
        ),
      ),
    );
  }

  // ===== ACTIVE CALL VIEW =====

  // State for in-call overlays
  bool _showTransferSheet = false;
  bool _showAddCallDialpad = false;
  String _transferNumber = '';
  String _addCallNumber = '';

  Widget _buildActiveCallScreen(
      ThemeData theme, NexaCallState callState, ActiveCall call) {
    final isRinging = callState == NexaCallState.ringing;
    final isConnecting = callState == NexaCallState.connecting;
    final isConnected = callState == NexaCallState.connected;
    final sip = ref.read(sipServiceProvider);
    final heldCall = ref.watch(heldCallProvider);
    final hasHeld = heldCall != null;
    final isTransferConsult = sip.isTransferConsultation;
    final contacts = ref.watch(contactsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF1C1C1E),
      body: SafeArea(
        child: Stack(
          children: [
            // Hidden audio renderers — required for Flutter Web WebRTC audio
            Positioned(
              top: -100,
              left: -100,
              width: 1,
              height: 1,
              child: RTCVideoView(sip.remoteRenderer,
                  objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover),
            ),
            Positioned(
              top: -100,
              left: -100,
              width: 1,
              height: 1,
              child: RTCVideoView(sip.localRenderer,
                  objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover),
            ),
            // Main call UI
            Column(
          children: [
            // ── Held Call Banner ──
            if (hasHeld) ...[
              const SizedBox(height: 8),
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white.withOpacity(0.15)),
                ),
                child: Row(
                  children: [
                    // Pulsing hold indicator
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Color(0xFFFF9500),
                      ),
                    ),
                    const SizedBox(width: 10),
                    // Held call info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            heldCall.remoteNumber,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            isTransferConsult ? 'Consulting...' : 'On Hold',
                            style: TextStyle(
                              color: const Color(0xFFFF9500).withOpacity(0.8),
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Swap button
                    if (!isTransferConsult)
                      GestureDetector(
                        onTap: () {
                          sip.swapCalls();
                          setState(() {});
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(CupertinoIcons.repeat,
                                  size: 14, color: Colors.white),
                              SizedBox(width: 4),
                              Text('Swap',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ),
                    // Complete Transfer button (only in consultation mode)
                    if (isTransferConsult) ...[
                      GestureDetector(
                        onTap: () {
                          sip.completeAttendedTransfer();
                          setState(() {});
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFF34C759),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text('Transfer',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: () {
                          sip.cancelAttendedTransfer();
                          setState(() {});
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFF3B30).withOpacity(0.8),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text('Cancel',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700)),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ] else
              const SizedBox(height: 40),

            // Remote identity
            Text(
              call.remoteNumber,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 36,
                fontWeight: FontWeight.w300,
                letterSpacing: 1,
              ),
            ),

            const SizedBox(height: 8),

            // Call status
            Text(
              isRinging
                  ? (call.direction == CallDirection.inbound
                      ? 'Incoming Call...'
                      : 'Ringing...')
                  : isConnecting
                      ? 'Connecting...'
                      : isConnected
                          ? _formatDuration(_callSeconds)
                          : 'Call Ended',
              style: TextStyle(
                color: Colors.white.withOpacity(0.6),
                fontSize: 18,
                fontWeight: FontWeight.w400,
              ),
            ),

            // Spacer OR overlays (mutually exclusive to share the available space)
            if (_showTransferSheet)
              Expanded(child: _buildTransferOverlay(sip, contacts, theme))
            else if (_showAddCallDialpad)
              Expanded(child: _buildAddCallOverlay(sip, contacts, theme))
            else
              const Spacer(),

            // In-call DTMF keypad (toggleable)
            if (_showInCallDtmf) _buildInCallDtmf(),

            if (!_showInCallDtmf && !_showTransferSheet && !_showAddCallDialpad) ...[
              // Call action buttons (2x3 grid)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 40),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildCallAction(
                          icon: sip.isMuted
                              ? CupertinoIcons.mic_off
                              : CupertinoIcons.mic,
                          label: sip.isMuted ? 'Unmute' : 'Mute',
                          isActive: sip.isMuted,
                          onTap: () {
                            sip.toggleMute();
                            setState(() {});
                          },
                        ),
                        _buildCallAction(
                          icon: Icons.dialpad_rounded,
                          label: 'Keypad',
                          onTap: () =>
                              setState(() => _showInCallDtmf = true),
                        ),
                        _buildCallAction(
                          icon: CupertinoIcons.speaker_2,
                          label: 'Speaker',
                          isActive: sip.isSpeakerOn,
                          onTap: () {
                            sip.toggleSpeaker();
                            setState(() {});
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 36),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Add Call / Merge button
                        hasHeld && !isTransferConsult
                            ? _buildCallAction(
                                icon: Icons.merge_type_rounded,
                                label: 'Merge',
                                onTap: () {
                                  sip.mergeCalls();
                                  setState(() {});
                                },
                              )
                            : _buildCallAction(
                                icon: CupertinoIcons.plus,
                                label: 'Add Call',
                                onTap: isConnected
                                    ? () => setState(() {
                                          _showAddCallDialpad = true;
                                          _addCallNumber = '';
                                        })
                                    : () {},
                              ),
                        _buildCallAction(
                          icon: sip.isOnHold
                              ? CupertinoIcons.play_fill
                              : CupertinoIcons.pause,
                          label: sip.isOnHold ? 'Resume' : 'Hold',
                          isActive: sip.isOnHold,
                          onTap: () {
                            sip.toggleHold();
                            setState(() {});
                          },
                        ),
                        _buildCallAction(
                          icon: CupertinoIcons.arrow_right_arrow_left,
                          label: 'Transfer',
                          onTap: isConnected
                              ? () => setState(() {
                                    _showTransferSheet = true;
                                    _transferNumber = '';
                                  })
                              : () {},
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 60),

            // Hangup / Answer buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Reject (if incoming)
                if (isRinging && call.direction == CallDirection.inbound) ...[
                  _buildHangupButton(onTap: () => sip.hangup()),
                  const SizedBox(width: 60),
                  _buildAnswerButton(onTap: () => sip.answerCall()),
                ] else if (hasHeld && !isTransferConsult) ...[
                  // Multi-call: hangup active and resume held
                  _buildHangupButton(onTap: () {
                    sip.hangupAndResume();
                    _showInCallDtmf = false;
                    _showTransferSheet = false;
                    _showAddCallDialpad = false;
                    setState(() {});
                  }),
                ] else ...[
                  // Just hangup
                  _buildHangupButton(onTap: () {
                    sip.hangup();
                    _showInCallDtmf = false;
                    _showTransferSheet = false;
                    _showAddCallDialpad = false;
                  }),
                ],
              ],
            ),

            const SizedBox(height: 50),
          ],
        ),
          ],
        ),
      ),
    );
  }

  // ===== TRANSFER OVERLAY =====

  Widget _buildTransferOverlay(SipService sip, List<Contact> contacts, ThemeData theme) {
    final matches = _searchAllContacts(contacts, _transferNumber);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          // Header
          Row(
            children: [
              const Text('Transfer To',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w600)),
              const Spacer(),
              GestureDetector(
                onTap: () => setState(() => _showTransferSheet = false),
                child: const Icon(CupertinoIcons.xmark_circle_fill,
                    color: Colors.white38, size: 26),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Number input
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: TextField(
              autofocus: true,
              style: const TextStyle(color: Colors.white, fontSize: 18, letterSpacing: 1),
              keyboardType: TextInputType.text,
              decoration: InputDecoration(
                hintText: 'Enter number or search...',
                hintStyle: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 16),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
                suffixIcon: _transferNumber.isNotEmpty
                    ? GestureDetector(
                        onTap: () => setState(() => _transferNumber = ''),
                        child: const Icon(CupertinoIcons.clear_circled,
                            color: Colors.white30, size: 20),
                      )
                    : null,
              ),
              onChanged: (v) => setState(() => _transferNumber = v),
            ),
          ),

          const SizedBox(height: 12),

          // Transfer action buttons
          if (_transferNumber.isNotEmpty) ...[
            Row(
              children: [
                // Blind Transfer
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      sip.transferCall(_transferNumber);
                      setState(() => _showTransferSheet = false);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF007AFF),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(CupertinoIcons.arrow_right, size: 16, color: Colors.white),
                          SizedBox(width: 6),
                          Text('Blind Transfer',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                // Attended Transfer
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      sip.startAttendedTransfer(_transferNumber);
                      setState(() => _showTransferSheet = false);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF34C759),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(CupertinoIcons.phone_fill, size: 16, color: Colors.white),
                          SizedBox(width: 6),
                          Text('Consult First',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],

          // Contact list
          Expanded(
            child: ListView.builder(
              itemCount: matches.length > 20 ? 20 : matches.length,
              itemBuilder: (_, i) {
                final c = matches[i];
                return _buildContactRow(
                  contact: c,
                  trailingIcon: CupertinoIcons.arrow_right_arrow_left,
                  trailingColor: Colors.white38,
                  onTap: () => setState(() {
                    _transferNumber = c.number.replaceAll(RegExp(r'[\s\-\(\)\+]'), '');
                  }),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // ===== SHARED CONTACT ROW =====

  Widget _buildContactRow({
    required Contact contact,
    required IconData trailingIcon,
    required Color trailingColor,
    required VoidCallback onTap,
  }) {
    final c = contact;
    final typeLabel = c.number.length <= 3
        ? 'Ext'
        : c.type == ContactType.customer
            ? 'Customer'
            : c.type == ContactType.supplier
                ? 'Supplier'
                : 'Phone';
    final typeColor = c.number.length <= 3
        ? const Color(0xFF007AFF)
        : c.type == ContactType.customer
            ? const Color(0xFF34C759)
            : c.type == ContactType.supplier
                ? const Color(0xFFFF9500)
                : Colors.white38;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
        margin: const EdgeInsets.only(bottom: 3),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.06),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(colors: _getAvatarGradient(c.name)),
              ),
              child: Center(
                child: Text(
                  c.name.isNotEmpty ? c.name.substring(0, 1).toUpperCase() : '?',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            // Name + Number + Type
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (c.isFavorite) ...[
                        const Icon(CupertinoIcons.star_fill,
                            size: 12, color: Color(0xFFFFD60A)),
                        const SizedBox(width: 4),
                      ],
                      Expanded(
                        child: Text(
                          c.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Text(
                        c.number,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.5),
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: typeColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          typeLabel,
                          style: TextStyle(
                            color: typeColor,
                            fontSize: 9,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Icon(trailingIcon, size: 16, color: trailingColor),
          ],
        ),
      ),
    );
  }

  // ===== ADD CALL OVERLAY =====

  Widget _buildAddCallOverlay(SipService sip, List<Contact> contacts, ThemeData theme) {
    final matches = _searchAllContacts(contacts, _addCallNumber);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          // Header
          Row(
            children: [
              const Text('Add Call',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w600)),
              const Spacer(),
              GestureDetector(
                onTap: () => setState(() => _showAddCallDialpad = false),
                child: const Icon(CupertinoIcons.xmark_circle_fill,
                    color: Colors.white38, size: 26),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Number input
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: TextField(
              autofocus: true,
              style: const TextStyle(color: Colors.white, fontSize: 18, letterSpacing: 1),
              keyboardType: TextInputType.text,
              decoration: InputDecoration(
                hintText: 'Enter number...',
                hintStyle: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 16),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
              ),
              onChanged: (v) => setState(() => _addCallNumber = v),
            ),
          ),

          const SizedBox(height: 12),

          // Call button
          if (_addCallNumber.isNotEmpty) ...[
            GestureDetector(
              onTap: () {
                sip.holdAndDial(_addCallNumber);
                setState(() {
                  _showAddCallDialpad = false;
                  _addCallNumber = '';
                });
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFF34C759),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(CupertinoIcons.phone_fill, size: 18, color: Colors.white),
                    SizedBox(width: 8),
                    Text('Hold & Call',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],

          // Contact list
          Expanded(
            child: ListView.builder(
              itemCount: matches.length > 20 ? 20 : matches.length,
              itemBuilder: (_, i) {
                final c = matches[i];
                return _buildContactRow(
                  contact: c,
                  trailingIcon: CupertinoIcons.phone_fill,
                  trailingColor: const Color(0xFF34C759),
                  onTap: () => setState(() {
                    _addCallNumber = c.number.replaceAll(RegExp(r'[\s\-\(\)\+]'), '');
                  }),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCallAction({
    required IconData icon,
    required String label,
    bool isActive = false,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 80,
        child: Column(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isActive
                    ? Colors.white
                    : Colors.white.withOpacity(0.12),
              ),
              child: Icon(
                icon,
                size: 28,
                color: isActive ? Colors.black : Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                color: Colors.white.withOpacity(0.8),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHangupButton({required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 72,
        height: 72,
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          color: Color(0xFFFF3B30),
        ),
        child: const Icon(
          CupertinoIcons.phone_down_fill,
          color: Colors.white,
          size: 36,
        ),
      ),
    );
  }

  Widget _buildAnswerButton({required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 72,
        height: 72,
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          color: Color(0xFF34C759),
        ),
        child: const Icon(
          CupertinoIcons.phone_fill,
          color: Colors.white,
          size: 36,
        ),
      ),
    );
  }

  Widget _buildInCallDtmf() {
    final sip = ref.read(sipServiceProvider);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 50),
      child: Column(
        children: [
          _buildDtmfRow(['1', '2', '3'], sip),
          const SizedBox(height: 8),
          _buildDtmfRow(['4', '5', '6'], sip),
          const SizedBox(height: 8),
          _buildDtmfRow(['7', '8', '9'], sip),
          const SizedBox(height: 8),
          _buildDtmfRow(['*', '0', '#'], sip),
          const SizedBox(height: 16),
          GestureDetector(
            onTap: () => setState(() => _showInCallDtmf = false),
            child: Text(
              'Hide',
              style: TextStyle(
                color: Colors.white.withOpacity(0.6),
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDtmfRow(List<String> digits, SipService sip) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: digits
          .map((d) => GestureDetector(
                onTap: () => sip.sendDTMF(d),
                child: Container(
                  width: 64,
                  height: 52,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      d,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.w300,
                      ),
                    ),
                  ),
                ),
              ))
          .toList(),
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

  Widget _buildHighlightedNumber(
      String fullNumber, String input, ThemeData theme) {
    final normalizedInput =
        input.replaceAll(RegExp(r'[\s\-\(\)\+]'), '');
    final normalizedFull =
        fullNumber.replaceAll(RegExp(r'[\s\-\(\)\+]'), '');
    final matchIndex = normalizedFull.indexOf(normalizedInput);

    if (matchIndex == -1) {
      return Text(fullNumber,
          style: TextStyle(
              color: theme.colorScheme.onSurface.withOpacity(0.5),
              fontSize: 13));
    }

    int origStart = 0;
    int digitCount = 0;
    for (int i = 0; i < fullNumber.length; i++) {
      if (RegExp(r'[0-9]').hasMatch(fullNumber[i])) {
        if (digitCount == matchIndex) {
          origStart = i;
          break;
        }
        digitCount++;
      }
    }

    int origEnd = origStart;
    int matchedDigits = 0;
    for (int i = origStart; i < fullNumber.length; i++) {
      if (RegExp(r'[0-9]').hasMatch(fullNumber[i])) {
        matchedDigits++;
      }
      origEnd = i + 1;
      if (matchedDigits == normalizedInput.length) break;
    }

    return RichText(
      text: TextSpan(
        children: [
          if (origStart > 0)
            TextSpan(
              text: fullNumber.substring(0, origStart),
              style: TextStyle(
                  color: theme.colorScheme.onSurface.withOpacity(0.5),
                  fontSize: 13),
            ),
          TextSpan(
            text: fullNumber.substring(origStart, origEnd),
            style: TextStyle(
              color: theme.colorScheme.onSurface,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (origEnd < fullNumber.length)
            TextSpan(
              text: fullNumber.substring(origEnd),
              style: TextStyle(
                  color: theme.colorScheme.onSurface.withOpacity(0.5),
                  fontSize: 13),
            ),
        ],
      ),
    );
  }

  List<Color> _getAvatarGradient(String name) {
    final colors = [
      [const Color(0xFF6366F1), const Color(0xFF8B5CF6)],
      [const Color(0xFF14B8A6), const Color(0xFF0EA5E9)],
      [const Color(0xFFF59E0B), const Color(0xFFEF4444)],
      [const Color(0xFF10B981), const Color(0xFF3B82F6)],
      [const Color(0xFFEC4899), const Color(0xFF8B5CF6)],
    ];
    final index =
        name.codeUnits.fold<int>(0, (p, c) => p + c) % colors.length;
    return colors[index];
  }
}

// ===== FULL-SCREEN ADD CONTACT (iPhone-style) =====

class AddContactFullScreen extends StatefulWidget {
  final String phoneNumber;
  final Function(Contact) onSave;

  const AddContactFullScreen({
    super.key,
    required this.phoneNumber,
    required this.onSave,
  });

  @override
  State<AddContactFullScreen> createState() => _AddContactFullScreenState();
}

class _AddContactFullScreenState extends State<AddContactFullScreen> {
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _companyCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _companyCtrl.dispose();
    _emailCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0A0A0A) : const Color(0xFFF2F2F7),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1C1C1E) : Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(CupertinoIcons.xmark, size: 22),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('New Contact',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 17)),
        centerTitle: true,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: IconButton(
              icon: Icon(
                CupertinoIcons.checkmark_circle_fill,
                color: theme.colorScheme.primary,
                size: 28,
              ),
              onPressed: _save,
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        children: [
          // Avatar placeholder
          Center(
            child: Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isDark
                    ? Colors.white.withOpacity(0.1)
                    : Colors.grey.shade200,
              ),
              child: Icon(
                CupertinoIcons.person_fill,
                size: 50,
                color: isDark
                    ? Colors.white.withOpacity(0.3)
                    : Colors.grey.shade400,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: TextButton(
              onPressed: () {},
              child: Text('Add Photo',
                  style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontSize: 14,
                      fontWeight: FontWeight.w500)),
            ),
          ),

          const SizedBox(height: 20),

          // Name fields
          _buildFieldCard(isDark, [
            _buildInputRow('First name', _firstNameCtrl, isDark, theme),
            _divider(theme),
            _buildInputRow('Last name', _lastNameCtrl, isDark, theme),
            _divider(theme),
            _buildInputRow('Company', _companyCtrl, isDark, theme),
          ]),

          const SizedBox(height: 20),

          // Phone (pre-filled, read-only)
          _buildFieldCard(isDark, [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  Icon(CupertinoIcons.phone_fill,
                      size: 18, color: const Color(0xFF34C759)),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Phone',
                          style: TextStyle(
                            fontSize: 12,
                            color: theme.colorScheme.onSurface
                                .withOpacity(0.45),
                          )),
                      const SizedBox(height: 2),
                      Text(widget.phoneNumber,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                            color: theme.colorScheme.onSurface,
                          )),
                    ],
                  ),
                ],
              ),
            ),
          ]),

          const SizedBox(height: 20),

          // Email
          _buildFieldCard(isDark, [
            _buildInputRow('Email', _emailCtrl, isDark, theme,
                icon: CupertinoIcons.mail,
                keyboardType: TextInputType.emailAddress),
          ]),

          const SizedBox(height: 20),

          // Notes
          _buildFieldCard(isDark, [
            _buildInputRow('Notes', _notesCtrl, isDark, theme,
                icon: CupertinoIcons.doc_text, maxLines: 3),
          ]),

          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildFieldCard(bool isDark, List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _divider(ThemeData theme) {
    return Divider(
      height: 1,
      indent: 16,
      color: theme.colorScheme.outline.withOpacity(0.1),
    );
  }

  Widget _buildInputRow(String label, TextEditingController ctrl,
      bool isDark, ThemeData theme,
      {IconData? icon,
      TextInputType? keyboardType,
      int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          if (icon != null) ...[
            Icon(icon,
                size: 18,
                color: theme.colorScheme.onSurface.withOpacity(0.35)),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: TextField(
              controller: ctrl,
              keyboardType: keyboardType,
              maxLines: maxLines,
              style: TextStyle(
                  color: theme.colorScheme.onSurface, fontSize: 16),
              decoration: InputDecoration(
                hintText: label,
                hintStyle: TextStyle(
                    color:
                        theme.colorScheme.onSurface.withOpacity(0.35)),
                border: InputBorder.none,
                contentPadding:
                    const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _save() {
    final firstName = _firstNameCtrl.text.trim();
    final lastName = _lastNameCtrl.text.trim();
    if (firstName.isEmpty && lastName.isEmpty) return;

    final fullName =
        [firstName, lastName].where((s) => s.isNotEmpty).join(' ');

    final contact = Contact(
      id: 'local_${DateTime.now().millisecondsSinceEpoch}',
      name: fullName,
      number: widget.phoneNumber,
      type: ContactType.phone,
      companyName:
          _companyCtrl.text.trim().isEmpty ? null : _companyCtrl.text.trim(),
      email: _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
      notes: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
    );

    widget.onSave(contact);
    Navigator.pop(context);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('✅ $fullName saved'),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }
}
