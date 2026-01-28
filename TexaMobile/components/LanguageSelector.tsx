/**
 * Language Selector Modal
 * Select app language from 9 supported languages
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { UnifiedDesignSystem } from '@/constants/unified-theme';
import { SUPPORTED_LANGUAGES, setI18nLanguage } from '@/i18n';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  visible,
  onClose,
  isDark,
}) => {
  const { t, i18n } = useTranslation();
  const theme = UnifiedDesignSystem.getTheme(isDark);
  const currentLanguage = i18n.language;

  const handleLanguageSelect = async (languageCode: string) => {
    await setI18nLanguage(languageCode);
    onClose();
    // Note: App needs restart for RTL changes to take effect
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text.primary }]}>
            {t('settings.app.language')}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Language List */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {SUPPORTED_LANGUAGES.map((language, index) => {
            const isSelected = currentLanguage === language.code;
            
            return (
              <TouchableOpacity
                key={language.code}
                onPress={() => handleLanguageSelect(language.code)}
                style={[
                  styles.languageItem,
                  {
                    backgroundColor: isSelected ? theme.primary + '15' : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                {/* Flag Emoji (optional - you can add flags if needed) */}
                <View style={[styles.flagContainer, { backgroundColor: theme.surface }]}>
                  <Text style={styles.flagText}>
                    {getFlagEmoji(language.code)}
                  </Text>
                </View>

                {/* Language Name */}
                <View style={styles.languageInfo}>
                  <Text
                    style={[
                      styles.languageName,
                      {
                        color: isSelected ? theme.primary : theme.text.primary,
                        fontWeight: isSelected ? '600' : '500',
                      },
                    ]}
                  >
                    {language.nativeName}
                  </Text>
                  <Text style={[styles.languageCode, { color: theme.text.secondary }]}>
                    {t(`languages.${language.code}`)}
                  </Text>
                </View>

                {/* Checkmark */}
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Footer Note */}
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={20} color={theme.text.secondary} />
          <Text style={[styles.footerText, { color: theme.text.secondary }]}>
            {currentLanguage === 'ar' 
              ? 'قد تحتاج إلى إعادة تشغيل التطبيق لتطبيق التغييرات'
              : 'App restart may be required for RTL changes'}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Helper function to get flag emoji
const getFlagEmoji = (languageCode: string): string => {
  const flags: Record<string, string> = {
    ar: '🇸🇦',
    en: '🇬🇧',
    de: '🇩🇪',
    tr: '🇹🇷',
    ru: '🇷🇺',
    uk: '🇺🇦',
    it: '🇮🇹',
    pl: '🇵🇱',
    ro: '🇷🇴',
    fr: '🇫🇷',
  };
  return flags[languageCode] || '🌐';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: UnifiedDesignSystem.spacing.lg,
    paddingVertical: UnifiedDesignSystem.spacing.md,
    borderBottomWidth: 0.5,
  },

  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: UnifiedDesignSystem.typography.fontSize.xl,
    fontWeight: UnifiedDesignSystem.typography.fontWeight.bold,
  },

  content: {
    flex: 1,
    paddingHorizontal: UnifiedDesignSystem.spacing.lg,
    paddingTop: UnifiedDesignSystem.spacing.lg,
  },

  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: UnifiedDesignSystem.spacing.lg,
    borderRadius: UnifiedDesignSystem.borderRadius.md,
    borderWidth: 1.5,
    marginBottom: UnifiedDesignSystem.spacing.sm,
  },

  flagContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: UnifiedDesignSystem.spacing.md,
  },

  flagText: {
    fontSize: 28,
  },

  languageInfo: {
    flex: 1,
  },

  languageName: {
    fontSize: UnifiedDesignSystem.typography.fontSize.md,
    marginBottom: 2,
  },

  languageCode: {
    fontSize: UnifiedDesignSystem.typography.fontSize.sm,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UnifiedDesignSystem.spacing.lg,
    paddingVertical: UnifiedDesignSystem.spacing.md,
    borderTopWidth: 0.5,
    gap: UnifiedDesignSystem.spacing.sm,
  },

  footerText: {
    flex: 1,
    fontSize: UnifiedDesignSystem.typography.fontSize.sm,
  },
});
