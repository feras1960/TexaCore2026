/**
 * ════════════════════════════════════════════════════════════════
 * 🏭 WarehouseDetailSheet v3
 * ════════════════════════════════════════════════════════════════
 * Phase 1 fixes:
 *  - Sheet width: 55vw (half screen)
 *  - Material info via getRolls-compatible join
 *  - Color + Material filters in "Add" tab
 *  - Material column in Rolls table
 *  - Overview stats from real existingRolls data
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { warehouseService } from '@/services/warehouseService';
import { toast } from 'sonner';
import {
    Layers, Package, RefreshCw, Loader2,
    Rows, Columns, Square, BarChart3,
    Ruler, Palette, Hash, ArrowLeft, ArrowRight,
    Plus, Search, CheckCircle2, X, MoveRight, Tag,
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified';


// ─── Types ─────────────────────────────────────────────────────

export interface BinLocationRef {
    id: string;
    code: string;
    row_code?: string;
    column_code?: string;
    shelf_code?: string;
    capacity_rolls?: number;
    current_rolls_count?: number;
    name_ar?: string;
}

export type SelectionType = 'cell' | 'row' | 'col';

export interface BinSelection {
    type: SelectionType;
    row?: string;
    col?: string;
    bins: BinLocationRef[];
    warehouseName?: string;
    warehouseId?: string;
}

interface RollRecord {
    id: string;
    roll_number: string;
    barcode?: string;
    initial_length: number;
    current_length: number;
    width?: number;
    color?: string;
    color_id?: string;
    material_id?: string;
    material_name?: string;    // من جدول materials
    status: string;
    bin_location_id?: string | null;
    bin_location_code?: string;
    created_at?: string;
}

interface WarehouseDetailSheetProps {
    isOpen: boolean;
    onClose: () => void;
    selection: BinSelection | null;
    companyId: string;
    tenantId?: string;
    onOpenRoll?: (rollId: string, rollNumber: string) => void;
    onRollsAssigned?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────

function statusBadge(status: string) {
    const map: Record<string, { label: string; cls: string }> = {
        available: { label: 'متاح', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
        reserved: { label: 'محجوز', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
        in_use: { label: 'مستخدم', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
        partial: { label: 'جزئي', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
        damaged: { label: 'تالف', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
        sold: { label: 'مباع', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    };
    const m = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
    return <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', m.cls)}>{m.label}</span>;
}

function OccupancyBar({ used, total }: { used: number; total: number | null }) {
    const pct = total ? Math.min((used / total) * 100, 100) : null;
    const color = !pct ? 'bg-gray-300'
        : pct < 50 ? 'bg-emerald-500'
            : pct < 80 ? 'bg-amber-500'
                : pct < 100 ? 'bg-orange-500'
                    : 'bg-red-500';
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{used} / {total ?? '∞'}</span>
                <span className="text-gray-400">{pct !== null ? `${Math.round(pct)}%` : '—'}</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct ?? 0}%` }} />
            </div>
        </div>
    );
}

// ─── Fetch helper: map raw row to RollRecord ──────────────────────
function mapRollRow(r: any): RollRecord {
    return {
        id: r.id,
        roll_number: r.roll_number,
        barcode: r.barcode,
        initial_length: Number(r.initial_length) || 0,
        current_length: Number(r.current_length) || 0,
        width: r.width ? Number(r.width) : undefined,
        color: r.color?.name_ar || r.color?.name_en || undefined,
        color_id: r.color_id,
        material_id: r.material_id,
        // Try both join aliases (material: via FK, or flat field)
        material_name: r.material?.name_ar || r.material?.name_en || undefined,
        status: r.status || 'available',
        bin_location_id: r.bin_location_id,
        bin_location_code: r.bin_location?.code || undefined,
        created_at: r.created_at,
    };
}

// ─── Filter chip component ────────────────────────────────────────
function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all whitespace-nowrap',
                active
                    ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300',
            )}
        >
            {label}
        </button>
    );
}

// ─── ExistingRollRow ─────────────────────────────────────────────
function ExistingRollRow({ roll, onOpen, isRTL, showLocation }: {
    roll: RollRecord; onOpen: () => void; isRTL: boolean; showLocation?: boolean;
}) {
    const Arrow = isRTL ? ArrowLeft : ArrowRight;
    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors" onClick={onOpen}>
            <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                    <Hash className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline truncate max-w-[120px]">
                        {roll.roll_number}
                    </span>
                </div>
            </td>
            {showLocation && (
                <td className="px-3 py-2 text-center">
                    <span className="font-mono text-[11px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
                        {roll.bin_location_code || '—'}
                    </span>
                </td>
            )}
            <td className="px-3 py-2">
                <span className="text-xs text-gray-700 dark:text-gray-300">
                    {roll.material_name
                        ? <span className="font-medium">{roll.material_name}</span>
                        : <span className="text-gray-400 text-[10px]">—</span>}
                </span>
            </td>
            <td className="px-3 py-2 text-center">
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {roll.current_length?.toFixed(1)} م
                </span>
            </td>
            <td className="px-3 py-2 text-center">
                {roll.color
                    ? <span className="text-xs flex items-center justify-center gap-1">
                        <Palette className="w-3 h-3 text-gray-400" />{roll.color}
                    </span>
                    : <span className="text-gray-300 text-[10px]">—</span>}
            </td>
            <td className="px-3 py-2 text-center">{statusBadge(roll.status)}</td>
            <td className="px-3 py-2 text-end">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400">
                    <Arrow className="w-3.5 h-3.5" />
                </span>
            </td>
        </tr>
    );
}

// ─── UnassignedRollCard ──────────────────────────────────────────
function UnassignedRollCard({ roll, selected, onToggle }: {
    roll: RollRecord; selected: boolean; onToggle: () => void;
}) {
    return (
        <button
            onClick={onToggle}
            className={cn(
                'w-full text-start p-3 rounded-xl border-2 transition-all',
                selected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800/50',
            )}
        >
            <div className="flex items-start gap-2.5">
                {/* Checkbox circle */}
                <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors',
                    selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600',
                )}>
                    {selected && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-xs text-gray-900 dark:text-white truncate">
                            {roll.roll_number}
                        </span>
                        {statusBadge(roll.status)}
                    </div>
                    {/* Material */}
                    {roll.material_name && (
                        <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate">{roll.material_name}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                            {roll.current_length?.toFixed(1)} م
                        </span>
                        {roll.color && (
                            <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
                                <Palette className="w-2.5 h-2.5" />{roll.color}
                            </span>
                        )}
                        {roll.width && (
                            <span className="text-[11px] text-gray-400">عرض: {roll.width} م</span>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}

// ─── Main component ──────────────────────────────────────────────
export function WarehouseDetailSheet({
    isOpen, onClose, selection, companyId, onOpenRoll, onRollsAssigned,
}: WarehouseDetailSheetProps) {
    const { isRTL, language } = useLanguage();
    // ═══ Multi-language T() function ═══
    const WH_LABELS: Record<string, Record<string, string>> = {
        'Row': { ru: 'Ряд', uk: 'Ряд', tr: 'Satır', de: 'Reihe', it: 'Riga', ro: 'Rând', pl: 'Rząd' },
        'Column': { ru: 'Столбец', uk: 'Стовпець', tr: 'Sütun', de: 'Spalte', it: 'Colonna', ro: 'Coloană', pl: 'Kolumna' },
        'bins': { ru: 'ячеек', uk: 'комірок', tr: 'bölme', de: 'Fächer', it: 'contenitori', ro: 'compartimente', pl: 'pojemników' },
        'Refresh': { ru: 'Обновить', uk: 'Оновити', tr: 'Yenile', de: 'Aktualisieren', it: 'Aggiorna', ro: 'Reîmprospătare', pl: 'Odśwież' },
        'Cell': { ru: 'Ячейка', uk: 'Комірка', tr: 'Hücre', de: 'Zelle', it: 'Cella', ro: 'Celulă', pl: 'Komórka' },
        'rolls': { ru: 'рулонов', uk: 'рулонів', tr: 'rulo', de: 'Rollen', it: 'rotoli', ro: 'role', pl: 'rolek' },
        'unassigned': { ru: 'не назначено', uk: 'не призначено', tr: 'atanmamış', de: 'nicht zugewiesen', it: 'non assegnati', ro: 'neatribuite', pl: 'nieprzypisanych' },
        '📊 Overview': { ru: '📊 Обзор', uk: '📊 Огляд', tr: '📊 Genel Bakış', de: '📊 Übersicht', it: '📊 Panoramica', ro: '📊 Prezentare', pl: '📊 Przegląd' },
        'Rolls here': { ru: 'Рулонов здесь', uk: 'Рулонів тут', tr: 'Buradaki rulolar', de: 'Rollen hier', it: 'Rotoli qui', ro: 'Role aici', pl: 'Rolek tutaj' },
        'Total Length': { ru: 'Общая длина', uk: 'Загальна довжина', tr: 'Toplam Uzunluk', de: 'Gesamtlänge', it: 'Lunghezza totale', ro: 'Lungime totală', pl: 'Łączna długość' },
        'Capacity Used': { ru: 'Занятость', uk: 'Заповненість', tr: 'Kapasite', de: 'Kapazität', it: 'Capacità usata', ro: 'Capacitate', pl: 'Pojemność' },
        'Bin Occupancy': { ru: 'Заполненность ячеек', uk: 'Заповненість комірок', tr: 'Bölme Doluluk', de: 'Fachbelegung', it: 'Occupazione', ro: 'Ocupare', pl: 'Obłożenie' },
        'Click to view': { ru: 'Нажмите для просмотра', uk: 'Натисніть для перегляду', tr: 'Görüntülemek için tıklayın', de: 'Zum Anzeigen klicken', it: 'Clicca per vedere', ro: 'Clic pentru vizualizare', pl: 'Kliknij aby zobaczyć' },
        'Add rolls to this location': { ru: 'Добавить рулоны в это место', uk: 'Додати рулони в це місце', tr: 'Bu konuma rulo ekle', de: 'Rollen hier hinzufügen', it: 'Aggiungi rotoli qui', ro: 'Adaugă role aici', pl: 'Dodaj rolki tutaj' },
        'Add': { ru: 'Добавить', uk: 'Додати', tr: 'Ekle', de: 'Hinzufügen', it: 'Aggiungi', ro: 'Adaugă', pl: 'Dodaj' },
        'All': { ru: 'Все', uk: 'Всі', tr: 'Tümü', de: 'Alle', it: 'Tutti', ro: 'Toate', pl: 'Wszystkie' },
        'Roll #': { ru: 'Рулон №', uk: 'Рулон №', tr: 'Rulo #', de: 'Rolle #', it: 'Rotolo #', ro: 'Rolă #', pl: 'Rolka #' },
        'Bin': { ru: 'Ячейка', uk: 'Комірка', tr: 'Bölme', de: 'Fach', it: 'Contenitore', ro: 'Compartiment', pl: 'Pojemnik' },
        'Material': { ru: 'Материал', uk: 'Матеріал', tr: 'Malzeme', de: 'Material', it: 'Materiale', ro: 'Material', pl: 'Materiał' },
        'Length': { ru: 'Длина', uk: 'Довжина', tr: 'Uzunluk', de: 'Länge', it: 'Lunghezza', ro: 'Lungime', pl: 'Długość' },
        'Color': { ru: 'Цвет', uk: 'Колір', tr: 'Renk', de: 'Farbe', it: 'Colore', ro: 'Culoare', pl: 'Kolor' },
        'Status': { ru: 'Статус', uk: 'Статус', tr: 'Durum', de: 'Status', it: 'Stato', ro: 'Stare', pl: 'Status' },
        'No rolls in this location': { ru: 'Нет рулонов в этом месте', uk: 'Немає рулонів у цьому місці', tr: 'Bu konumda rulo yok', de: 'Keine Rollen an diesem Ort', it: 'Nessun rotolo in questa posizione', ro: 'Nicio rolă în această locație', pl: 'Brak rolek w tej lokalizacji' },
        'Add a roll now': { ru: 'Добавить рулон', uk: 'Додати рулон', tr: 'Şimdi rulo ekle', de: 'Jetzt Rolle hinzufügen', it: 'Aggiungi un rotolo', ro: 'Adaugă o rolă', pl: 'Dodaj rolkę teraz' },
        'No rolls in this bin': { ru: 'Нет рулонов в этой ячейке', uk: 'Немає рулонів у цій комірці', tr: 'Bu bölmede rulo yok', de: 'Keine Rollen in diesem Fach', it: 'Nessun rotolo in questo contenitore', ro: 'Nicio rolă în acest compartiment', pl: 'Brak rolek w tym pojemniku' },
        'Show all': { ru: 'Показать все', uk: 'Показати все', tr: 'Tümünü göster', de: 'Alle anzeigen', it: 'Mostra tutti', ro: 'Arată toate', pl: 'Pokaż wszystkie' },
        '📍 Target Bin': { ru: '📍 Целевая ячейка', uk: '📍 Цільова комірка', tr: '📍 Hedef Bölme', de: '📍 Zielfach', it: '📍 Contenitore destinazione', ro: '📍 Compartiment țintă', pl: '📍 Pojemnik docelowy' },
        'Color Filter': { ru: 'Фильтр по цвету', uk: 'Фільтр кольору', tr: 'Renk Filtresi', de: 'Farbfilter', it: 'Filtro colore', ro: 'Filtru culoare', pl: 'Filtr kolorów' },
        'Material Filter': { ru: 'Фильтр по материалу', uk: 'Фільтр матеріалу', tr: 'Malzeme Filtresi', de: 'Materialfilter', it: 'Filtro materiale', ro: 'Filtru material', pl: 'Filtr materiału' },
        'selected': { ru: 'выбрано', uk: 'вибрано', tr: 'seçili', de: 'ausgewählt', it: 'selezionati', ro: 'selectate', pl: 'zaznaczonych' },
        'Select all': { ru: 'Выбрать все', uk: 'Вибрати все', tr: 'Tümünü seç', de: 'Alle auswählen', it: 'Seleziona tutti', ro: 'Selectează tot', pl: 'Zaznacz wszystko' },
        'Clear': { ru: 'Сбросить', uk: 'Скинути', tr: 'Temizle', de: 'Löschen', it: 'Cancella', ro: 'Șterge', pl: 'Wyczyść' },
        'No unassigned rolls in this warehouse': { ru: 'Нет неназначенных рулонов на этом складе', uk: 'Немає непризначених рулонів на цьому складі', tr: 'Bu depoda atanmamış rulo yok', de: 'Keine nicht zugewiesenen Rollen in diesem Lager', it: 'Nessun rotolo non assegnato in questo magazzino', ro: 'Nicio rolă neatribuită', pl: 'Brak nieprzypisanych rolek' },
        'No results for selected filter': { ru: 'Нет результатов для выбранного фильтра', uk: 'Немає результатів для обраного фільтра', tr: 'Seçili filtre için sonuç yok', de: 'Keine Ergebnisse für gewählten Filter', it: 'Nessun risultato per il filtro selezionato', ro: 'Niciun rezultat pentru filtrul selectat', pl: 'Brak wyników dla wybranego filtru' },
        'Clear filters': { ru: 'Сбросить фильтры', uk: 'Скинути фільтри', tr: 'Filtreleri temizle', de: 'Filter löschen', it: 'Cancella filtri', ro: 'Șterge filtre', pl: 'Wyczyść filtry' },
        'Vertical Shelves': { ru: 'Вертикальные полки', uk: 'Вертикальні полиці', tr: 'Dikey Raflar', de: 'Vertikale Regale', it: 'Scaffali verticali', ro: 'Rafturi verticale', pl: 'Półki pionowe' },
        'Top': { ru: 'Верх', uk: 'Верх', tr: 'Üst', de: 'Oben', it: 'Alto', ro: 'Sus', pl: 'Góra' },
        'Bottom': { ru: 'Низ', uk: 'Низ', tr: 'Alt', de: 'Unten', it: 'Basso', ro: 'Jos', pl: 'Dół' },
        'Failed to load roll': { ru: 'Не удалось загрузить рулон', uk: 'Не вдалося завантажити рулон', tr: 'Rulo yüklenemedi', de: 'Rolle konnte nicht geladen werden', it: 'Impossibile caricare il rotolo', ro: 'Încărcarea rolei a eșuat', pl: 'Nie udało się wczytać rolki' },
        'Assignment failed': { ru: 'Ошибка назначения', uk: 'Помилка призначення', tr: 'Atama başarısız', de: 'Zuweisung fehlgeschlagen', it: 'Assegnazione fallita', ro: 'Atribuirea a eșuat', pl: 'Przypisanie nie powiodło się' },
        'Search by roll#, material, color...': { ru: 'Поиск по номеру, материалу, цвету...', uk: 'Пошук за номером, матеріалом, кольором...', tr: 'Rulo no, malzeme, renk ile ara...', de: 'Suche nach Rolle#, Material, Farbe...', it: 'Cerca per rotolo#, materiale, colore...', ro: 'Caută după rolă#, material, culoare...', pl: 'Szukaj wg nr rolki, materiału, koloru...' },
    };
    const T = (ar: string, en: string): string => {
        if (language === 'ar') return ar;
        if (language === 'en') return en;
        const trans = WH_LABELS[en];
        if (trans && trans[language]) return trans[language];
        return en;
    };

    type Tab = 'overview' | 'rolls' | 'add' | 'bins';
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    // ─── EXISTING ROLLS ─────────────────────────────────────────
    const [existingRolls, setExistingRolls] = useState<RollRecord[]>([]);
    const [loadingExisting, setLoadingExisting] = useState(false);

    // ─── UNASSIGNED ROLLS ───────────────────────────────────────
    const [unassignedRolls, setUnassignedRolls] = useState<RollRecord[]>([]);
    const [loadingUnassigned, setLoadingUnassigned] = useState(false);
    const [selectedRollIds, setSelectedRollIds] = useState<Set<string>>(new Set());
    const [searchUnassigned, setSearchUnassigned] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [targetBinId, setTargetBinId] = useState<string>('');

    // ─── FILTERS for Add tab ─────────────────────────────────────
    const [filterColor, setFilterColor] = useState<string | null>(null);
    const [filterMaterial, setFilterMaterial] = useState<string | null>(null);

    // ─── FILTER for Rolls tab: by bin ────────────────────────────
    const [filterBinId, setFilterBinId] = useState<string | null>(null);

    // ─── ROLL SHEET (UnifiedAccountingSheet docType='roll') ──────
    const [rollSheetOpen, setRollSheetOpen] = useState(false);
    const [rollSheetData, setRollSheetData] = useState<any>(null);
    const [rollSheetLoading, setRollSheetLoading] = useState(false);

    const openRollSheet = useCallback(async (rollId: string) => {
        setRollSheetLoading(true);
        try {
            const { data: fullRoll, error } = await supabase
                .from('fabric_rolls')
                .select(`
                    *,
                    warehouse:warehouses!left(id, name_ar, name_en, code),
                    color:fabric_colors!left(id, name_ar, name_en, hex_code),
                    bin_location:bin_locations!left(id, code, name_ar)
                `)
                .eq('id', rollId)
                .single();
            if (error || !fullRoll) {
                toast.error(T('فشل جلب بيانات الرولون', 'Failed to load roll'));
                return;
            }
            setRollSheetData({
                ...fullRoll,
                warehouse_name_ar: fullRoll.warehouse?.name_ar,
                warehouse_name_en: fullRoll.warehouse?.name_en,
                bin_location_code: fullRoll.bin_location?.code,
            });
            setRollSheetOpen(true);
        } finally {
            setRollSheetLoading(false);
        }
    }, []);


    // Rolls tab filtered by bin
    const displayedRolls = useMemo(() => {
        if (!filterBinId) return existingRolls;
        return existingRolls.filter(r => r.bin_location_id === filterBinId);
    }, [existingRolls, filterBinId]);

    // Show location column whenever there are multiple bins
    const showBinColumn = (selection?.bins.length ?? 0) > 1;

    // ─── Stats (from real existingRolls data) ───────────────────
    const stats = useMemo(() => {
        if (!selection) return { totalCapacity: 0, usedRolls: 0, binCount: 0, totalLength: 0 };
        const totalCapacity = selection.bins.reduce((s, b) => s + (b.capacity_rolls || 0), 0);
        // Use real loaded count, not stale current_rolls_count from initial map load
        const usedRolls = loadingExisting
            ? selection.bins.reduce((s, b) => s + (b.current_rolls_count || 0), 0)
            : existingRolls.length;
        const totalLength = existingRolls.reduce((s, r) => s + (r.current_length || 0), 0);
        return { totalCapacity, usedRolls, binCount: selection.bins.length, totalLength };
    }, [selection, existingRolls, loadingExisting]);


    // ─── Helper: fetch material names by IDs (separate query — no FK join needed) ─
    const fetchMaterialNames = useCallback(async (materialIds: string[]): Promise<Map<string, string>> => {
        if (materialIds.length === 0) return new Map();
        const { data } = await supabase
            .from('materials')
            .select('id, name_ar, name_en')
            .in('id', materialIds);
        const map = new Map<string, string>();
        (data || []).forEach((m: any) => {
            map.set(m.id, m.name_ar || m.name_en || '—');
        });
        return map;
    }, []);

    // ─── Shared roll select (no material join — fetched separately) ─
    const ROLL_SELECT = `
        id, roll_number, barcode, initial_length, current_length,
        width, color_id, status, bin_location_id, created_at, material_id,
        bin_location:bin_locations!left(id, code),
        color:fabric_colors!left(id, name_ar, name_en)
    `;

    // ─── Load existing rolls in the selected bin(s) ─────────────
    const loadExistingRolls = useCallback(async () => {
        if (!selection || selection.bins.length === 0) return;
        setLoadingExisting(true);
        try {
            const binIds = selection.bins.map(b => b.id);
            const { data, error } = await supabase
                .from('fabric_rolls')
                .select(ROLL_SELECT)
                .in('bin_location_id', binIds)
                .eq('company_id', companyId)
                .not('status', 'in', '(consumed,sold)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            const rows = (data || []).map(mapRollRow);
            // Enrich with material names
            const matIds = [...new Set(rows.filter(r => r.material_id).map(r => r.material_id!))];
            const matMap = await fetchMaterialNames(matIds);
            setExistingRolls(rows.map(r => ({
                ...r,
                material_name: r.material_id ? matMap.get(r.material_id) : undefined,
            })));
        } catch (e: any) {
            console.error('loadExistingRolls:', e?.message ?? e);
            setExistingRolls([]);
        } finally {
            setLoadingExisting(false);
        }
    }, [selection, companyId, fetchMaterialNames]);

    // ─── Load unassigned rolls in same warehouse ─────────────────
    const loadUnassignedRolls = useCallback(async () => {
        if (!selection?.warehouseId) return;
        setLoadingUnassigned(true);
        try {
            const { data, error } = await supabase
                .from('fabric_rolls')
                .select(ROLL_SELECT)
                .eq('company_id', companyId)
                .eq('warehouse_id', selection.warehouseId)
                .is('bin_location_id', null)
                .not('status', 'in', '(consumed,sold)')
                .order('created_at', { ascending: false })
                .limit(300);
            if (error) throw error;
            const rows = (data || []).map(mapRollRow);
            // Enrich with material names
            const matIds = [...new Set(rows.filter(r => r.material_id).map(r => r.material_id!))];
            const matMap = await fetchMaterialNames(matIds);
            setUnassignedRolls(rows.map(r => ({
                ...r,
                material_name: r.material_id ? matMap.get(r.material_id) : undefined,
            })));
        } catch (e: any) {
            console.error('loadUnassignedRolls:', e?.message ?? e);
            setUnassignedRolls([]);
        } finally {
            setLoadingUnassigned(false);
        }
    }, [selection, companyId, fetchMaterialNames]);

    // ─── Reset on open ───────────────────────────────────────────
    useEffect(() => {
        if (isOpen && selection) {
            setActiveTab('overview');
            setSelectedRollIds(new Set());
            setSearchUnassigned('');
            setFilterColor(null);
            setFilterMaterial(null);
            setFilterBinId(null);
            if (selection.bins.length > 0) setTargetBinId(selection.bins[0].id);
            loadExistingRolls();
        }
    }, [isOpen, selection, loadExistingRolls]);

    useEffect(() => {
        if (activeTab === 'add' && selection) loadUnassignedRolls();
    }, [activeTab, loadUnassignedRolls]);

    // ─── Unique colors & materials for filter chips ───────────────
    const uniqueColors = useMemo(() => {
        const seen = new Set<string>();
        return unassignedRolls
            .filter(r => r.color && !seen.has(r.color) && seen.add(r.color))
            .map(r => r.color!);
    }, [unassignedRolls]);

    const uniqueMaterials = useMemo(() => {
        const seen = new Map<string, string>(); // id → name
        unassignedRolls.forEach(r => {
            if (r.material_id && r.material_name && !seen.has(r.material_id)) {
                seen.set(r.material_id, r.material_name);
            }
        });
        return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
    }, [unassignedRolls]);

    // ─── Filtered rolls (search + chips) ─────────────────────────
    const filteredUnassigned = useMemo(() => {
        let list = unassignedRolls;
        if (filterColor) list = list.filter(r => r.color === filterColor);
        if (filterMaterial) list = list.filter(r => r.material_id === filterMaterial);
        if (searchUnassigned.trim()) {
            const q = searchUnassigned.toLowerCase();
            list = list.filter(r =>
                r.roll_number.toLowerCase().includes(q) ||
                (r.color || '').toLowerCase().includes(q) ||
                (r.material_name || '').toLowerCase().includes(q) ||
                (r.barcode || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [unassignedRolls, filterColor, filterMaterial, searchUnassigned]);

    const toggleRoll = useCallback((id: string) => {
        setSelectedRollIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);
    const selectAll = useCallback(() => setSelectedRollIds(new Set(filteredUnassigned.map(r => r.id))), [filteredUnassigned]);
    const clearAll = useCallback(() => setSelectedRollIds(new Set()), []);

    // ─── Assign ──────────────────────────────────────────────────
    const handleAssign = useCallback(async () => {
        if (selectedRollIds.size === 0 || !targetBinId) return;
        setAssigning(true);
        try {
            const rollIds = Array.from(selectedRollIds);
            const result = await warehouseService.bulkAssignRollsToBin(rollIds, targetBinId);
            if (result.success > 0) {
                toast.success(T(`تم نقل ${result.success} رولون بنجاح ✅`, `${result.success} rolls assigned ✅`));
                setSelectedRollIds(new Set());
                await Promise.all([loadExistingRolls(), loadUnassignedRolls()]);
                onRollsAssigned?.();
                setActiveTab('rolls');
            }
            if (result.failed > 0) toast.error(T(`فشل نقل ${result.failed} رولون`, `${result.failed} rolls failed`));
        } catch {
            toast.error(T('فشل في التعيين', 'Assignment failed'));
        } finally {
            setAssigning(false);
        }
    }, [selectedRollIds, targetBinId, loadExistingRolls, loadUnassignedRolls, onRollsAssigned, T]);

    // ─── Title ───────────────────────────────────────────────────
    const title = useMemo(() => {
        if (!selection) return '';
        if (selection.type === 'cell') return `📍 ${selection.row}-${selection.col}`;
        if (selection.type === 'row') return `📍 ${T('صف', 'Row')} ${selection.row}`;
        return `📍 ${T('عمود', 'Column')} ${selection.col}`;
    }, [selection, isRTL]);

    const tabs: { id: Tab; label: string }[] = [
        { id: 'overview', label: T('📊 نظرة عامة', '📊 Overview') },
        { id: 'rolls', label: T(`🧶 الرولونات (${existingRolls.length})`, `🧶 Rolls (${existingRolls.length})`) },
        { id: 'add', label: T('➕ إضافة رولون', '➕ Add Roll') },
        ...(selection?.type === 'cell' ? [{ id: 'bins' as Tab, label: T('🗂️ الطوابق', '🗂️ Shelves') }] : []),
    ];

    if (!selection) return null;

    return (
        <>
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent
                    side={isRTL ? 'left' : 'right'}
                    // ✅ Half screen: min 500px, max 55vw
                    className="w-full sm:w-[55vw] sm:max-w-[55vw] p-0 flex flex-col gap-0"
                    dir={isRTL ? 'rtl' : 'ltr'}
                >
                    {/* ─── Header ─── */}
                    <SheetHeader className="flex-shrink-0 px-5 pt-5 pb-3 border-b bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-gray-900">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                                    {selection.type === 'cell' && <Square className="w-5 h-5 text-blue-600" />}
                                    {selection.type === 'row' && <Rows className="w-5 h-5 text-blue-600" />}
                                    {selection.type === 'col' && <Columns className="w-5 h-5 text-blue-600" />}
                                </div>
                                <div>
                                    <SheetTitle className="text-base font-black font-mono text-gray-900 dark:text-white">
                                        {title}
                                    </SheetTitle>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {selection.warehouseName && `${selection.warehouseName} • `}
                                        {stats.binCount} {T('خانة', 'bins')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { loadExistingRolls(); if (activeTab === 'add') loadUnassignedRolls(); }}
                                className="p-2 rounded-lg hover:bg-white/70 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                                title={T('تحديث', 'Refresh')}
                            >
                                <RefreshCw className={cn('w-4 h-4', (loadingExisting || loadingUnassigned) && 'animate-spin')} />
                            </button>
                        </div>
                        <div className="mt-3">
                            <OccupancyBar used={stats.usedRolls} total={stats.totalCapacity || null} />
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-mono">
                                {selection.type === 'cell' ? T('خلية', 'Cell') :
                                    selection.type === 'row' ? T('صف', 'Row') : T('عمود', 'Column')}
                            </Badge>
                            <Badge className="bg-blue-600 text-white text-[10px]">
                                {loadingExisting ? '...' : `${existingRolls.length} ${T('رولون', 'rolls')}`}
                            </Badge>
                            {activeTab === 'add' && unassignedRolls.length > 0 && (
                                <Badge className="bg-amber-500 text-white text-[10px]">
                                    {unassignedRolls.length} {T('غير مُعيَّن', 'unassigned')}
                                </Badge>
                            )}
                        </div>
                    </SheetHeader>

                    {/* ─── Tab Bar ─── */}
                    <div className="flex-shrink-0 border-b px-5 bg-white dark:bg-gray-900">
                        <div className="flex gap-0 -mb-px overflow-x-auto">
                            {tabs.map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ─── Content ─── */}
                    <ScrollArea className="flex-1">
                        <div className="p-5">

                            {/* ══ OVERVIEW ══ */}
                            {activeTab === 'overview' && (
                                <div className="space-y-4">
                                    {/* Stat cards — from REAL existingRolls data */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { icon: Package, bg: 'bg-blue-100 dark:bg-blue-900/30', tc: 'text-blue-600', v: existingRolls.length, l: T('رولون في الموقع', 'Rolls here') },
                                            { icon: Ruler, bg: 'bg-emerald-100 dark:bg-emerald-900/30', tc: 'text-emerald-600', v: `${stats.totalLength.toFixed(1)} م`, l: T('إجمالي الطول', 'Total Length') },
                                            { icon: BarChart3, bg: 'bg-purple-100 dark:bg-purple-900/30', tc: 'text-purple-600', v: `${stats.usedRolls} / ${stats.totalCapacity || '∞'}`, l: T('الطاقة', 'Capacity Used') },
                                        ].map(item => (
                                            <div key={item.l} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                                                <div className={cn('w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center', item.bg)}>
                                                    <item.icon className={cn('w-4 h-4', item.tc)} />
                                                </div>
                                                <p className="text-sm font-black text-gray-900 dark:text-gray-100">{item.v}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{item.l}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Bin occupancy list - clickable → filter rolls */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                {T('إشغال الخانات', 'Bin Occupancy')}
                                            </p>
                                            <span className="text-[10px] text-gray-400">
                                                {T('اضغط للعرض', 'Click to view')}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {selection.bins.map(bin => {
                                                const realCount = existingRolls.filter(r => r.bin_location_id === bin.id).length;
                                                const displayCount = loadingExisting ? bin.current_rolls_count || 0 : realCount;
                                                const pct = bin.capacity_rolls
                                                    ? Math.min((displayCount / bin.capacity_rolls) * 100, 100)
                                                    : null;
                                                const c = !pct ? 'bg-gray-300' : pct < 50 ? 'bg-emerald-500' : pct < 80 ? 'bg-amber-500' : pct < 100 ? 'bg-orange-500' : 'bg-red-500';
                                                return (
                                                    <button
                                                        key={bin.id}
                                                        onClick={() => {
                                                            setFilterBinId(bin.id);
                                                            setActiveTab('rolls');
                                                        }}
                                                        className="w-full flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group text-start"
                                                    >
                                                        <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300 w-28 flex-shrink-0 group-hover:text-blue-600">{bin.code}</span>
                                                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div className={cn('h-full rounded-full', c)} style={{ width: `${pct ?? 0}%` }} />
                                                        </div>
                                                        <span className="text-xs font-mono text-gray-500 w-16 text-end flex-shrink-0">
                                                            {displayCount}/{bin.capacity_rolls ?? '∞'}
                                                            {displayCount > 0 && <Package className="w-3 h-3 inline ms-1 text-blue-400 opacity-0 group-hover:opacity-100" />}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setActiveTab('add')}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {T('إضافة رولونات لهذا الموقع', 'Add rolls to this location')}
                                    </button>
                                </div>
                            )}

                            {/* ══ EXISTING ROLLS ══ */}
                            {activeTab === 'rolls' && (
                                <div>
                                    {/* Top row: Add button + bin filter */}
                                    <div className="flex items-center justify-between mb-3 gap-2">
                                        <button
                                            onClick={() => setActiveTab('add')}
                                            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-200 dark:border-blue-700 flex-shrink-0"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            {T('إضافة', 'Add')}
                                        </button>
                                        {/* ✅ Bin filter chips — show when multiple bins */}
                                        {showBinColumn && (
                                            <div className="flex gap-1.5 overflow-x-auto flex-1">
                                                <FilterChip
                                                    label={T('الكل', 'All')}
                                                    active={!filterBinId}
                                                    onClick={() => setFilterBinId(null)}
                                                />
                                                {selection.bins.map(bin => {
                                                    const cnt = existingRolls.filter(r => r.bin_location_id === bin.id).length;
                                                    return (
                                                        <FilterChip
                                                            key={bin.id}
                                                            label={`${bin.code} (${cnt})`}
                                                            active={filterBinId === bin.id}
                                                            onClick={() => setFilterBinId(filterBinId === bin.id ? null : bin.id)}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {loadingExisting ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                                        </div>
                                    ) : existingRolls.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                            <Package className="w-10 h-10 mb-2 opacity-30" />
                                            <p className="text-sm mb-2">{T('لا توجد رولونات في هذا الموقع', 'No rolls in this location')}</p>
                                            <button onClick={() => setActiveTab('add')} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                                <Plus className="w-3 h-3" /> {T('أضف رولوناً الآن', 'Add a roll now')}
                                            </button>
                                        </div>
                                    ) : displayedRolls.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                            <Package className="w-8 h-8 mb-2 opacity-30" />
                                            <p className="text-sm">{T('لا توجد رولونات في هذه الخانة', 'No rolls in this bin')}</p>
                                            <button onClick={() => setFilterBinId(null)} className="mt-1 text-xs text-blue-500 hover:underline">
                                                {T('عرض الكل', 'Show all')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                                                        {[
                                                            T('رقم الرولون', 'Roll #'),
                                                            ...(showBinColumn ? [T('الخانة', 'Bin')] : []),
                                                            T('المادة', 'Material'),
                                                            T('الطول', 'Length'),
                                                            T('اللون', 'Color'),
                                                            T('الحالة', 'Status'),
                                                            '',
                                                        ].map((h, i) => (
                                                            <th key={i} className={cn('px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap',
                                                                i === 0 ? 'text-start' : 'text-center')}>
                                                                {h}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                                    {displayedRolls.map(roll => (
                                                        <ExistingRollRow
                                                            key={roll.id} roll={roll} isRTL={isRTL}
                                                            showLocation={showBinColumn}
                                                            onOpen={() => openRollSheet(roll.id)}
                                                        />
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ══ ADD ROLLS ══ */}
                            {activeTab === 'add' && (
                                <div className="space-y-3">
                                    {/* Target bin selector */}
                                    {selection.bins.length > 1 && (
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 mb-2">
                                                {T('📍 اختر الخانة المستهدفة', '📍 Target Bin')}
                                            </p>
                                            <div className="flex gap-2 flex-wrap">
                                                {selection.bins.map(bin => (
                                                    <button key={bin.id} onClick={() => setTargetBinId(bin.id)}
                                                        className={cn(
                                                            'px-3 py-1.5 rounded-lg border-2 font-mono text-xs font-bold transition-colors',
                                                            targetBinId === bin.id
                                                                ? 'border-blue-500 bg-blue-500 text-white'
                                                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                                                        )}
                                                    >
                                                        {bin.code}
                                                        {bin.capacity_rolls && (
                                                            <span className="ms-1 opacity-70 font-normal text-[10px]">
                                                                {bin.current_rolls_count || 0}/{bin.capacity_rolls}
                                                            </span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Search */}
                                    <div className="relative">
                                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            value={searchUnassigned}
                                            onChange={e => setSearchUnassigned(e.target.value)}
                                            placeholder={T('بحث برقم الرولون، المادة، اللون...', 'Search by roll#, material, color...')}
                                            className="ps-9 h-9 text-sm"
                                        />
                                        {searchUnassigned && (
                                            <button onClick={() => setSearchUnassigned('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* ✅ Color filter chips */}
                                    {uniqueColors.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                <Palette className="w-3 h-3" /> {T('فلتر اللون', 'Color Filter')}
                                            </p>
                                            <div className="flex gap-1.5 flex-wrap">
                                                <FilterChip label={T('الكل', 'All')} active={!filterColor} onClick={() => setFilterColor(null)} />
                                                {uniqueColors.map(c => (
                                                    <FilterChip key={c} label={c} active={filterColor === c} onClick={() => setFilterColor(filterColor === c ? null : c)} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ✅ Material filter chips */}
                                    {uniqueMaterials.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                <Tag className="w-3 h-3" /> {T('فلتر المادة', 'Material Filter')}
                                            </p>
                                            <div className="flex gap-1.5 flex-wrap">
                                                <FilterChip label={T('الكل', 'All')} active={!filterMaterial} onClick={() => setFilterMaterial(null)} />
                                                {uniqueMaterials.map(m => (
                                                    <FilterChip key={m.id} label={m.name} active={filterMaterial === m.id} onClick={() => setFilterMaterial(filterMaterial === m.id ? null : m.id)} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Select all / clear */}
                                    {!loadingUnassigned && filteredUnassigned.length > 0 && (
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>
                                                {filteredUnassigned.length} {T('رولون', 'rolls')}
                                                {selectedRollIds.size > 0 && (
                                                    <span className="ms-2 font-bold text-blue-600">
                                                        ({selectedRollIds.size} {T('محدد', 'selected')})
                                                    </span>
                                                )}
                                            </span>
                                            <div className="flex gap-2">
                                                {selectedRollIds.size < filteredUnassigned.length && (
                                                    <button onClick={selectAll} className="text-blue-500 hover:underline">{T('تحديد الكل', 'Select all')}</button>
                                                )}
                                                {selectedRollIds.size > 0 && (
                                                    <button onClick={clearAll} className="text-gray-400 hover:underline">{T('إلغاء', 'Clear')}</button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Rolls list */}
                                    {loadingUnassigned ? (
                                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
                                    ) : filteredUnassigned.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                            <Package className="w-10 h-10 mb-2 opacity-30" />
                                            <p className="text-sm">
                                                {unassignedRolls.length === 0
                                                    ? T('لا توجد رولونات غير معيّنة في هذا المستودع', 'No unassigned rolls in this warehouse')
                                                    : T('لا توجد نتائج للفلتر المحدد', 'No results for selected filter')}
                                            </p>
                                            {(filterColor || filterMaterial) && (
                                                <button onClick={() => { setFilterColor(null); setFilterMaterial(null); }} className="mt-2 text-xs text-blue-500 hover:underline">
                                                    {T('إزالة الفلاتر', 'Clear filters')}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-2">
                                            {filteredUnassigned.map(roll => (
                                                <UnassignedRollCard
                                                    key={roll.id} roll={roll}
                                                    selected={selectedRollIds.has(roll.id)}
                                                    onToggle={() => toggleRoll(roll.id)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ══ BINS/SHELVES ══ */}
                            {activeTab === 'bins' && selection.type === 'cell' && (
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {T('الطوابق العمودية', 'Vertical Shelves')}
                                        <span className="ms-2 font-mono text-blue-600 normal-case">{selection.row}-{selection.col}</span>
                                    </p>
                                    {[...selection.bins]
                                        .sort((a, b) => (b.shelf_code || b.code).localeCompare(a.shelf_code || a.code))
                                        .map((bin, idx, arr) => {
                                            const realCount = existingRolls.filter(r => r.bin_location_id === bin.id).length;
                                            const displayCount = loadingExisting ? bin.current_rolls_count || 0 : realCount;
                                            const pct = bin.capacity_rolls
                                                ? Math.min((displayCount / bin.capacity_rolls) * 100, 100)
                                                : null;
                                            const bgCls = !pct || pct === 0 ? 'border-gray-200 bg-gray-50 dark:bg-gray-800'
                                                : pct < 50 ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20'
                                                    : pct < 100 ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20'
                                                        : 'border-red-200 bg-red-50 dark:bg-red-900/20';
                                            const barColor = !pct ? 'bg-gray-400' : pct < 50 ? 'bg-emerald-500' : pct < 100 ? 'bg-amber-500' : 'bg-red-500';
                                            return (
                                                <div key={bin.id} className={cn('border-2 rounded-xl p-4', bgCls)}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Layers className="w-4 h-4 text-gray-400" />
                                                            <span className="font-mono font-black text-sm text-gray-900 dark:text-gray-100">{bin.code}</span>
                                                            {idx === 0 && <Badge className="bg-blue-100 text-blue-700 text-[9px]">{T('الأعلى', 'Top')}</Badge>}
                                                            {idx === arr.length - 1 && <Badge className="bg-gray-100 text-gray-600 text-[9px]">{T('الأسفل', 'Bottom')}</Badge>}
                                                        </div>
                                                        <span className="font-mono text-sm font-bold text-gray-700 dark:text-gray-300">
                                                            {displayCount} / {bin.capacity_rolls ?? '∞'}
                                                        </span>
                                                    </div>
                                                    {bin.capacity_rolls && (
                                                        <div className="mt-2 h-2 bg-black/10 rounded-full overflow-hidden">
                                                            <div className={cn('h-full rounded-full', barColor)} style={{ width: `${pct ?? 0}%` }} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    <div className="flex justify-center pt-2">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg px-3 py-1.5">
                                            <span>▼</span><span>{T('الأرض', 'Floor')}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </ScrollArea>

                    {/* ─── Footer ─── */}
                    <div className="flex-shrink-0 border-t px-5 py-3 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between gap-3">
                        {activeTab === 'add' && selectedRollIds.size > 0 ? (
                            <>
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                    <strong>{selectedRollIds.size}</strong> {T('رولون → ', 'rolls → ')}
                                    <span className="font-mono font-bold text-blue-600 ms-1">
                                        {selection.bins.find(b => b.id === targetBinId)?.code || '—'}
                                    </span>
                                </span>
                                <Button size="sm" onClick={handleAssign} disabled={assigning || !targetBinId}
                                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                                    {assigning
                                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{T('جارٍ النقل...', 'Moving...')}</>
                                        : <><MoveRight className="w-3.5 h-3.5" />{T('نقل للموقع', 'Assign')}</>}
                                </Button>
                            </>
                        ) : (
                            <>
                                <span className="text-[10px] text-gray-400">
                                    {activeTab === 'rolls' && T('انقر على الرولون لفتح تفاصيله', 'Click roll for details')}
                                    {activeTab === 'add' && T('اختر رولونات ثم اضغط نقل', 'Select rolls then tap Assign')}
                                </span>
                                <Button variant="outline" size="sm" onClick={onClose} className="h-7 text-xs">
                                    {T('إغلاق', 'Close')}
                                </Button>
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* ─── Roll Detail Sheet (UnifiedAccountingSheet docType='roll') ─── */}
            {
                rollSheetData && (
                    <UnifiedAccountingSheet
                        key={rollSheetData.id}
                        isOpen={rollSheetOpen}
                        onClose={() => { setRollSheetOpen(false); setRollSheetData(null); }}
                        docType="roll"
                        mode="view"
                        data={rollSheetData}
                        documentId={rollSheetData.id}
                        companyId={companyId}
                    />
                )
            }
        </>
    );
}

export default WarehouseDetailSheet;
