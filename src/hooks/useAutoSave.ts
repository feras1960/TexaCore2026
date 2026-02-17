/**
 * ═══════════════════════════════════════════════════════════════
 * 🔄 useAutoSave — حفظ تلقائي للمسودات (v2 — Cleaned Up)
 * ═══════════════════════════════════════════════════════════════
 * - يحفظ تلقائياً كل N ثوانٍ بعد آخر تغيير
 * - لا يحفظ إذا لم يكن هناك تغيير حقيقي
 * - يتجاهل أول render (لا ينشئ مسودة فارغة)
 * - يحفظ عند مغادرة الصفحة
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoSaveOptions<T> {
    /** البيانات الحالية */
    data: T | null;
    /** معرف السجل (null = لم يُحفظ بعد) */
    id: string | null;
    /** مرحلة السجل */
    stage: string;
    /** دالة الحفظ */
    onSave: (data: T) => Promise<any>;
    /** مدة الانتظار بالمللي ثانية (افتراضي 5000ms) */
    delay?: number;
    /** هل الحفظ مُعطّل؟ */
    disabled?: boolean;
}

interface UseAutoSaveReturn {
    /** حالة الحفظ */
    isSaving: boolean;
    /** آخر وقت حفظ */
    lastSavedAt: Date | null;
    /** تشغيل الحفظ يدوياً */
    saveNow: () => Promise<void>;
    /** هل يوجد تغييرات غير محفوظة */
    hasUnsavedChanges: boolean;
}

/**
 * Stable serializer — ignores volatile fields that change on every render
 * to prevent false-positive change detection
 */
function stableSerialize(data: any): string {
    if (!data) return '';
    // Clone and remove volatile/UI-only fields
    const { _posMode, _autoDelivery, _linkedOrderId, subType, type, ...stable } = data;
    return JSON.stringify(stable);
}

export function useAutoSave<T>({
    data,
    id,
    stage,
    onSave,
    delay = 5000,
    disabled = false,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedDataRef = useRef<string>('');
    const dataRef = useRef<T | null>(data);
    const isFirstRenderRef = useRef(true);
    const isSavingRef = useRef(false);
    dataRef.current = data;

    // ✅ حفظ فوري
    const saveNow = useCallback(async () => {
        if (!dataRef.current || disabled || isSavingRef.current) return;

        const serialized = stableSerialize(dataRef.current);
        // Don't save if nothing changed since last save
        if (serialized === lastSavedDataRef.current) {
            setHasUnsavedChanges(false);
            return;
        }

        // Don't save essentially empty data (no party, no items)
        const d = dataRef.current as any;
        const hasParty = !!(d?.party_id || d?.customer_id || d?.supplier_id);
        const hasItems = d?.items && d.items.length > 0;
        if (!hasParty && !hasItems) {
            console.log('⏭️ [AutoSave] Skipping — no party or items yet');
            return;
        }

        isSavingRef.current = true;
        setIsSaving(true);
        try {
            await onSave(dataRef.current);
            lastSavedDataRef.current = serialized;
            setLastSavedAt(new Date());
            setHasUnsavedChanges(false);
        } catch (err) {
            console.error('❌ [AutoSave] خطأ في الحفظ التلقائي:', err);
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    }, [onSave, disabled]);

    // ✅ مراقبة التغييرات — مع تجاهل أول render
    useEffect(() => {
        if (!data || disabled) return;

        // Skip the very first render to avoid saving empty/initial data
        if (isFirstRenderRef.current) {
            isFirstRenderRef.current = false;
            // Capture initial state so first real change triggers save
            lastSavedDataRef.current = stableSerialize(data);
            return;
        }

        const serialized = stableSerialize(data);
        if (serialized !== lastSavedDataRef.current) {
            setHasUnsavedChanges(true);

            // Reset debounce timer
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                saveNow();
            }, delay);
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [data, disabled, delay, saveNow]);

    // ✅ Reset first render flag when disabled changes (e.g., mode switches)
    useEffect(() => {
        if (disabled) {
            isFirstRenderRef.current = true;
        }
    }, [disabled]);

    // ✅ حفظ عند مغادرة الصفحة
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'لديك تغييرات غير محفوظة. هل تريد المغادرة؟';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // ✅ تنظيف عند unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return {
        isSaving,
        lastSavedAt,
        saveNow,
        hasUnsavedChanges,
    };
}

export default useAutoSave;
