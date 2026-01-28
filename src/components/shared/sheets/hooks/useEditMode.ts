/**
 * useEditMode Hook
 * Hook لإدارة حالة التعديل في Detail Sheets
 * 
 * الميزات:
 * - Toggle بين View و Edit Mode
 * - إدارة البيانات المعدّلة
 * - Validation
 * - Save/Cancel
 */

import { useState, useCallback } from 'react';

export interface UseEditModeOptions<T = any> {
  initialData: T;
  onSave: (data: T) => Promise<void>;
  onCancel?: () => void;
  validateField?: (key: string, value: any) => string | null;
  validateAll?: (data: T) => Record<string, string>;
}

export interface UseEditModeReturn<T = any> {
  isEditing: boolean;
  editedData: T;
  originalData: T;
  isSaving: boolean;
  errors: Record<string, string>;
  isDirty: boolean;
  
  // Actions
  startEdit: () => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<boolean>;
  updateField: (key: string, value: any) => void;
  updateFields: (updates: Partial<T>) => void;
  resetField: (key: string) => void;
  clearErrors: () => void;
  setError: (key: string, message: string) => void;
}

export function useEditMode<T = any>(
  options: UseEditModeOptions<T>
): UseEditModeReturn<T> {
  const { initialData, onSave, onCancel, validateField, validateAll } = options;

  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<T>(initialData);
  const [originalData] = useState<T>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if data has been modified
  const isDirty = JSON.stringify(editedData) !== JSON.stringify(originalData);

  // Start editing
  const startEdit = useCallback(() => {
    setIsEditing(true);
    setEditedData(initialData); // Reset to latest data
    setErrors({});
  }, [initialData]);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedData(originalData); // Revert to original
    setErrors({});
    onCancel?.();
  }, [originalData, onCancel]);

  // Update single field
  const updateField = useCallback((key: string, value: any) => {
    setEditedData(prev => ({ ...prev, [key]: value }));
    
    // Validate field if validator provided
    if (validateField) {
      const error = validateField(key, value);
      setErrors(prev => {
        if (error) {
          return { ...prev, [key]: error };
        } else {
          const { [key]: _, ...rest } = prev;
          return rest;
        }
      });
    }
  }, [validateField]);

  // Update multiple fields
  const updateFields = useCallback((updates: Partial<T>) => {
    setEditedData(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset single field to original value
  const resetField = useCallback((key: string) => {
    setEditedData(prev => ({ ...prev, [key]: (originalData as any)[key] }));
    setErrors(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, [originalData]);

  // Save changes
  const saveEdit = useCallback(async (): Promise<boolean> => {
    // Validate all fields if validator provided
    if (validateAll) {
      const validationErrors = validateAll(editedData);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return false;
      }
    }

    // Check if there are any errors
    if (Object.keys(errors).length > 0) {
      return false;
    }

    setIsSaving(true);
    try {
      await onSave(editedData);
      setIsEditing(false);
      setErrors({});
      return true;
    } catch (error: any) {
      console.error('Error saving:', error);
      setErrors({ _general: error.message || 'حدث خطأ أثناء الحفظ' });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [editedData, errors, onSave, validateAll]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Set specific error
  const setError = useCallback((key: string, message: string) => {
    setErrors(prev => ({ ...prev, [key]: message }));
  }, []);

  return {
    isEditing,
    editedData,
    originalData,
    isSaving,
    errors,
    isDirty,
    startEdit,
    cancelEdit,
    saveEdit,
    updateField,
    updateFields,
    resetField,
    clearErrors,
    setError,
  };
}
