/**
 * ═══════════════════════════════════════════════════════════════
 * ✏️ useEditMode — إدارة وضع التعديل وتتبع التغييرات
 * ═══════════════════════════════════════════════════════════════
 * - lock/unlock المعاملة حسب المرحلة
 * - dirty tracking (هل توجد تغييرات غير محفوظة؟)
 * - تحذير المستخدم عند محاولة المغادرة
 * - تحديد الحقول القابلة للتعديل حسب المرحلة
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { getStageDefinition } from '../config/stageConfig';

interface UseEditModeOptions {
    /** Current transaction stage */
    stage: string;
    /** Transaction type */
    transactionType?: 'purchase' | 'sale';
    /** Is this a new (unsaved) transaction? */
    isNew?: boolean;
    /** Warn before leaving with unsaved changes? */
    warnOnLeave?: boolean;
}

interface UseEditModeReturn {
    /** Is currently in edit mode? */
    isEditing: boolean;
    /** Enable editing */
    startEditing: () => void;
    /** Disable editing */
    stopEditing: () => void;
    /** Toggle editing */
    toggleEditing: () => void;
    /** Are there unsaved changes? */
    isDirty: boolean;
    /** Mark as dirty (something changed) */
    markDirty: () => void;
    /** Mark as clean (just saved) */
    markClean: () => void;
    /** Can edit items at this stage? */
    canEditItems: boolean;
    /** Can edit header fields at this stage? */
    canEditHeader: boolean;
    /** Is this a terminal stage (no more editing)? */
    isTerminal: boolean;
    /** Is this stage read-only? */
    isReadOnly: boolean;
}

export function useEditMode({
    stage,
    transactionType = 'purchase',
    isNew = false,
    warnOnLeave = true,
}: UseEditModeOptions): UseEditModeReturn {
    const [isEditing, setIsEditing] = useState(isNew);
    const [isDirty, setIsDirty] = useState(false);
    const initialStageRef = useRef(stage);

    // Get stage definition for edit permissions
    const stageDef = useMemo(() => {
        return getStageDefinition(transactionType, stage);
    }, [transactionType, stage]);

    const canEditItems = stageDef?.canEditItems ?? false;
    const canEditHeader = stageDef?.canEditHeader ?? false;
    const isTerminal = stageDef?.isTerminal ?? false;

    // Read-only if terminal stage or neither items nor header can be edited
    const isReadOnly = isTerminal || (!canEditItems && !canEditHeader);

    // Start editing
    const startEditing = useCallback(() => {
        if (!isReadOnly) {
            setIsEditing(true);
        }
    }, [isReadOnly]);

    // Stop editing
    const stopEditing = useCallback(() => {
        setIsEditing(false);
        setIsDirty(false);
    }, []);

    // Toggle editing
    const toggleEditing = useCallback(() => {
        if (isEditing) {
            stopEditing();
        } else {
            startEditing();
        }
    }, [isEditing, startEditing, stopEditing]);

    // Dirty tracking
    const markDirty = useCallback(() => {
        setIsDirty(true);
    }, []);

    const markClean = useCallback(() => {
        setIsDirty(false);
    }, []);

    // Auto-exit edit mode when stage changes (e.g., after advancing)
    useEffect(() => {
        if (stage !== initialStageRef.current) {
            initialStageRef.current = stage;
            setIsEditing(false);
            setIsDirty(false);
        }
    }, [stage]);

    // New transactions start in edit mode
    useEffect(() => {
        if (isNew) {
            setIsEditing(true);
        }
    }, [isNew]);

    // Warn on leave with unsaved changes
    useEffect(() => {
        if (!warnOnLeave || !isDirty) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = 'لديك تغييرات غير محفوظة. هل تريد المغادرة؟';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [warnOnLeave, isDirty]);

    return {
        isEditing,
        startEditing,
        stopEditing,
        toggleEditing,
        isDirty,
        markDirty,
        markClean,
        canEditItems,
        canEditHeader,
        isTerminal,
        isReadOnly,
    };
}

export default useEditMode;
