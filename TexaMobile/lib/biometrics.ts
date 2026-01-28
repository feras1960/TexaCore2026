/**
 * Biometric Authentication Logic
 * Support for FaceID, TouchID, and Fingerprint
 */

import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './supabase';

/**
 * Biometric availability result
 */
export interface BiometricAvailability {
  isAvailable: boolean;
  biometricType: 'faceId' | 'touchId' | 'fingerprint' | 'iris' | 'none';
  error?: string;
}

/**
 * Biometric authentication result
 */
export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: string;
}

/**
 * Check if device supports biometric authentication
 */
export const checkBiometricAvailability = async (): Promise<BiometricAvailability> => {
  try {
    // Check if hardware is available
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    
    if (!hasHardware) {
      return {
        isAvailable: false,
        biometricType: 'none',
        error: 'الجهاز لا يدعم البصمة',
      };
    }

    // Check if biometric is enrolled
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (!isEnrolled) {
      return {
        isAvailable: false,
        biometricType: 'none',
        error: 'لم يتم تسجيل البصمة في الجهاز',
      };
    }

    // Get supported authentication types
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    // Determine biometric type
    let biometricType: 'faceId' | 'touchId' | 'fingerprint' | 'iris' | 'none' = 'none';
    
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'faceId';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'fingerprint';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = 'iris';
    }

    return {
      isAvailable: true,
      biometricType,
    };
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return {
      isAvailable: false,
      biometricType: 'none',
      error: 'حدث خطأ أثناء التحقق من البصمة',
    };
  }
};

/**
 * Authenticate with biometrics
 */
export const authenticateWithBiometrics = async (
  promptMessage: string = 'قم بالمصادقة للدخول'
): Promise<BiometricAuthResult> => {
  try {
    // Check if biometric is available
    const availability = await checkBiometricAvailability();
    
    if (!availability.isAvailable) {
      return {
        success: false,
        error: availability.error || 'البصمة غير متاحة',
      };
    }

    // Authenticate
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'استخدم كلمة المرور',
      cancelLabel: 'إلغاء',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return {
        success: true,
        biometricType: availability.biometricType,
      };
    } else {
      return {
        success: false,
        error: result.error === 'user_cancel' 
          ? 'تم إلغاء المصادقة' 
          : 'فشلت المصادقة بالبصمة',
      };
    }
  } catch (error) {
    console.error('Error authenticating with biometrics:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء المصادقة',
    };
  }
};

/**
 * Enable biometric login
 */
export const enableBiometricLogin = async (userEmail: string): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
    await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, userEmail);
    return true;
  } catch (error) {
    console.error('Error enabling biometric login:', error);
    return false;
  }
};

/**
 * Disable biometric login
 */
export const disableBiometricLogin = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
    return true;
  } catch (error) {
    console.error('Error disabling biometric login:', error);
    return false;
  }
};

/**
 * Check if biometric login is enabled
 */
export const isBiometricLoginEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking biometric login status:', error);
    return false;
  }
};

/**
 * Get stored email for biometric login
 */
export const getBiometricEmail = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL);
  } catch (error) {
    console.error('Error getting biometric email:', error);
    return null;
  }
};

/**
 * Get biometric icon name based on type
 */
export const getBiometricIconName = (biometricType: string): string => {
  switch (biometricType) {
    case 'faceId':
      return 'scan-outline';
    case 'fingerprint':
    case 'touchId':
      return 'finger-print-outline';
    case 'iris':
      return 'eye-outline';
    default:
      return 'lock-closed-outline';
  }
};

/**
 * Get biometric display name
 */
export const getBiometricDisplayName = (biometricType: string): string => {
  switch (biometricType) {
    case 'faceId':
      return 'Face ID';
    case 'fingerprint':
      return 'بصمة الإصبع';
    case 'touchId':
      return 'Touch ID';
    case 'iris':
      return 'مسح القزحية';
    default:
      return 'البصمة';
  }
};

export default {
  checkBiometricAvailability,
  authenticateWithBiometrics,
  enableBiometricLogin,
  disableBiometricLogin,
  isBiometricLoginEnabled,
  getBiometricEmail,
  getBiometricIconName,
  getBiometricDisplayName,
};
