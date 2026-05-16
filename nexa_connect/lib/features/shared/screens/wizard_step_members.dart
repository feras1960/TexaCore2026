import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/contact.dart';
import '../../contacts/providers/contacts_provider.dart';
import 'wizard_step_details.dart';

enum GroupWizardType {
  talkie,
  chat,
  conference
}

class WizardStepMembers extends ConsumerStatefulWidget {
  final GroupWizardType wizardType;
  
  const WizardStepMembers({Key? key, required this.wizardType}) : super(key: key);

  static Future<void> show(BuildContext context, GroupWizardType type) {
    return Navigator.push(
      context,
      CupertinoPageRoute(
        builder: (ctx) => WizardStepMembers(wizardType: type),
        fullscreenDialog: true,
      ),
    );
  }

  @override
  ConsumerState<WizardStepMembers> createState() => _WizardStepMembersState();
}

class _WizardStepMembersState extends ConsumerState<WizardStepMembers> {
  final Set<String> _selectedContactIds = {};
  String _searchQuery = '';
  
  String get _title {
    switch (widget.wizardType) {
      case GroupWizardType.talkie:
        return 'Add Participants (Talkie)';
      case GroupWizardType.chat:
        return 'Add Participants (Chat)';
      case GroupWizardType.conference:
        return 'Add Call Members';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final allContacts = ref.watch(filteredContactsProvider);
    
    final displayContacts = _searchQuery.isEmpty 
        ? allContacts 
        : allContacts.where((c) => 
            c.name.toLowerCase().contains(_searchQuery.toLowerCase()) || 
            c.allNumbers.any((n) => n.contains(_searchQuery))).toList();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: theme.scaffoldBackgroundColor.withOpacity(0.8),
        elevation: 0,
        flexibleSpace: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(color: Colors.transparent),
          ),
        ),
        leading: IconButton(
          icon: Icon(CupertinoIcons.xmark, color: theme.colorScheme.primary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          children: [
            Text(
              _title,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: theme.colorScheme.onSurface,
              ),
            ),
            if (_selectedContactIds.isNotEmpty)
              Text(
                '${_selectedContactIds.length} selected',
                style: TextStyle(
                  fontSize: 12,
                  color: theme.colorScheme.onSurface.withOpacity(0.5),
                ),
              ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: _selectedContactIds.isEmpty ? null : _goToNextStep,
            child: Text(
              'Next',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: _selectedContactIds.isEmpty 
                    ? theme.colorScheme.onSurface.withOpacity(0.3)
                    : theme.colorScheme.primary,
              ),
            ),
          )
        ],
      ),
      body: Column(
        children: [
          // Selected contacts horizontal list
          if (_selectedContactIds.isNotEmpty)
            Container(
              height: 90,
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: theme.dividerColor.withOpacity(0.1))),
              ),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _selectedContactIds.length,
                itemBuilder: (context, index) {
                  final contactId = _selectedContactIds.elementAt(index);
                  final contact = allContacts.firstWhere((c) => c.id == contactId);
                  
                  return Padding(
                    padding: const EdgeInsets.only(right: 16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Stack(
                          children: [
                            CircleAvatar(
                              radius: 24,
                              backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                              child: Text(
                                contact.name.isNotEmpty ? contact.name[0].toUpperCase() : '?',
                                style: TextStyle(
                                  color: theme.colorScheme.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            Positioned(
                              right: -4,
                              top: -4,
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _selectedContactIds.remove(contactId);
                                  });
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(2),
                                  decoration: BoxDecoration(
                                    color: theme.scaffoldBackgroundColor,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    CupertinoIcons.minus_circle_fill,
                                    size: 20,
                                    color: Colors.grey.shade400,
                                  ),
                                ),
                              ),
                            )
                          ],
                        ),
                        const SizedBox(height: 4),
                        SizedBox(
                          width: 56,
                          child: Text(
                            contact.name.split(' ').first,
                            style: TextStyle(
                              fontSize: 11,
                              color: theme.colorScheme.onSurface,
                            ),
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: CupertinoSearchTextField(
              placeholder: 'Search name or number',
              style: TextStyle(color: theme.colorScheme.onSurface),
              onChanged: (val) {
                setState(() {
                  _searchQuery = val;
                });
              },
            ),
          ),
          
          // Contacts List
          Expanded(
            child: displayContacts.isEmpty
                ? Center(
                    child: Text(
                      'No contacts found',
                      style: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.5)),
                    ),
                  )
                : ListView.builder(
                    itemCount: displayContacts.length,
                    itemBuilder: (context, index) {
                      final contact = displayContacts[index];
                      final isSelected = _selectedContactIds.contains(contact.id);
                      
                      return InkWell(
                        onTap: () {
                          setState(() {
                            if (isSelected) {
                              _selectedContactIds.remove(contact.id);
                            } else {
                              _selectedContactIds.add(contact.id);
                            }
                          });
                        },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          child: Row(
                            children: [
                              Container(
                                width: 22,
                                height: 22,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isSelected ? theme.colorScheme.primary : Colors.transparent,
                                  border: Border.all(
                                    color: isSelected ? theme.colorScheme.primary : theme.dividerColor,
                                    width: 1.5,
                                  ),
                                ),
                                child: isSelected
                                    ? const Icon(Icons.check, size: 14, color: Colors.white)
                                    : null,
                              ),
                              const SizedBox(width: 16),
                              CircleAvatar(
                                radius: 20,
                                backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                                child: Text(
                                  contact.name.isNotEmpty ? contact.name[0].toUpperCase() : '?',
                                  style: TextStyle(
                                    color: theme.colorScheme.primary,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      contact.name,
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                        color: theme.colorScheme.onSurface,
                                      ),
                                    ),
                                    if (contact.number.isNotEmpty) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        contact.number,
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: theme.colorScheme.onSurface.withOpacity(0.5),
                                        ),
                                      ),
                                    ]
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _goToNextStep() {
    final allContacts = ref.read(filteredContactsProvider);
    final selectedContacts = allContacts.where((c) => _selectedContactIds.contains(c.id)).toList();
    
    Navigator.push(
      context,
      CupertinoPageRoute(
        builder: (ctx) => WizardStepDetails(
          wizardType: widget.wizardType,
          selectedContacts: selectedContacts,
        ),
      ),
    );
  }
}
