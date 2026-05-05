/**
 * ════════════════════════════════════════════════════════════════
 * 🏢 PartyOverviewTab — تبويب نظرة عامة للجهات (عملاء / موردين)
 * ════════════════════════════════════════════════════════════════
 * يعرض بيانات الجهة في أقسام مطوية (Accordion):
 * 1. معلومات أساسية + حساب محاسبي
 * 2. بيانات التواصل
 * 3. العنوان والموقع
 * 4. البيانات الضريبية
 * 5. البيانات البنكية
 * 6. الشروط المالية
 * 7. الأسماء بلغات أخرى
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
    ChevronDown,
    ChevronUp,
    Info,
    BookOpen,
    Layers,
    Hash,
    Phone,
    MapPin,
    Receipt,
    Landmark,
    CreditCard,
    Globe,
    Users,
    Building2,
    User,
    UserCheck,
    Plus,
    X,
    FileText,
    AlertTriangle,
    Wallet,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalizedName } from '@/lib/utils/getLocalizedName';
import { supabase } from '@/lib/supabase';
import type { SheetMode } from '../types';
import { formatCurrency, formatNumber, formatDate, getCurrencySymbol } from '../utils/formatters';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { IdentityDocumentsSection } from '@/features/exchange/components/IdentityDocumentsSection';

// ═══ Language Config ═══
const LANGUAGE_CONFIG = [
    { code: 'ar', label: 'العربية', flag: '🇸🇦', field: 'name_ar', required: true },
    { code: 'en', label: 'English', flag: '🇬🇧', field: 'name_en', required: false },
    { code: 'ru', label: 'Русский', flag: '🇷🇺', field: 'name_ru', required: false },
    { code: 'uk', label: 'Українська', flag: '🇺🇦', field: 'name_uk', required: false },
    { code: 'ro', label: 'Română', flag: '🇷🇴', field: 'name_ro', required: false },
    { code: 'pl', label: 'Polski', flag: '🇵🇱', field: 'name_pl', required: false },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷', field: 'name_tr', required: false },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪', field: 'name_de', required: false },
    { code: 'it', label: 'Italiano', flag: '🇮🇹', field: 'name_it', required: false },
] as const;

// ═══ Country list ═══
const COUNTRY_LIST = [
    { code: 'UA', name_ar: 'أوكرانيا', name_en: 'Ukraine', flag: '🇺🇦', taxSystem: 'VAT' },
    { code: 'TR', name_ar: 'تركيا', name_en: 'Turkey', flag: '🇹🇷', taxSystem: 'KDV' },
    { code: 'SA', name_ar: 'السعودية', name_en: 'Saudi Arabia', flag: '🇸🇦', taxSystem: 'VAT' },
    { code: 'AE', name_ar: 'الإمارات', name_en: 'UAE', flag: '🇦🇪', taxSystem: 'VAT' },
    { code: 'CN', name_ar: 'الصين', name_en: 'China', flag: '🇨🇳', taxSystem: 'VAT' },
    { code: 'IN', name_ar: 'الهند', name_en: 'India', flag: '🇮🇳', taxSystem: 'GST' },
    { code: 'EG', name_ar: 'مصر', name_en: 'Egypt', flag: '🇪🇬', taxSystem: 'VAT' },
    { code: 'JO', name_ar: 'الأردن', name_en: 'Jordan', flag: '🇯🇴', taxSystem: 'GST' },
    { code: 'RO', name_ar: 'رومانيا', name_en: 'Romania', flag: '🇷🇴', taxSystem: 'TVA' },
    { code: 'PL', name_ar: 'بولندا', name_en: 'Poland', flag: '🇵🇱', taxSystem: 'VAT' },
    { code: 'DE', name_ar: 'ألمانيا', name_en: 'Germany', flag: '🇩🇪', taxSystem: 'USt' },
    { code: 'IT', name_ar: 'إيطاليا', name_en: 'Italy', flag: '🇮🇹', taxSystem: 'IVA' },
    { code: 'US', name_ar: 'أمريكا', name_en: 'United States', flag: '🇺🇸', taxSystem: 'Sales Tax' },
    { code: 'GB', name_ar: 'بريطانيا', name_en: 'United Kingdom', flag: '🇬🇧', taxSystem: 'VAT' },
    { code: 'FR', name_ar: 'فرنسا', name_en: 'France', flag: '🇫🇷', taxSystem: 'TVA' },
    { code: 'RU', name_ar: 'روسيا', name_en: 'Russia', flag: '🇷🇺', taxSystem: 'НДС' },
    { code: 'PK', name_ar: 'باكستان', name_en: 'Pakistan', flag: '🇵🇰', taxSystem: 'GST' },
    { code: 'BD', name_ar: 'بنغلاديش', name_en: 'Bangladesh', flag: '🇧🇩', taxSystem: 'VAT' },
    { code: 'OTHER', name_ar: 'أخرى', name_en: 'Other', flag: '🌍', taxSystem: '' },
];

// ═══ Party type options ═══
const CUSTOMER_TYPES = [
    { value: 'wholesale', label_ar: 'جملة', label_en: 'Wholesale' },
    { value: 'retail', label_ar: 'تجزئة', label_en: 'Retail' },
    { value: 'corporate', label_ar: 'شركات', label_en: 'Corporate' },
    { value: 'individual', label_ar: 'فرد', label_en: 'Individual' },
    { value: 'exchange', label_ar: 'صرافة', label_en: 'Exchange' },
];

const SUPPLIER_TYPES = [
    { value: 'fabric', label_ar: 'أقمشة', label_en: 'Fabric' },
    { value: 'accessories', label_ar: 'إكسسوارات', label_en: 'Accessories' },
    { value: 'service', label_ar: 'خدمات', label_en: 'Service' },
    { value: 'manufacturer', label_ar: 'مصنّع', label_en: 'Manufacturer' },
];

// ═══ Entity Type (individual/company) ═══
const ENTITY_TYPES = [
    { value: 'individual', label_ar: 'فرد', label_en: 'Individual', icon: User },
    { value: 'company', label_ar: 'شركة', label_en: 'Company', icon: Building2 },
];

// ═══ Props ═══
interface PartyOverviewTabProps {
    data: any;
    mode: SheetMode;
    onChange: (updates: any) => void;
    companyId?: string;
    docType?: string;
}

// ═══ Accordion Section ═══
function Section({
    title,
    icon: Icon,
    defaultOpen = false,
    children,
    badge,
    badgeColor = 'gray',
}: {
    title: string;
    icon: React.ElementType;
    defaultOpen?: boolean;
    children: React.ReactNode;
    badge?: string;
    badgeColor?: string;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const colorMap: Record<string, string> = {
        gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    };

    return (
        <div className="border rounded-xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden transition-all">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                        <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                        {title}
                    </span>
                    {badge && (
                        <Badge className={cn("text-[10px] px-1.5 py-0 h-4", colorMap[badgeColor] || colorMap.gray)}>
                            {badge}
                        </Badge>
                    )}
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {open && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
}

// ═══ Field Row ═══
function Field({ label, hint, children, required }: {
    label: string;
    hint?: string;
    children: React.ReactNode;
    required?: boolean;
}) {
    return (
        <div className="space-y-1">
            <Label className="text-xs text-gray-500 flex items-center gap-1">
                {label}
                {required && <span className="text-red-500">*</span>}
                {hint && <span className="text-[10px] text-gray-400 ms-1">({hint})</span>}
            </Label>
            {children}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════
export function PartyOverviewTab({ data, mode, onChange, companyId, docType }: PartyOverviewTabProps) {
    const { language, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const isAr = language === 'ar';
    const isEditable = mode === 'edit' || mode === 'create';
    // ═══ Multi-language local translator ═══
    // Supports all 9 languages via dictionary lookup (keyed by English label)
    const LABEL_TRANSLATIONS: Record<string, Record<string, string>> = {
        // ── Account Details ──
        'Details': { ru: 'Подробности', uk: 'Деталі', tr: 'Detaylar', de: 'Details', it: 'Dettagli', ro: 'Detalii', pl: 'Szczegóły' },
        'Account Name': { ru: 'Название счёта', uk: 'Назва рахунку', tr: 'Hesap Adı', de: 'Kontoname', it: 'Nome conto', ro: 'Numele contului', pl: 'Nazwa konta' },
        'Account Name (Arabic)': { ru: 'Название счёта (Арабский)', uk: 'Назва рахунку (Арабська)', tr: 'Hesap Adı (Arapça)', de: 'Kontoname (Arabisch)', it: 'Nome conto (Arabo)', ro: 'Numele contului (Arabă)', pl: 'Nazwa konta (Arabski)' },
        'Account Name (English)': { ru: 'Название счёта (Английский)', uk: 'Назва рахунку (Англійська)', tr: 'Hesap Adı (İngilizce)', de: 'Kontoname (Englisch)', it: 'Nome conto (Inglese)', ro: 'Numele contului (Engleză)', pl: 'Nazwa konta (Angielski)' },
        'Arabic name': { ru: 'Название на арабском', uk: 'Назва арабською', tr: 'Arapça ad', de: 'Arabischer Name', it: 'Nome arabo', ro: 'Nume în arabă', pl: 'Nazwa arabska' },
        'Account Code': { ru: 'Код счёта', uk: 'Код рахунку', tr: 'Hesap Kodu', de: 'Kontonummer', it: 'Codice conto', ro: 'Cod cont', pl: 'Kod konta' },
        'Account Type': { ru: 'Тип счёта', uk: 'Тип рахунку', tr: 'Hesap Türü', de: 'Kontotyp', it: 'Tipo conto', ro: 'Tip cont', pl: 'Typ konta' },
        'Record Type': { ru: 'Тип записи', uk: 'Тип запису', tr: 'Kayıt Türü', de: 'Datensatztyp', it: 'Tipo record', ro: 'Tip înregistrare', pl: 'Typ rekordu' },
        'Group Account': { ru: 'Групповой счёт', uk: 'Груповий рахунок', tr: 'Grup Hesabı', de: 'Gruppenkonto', it: 'Conto gruppo', ro: 'Cont grup', pl: 'Konto grupowe' },
        'Detail Account': { ru: 'Детальный счёт', uk: 'Детальний рахунок', tr: 'Detay Hesabı', de: 'Detailkonto', it: 'Conto dettaglio', ro: 'Cont detaliu', pl: 'Konto szczegółowe' },
        'Parent Account': { ru: 'Родительский счёт', uk: 'Батьківський рахунок', tr: 'Üst Hesap', de: 'Übergeordnetes Konto', it: 'Conto padre', ro: 'Cont părinte', pl: 'Konto nadrzędne' },
        'Root Account': { ru: 'Корневой счёт', uk: 'Кореневий рахунок', tr: 'Kök Hesap', de: 'Stammkonto', it: 'Conto radice', ro: 'Cont rădăcină', pl: 'Konto główne' },
        'Currency': { ru: 'Валюта', uk: 'Валюта', tr: 'Para Birimi', de: 'Währung', it: 'Valuta', ro: 'Monedă', pl: 'Waluta' },
        'Select': { ru: 'Выбрать', uk: 'Вибрати', tr: 'Seçin', de: 'Auswählen', it: 'Seleziona', ro: 'Selectează', pl: 'Wybierz' },
        'Select currency': { ru: 'Выберите валюту', uk: 'Виберіть валюту', tr: 'Para birimi seçin', de: 'Währung wählen', it: 'Seleziona valuta', ro: 'Selectează moneda', pl: 'Wybierz walutę' },
        'Multi-Currency': { ru: 'Мультивалютный', uk: 'Мультивалютний', tr: 'Çoklu Para Birimi', de: 'Mehrere Währungen', it: 'Multi-valuta', ro: 'Multi-monedă', pl: 'Wielowalutowy' },
        'Status': { ru: 'Статус', uk: 'Статус', tr: 'Durum', de: 'Status', it: 'Stato', ro: 'Stare', pl: 'Status' },
        '✓ Active': { ru: '✓ Активен', uk: '✓ Активний', tr: '✓ Aktif', de: '✓ Aktiv', it: '✓ Attivo', ro: '✓ Activ', pl: '✓ Aktywny' },
        '✗ Inactive': { ru: '✗ Неактивен', uk: '✗ Неактивний', tr: '✗ Pasif', de: '✗ Inaktiv', it: '✗ Inattivo', ro: '✗ Inactiv', pl: '✗ Nieaktywny' },
        'Account Properties': { ru: 'Свойства счёта', uk: 'Властивості рахунку', tr: 'Hesap Özellikleri', de: 'Kontoeigenschaften', it: 'Proprietà conto', ro: 'Proprietăți cont', pl: 'Właściwości konta' },
        'Bank Account': { ru: 'Банковский счёт', uk: 'Банківський рахунок', tr: 'Banka Hesabı', de: 'Bankkonto', it: 'Conto bancario', ro: 'Cont bancar', pl: 'Konto bankowe' },
        'Cash Account': { ru: 'Кассовый счёт', uk: 'Касовий рахунок', tr: 'Nakit Hesabı', de: 'Kassenkonto', it: 'Conto cassa', ro: 'Cont numerar', pl: 'Konto kasowe' },
        'Receivable': { ru: 'Дебиторская', uk: 'Дебіторська', tr: 'Alacak', de: 'Forderung', it: 'Credito', ro: 'De încasat', pl: 'Należność' },
        'Payable': { ru: 'Кредиторская', uk: 'Кредиторська', tr: 'Borç', de: 'Verbindlichkeit', it: 'Debito', ro: 'De plătit', pl: 'Zobowiązanie' },
        'Created At': { ru: 'Дата создания', uk: 'Дата створення', tr: 'Oluşturma Tarihi', de: 'Erstellt am', it: 'Data creazione', ro: 'Creat la', pl: 'Data utworzenia' },
        'Debit': { ru: 'Дебет', uk: 'Дебет', tr: 'Borç', de: 'Soll', it: 'Dare', ro: 'Debit', pl: 'Debet' },
        'Credit': { ru: 'Кредит', uk: 'Кредит', tr: 'Alacak', de: 'Haben', it: 'Avere', ro: 'Credit', pl: 'Kredyt' },
        'Loading...': { ru: 'Загрузка...', uk: 'Завантаження...', tr: 'Yükleniyor...', de: 'Laden...', it: 'Caricamento...', ro: 'Se încarcă...', pl: 'Ładowanie...' },
        'Auto': { ru: 'Авто', uk: 'Авто', tr: 'Otomatik', de: 'Auto', it: 'Auto', ro: 'Auto', pl: 'Auto' },
        // ── Bank Info ──
        'Bank Information': { ru: 'Банковская информация', uk: 'Банківська інформація', tr: 'Banka Bilgileri', de: 'Bankinformation', it: 'Informazioni bancarie', ro: 'Informații bancare', pl: 'Informacje bankowe' },
        'Bank Name': { ru: 'Название банка', uk: 'Назва банку', tr: 'Banka Adı', de: 'Bankname', it: 'Nome banca', ro: 'Numele băncii', pl: 'Nazwa banku' },
        'Bank name': { ru: 'Название банка', uk: 'Назва банку', tr: 'Banka adı', de: 'Bankname', it: 'Nome banca', ro: 'Numele băncii', pl: 'Nazwa banku' },
        'Account Number / IBAN': { ru: 'Номер счёта / IBAN', uk: 'Номер рахунку / IBAN', tr: 'Hesap No / IBAN', de: 'Kontonummer / IBAN', it: 'Numero conto / IBAN', ro: 'Număr cont / IBAN', pl: 'Numer konta / IBAN' },
        'IBAN / Account': { ru: 'IBAN / Счёт', uk: 'IBAN / Рахунок', tr: 'IBAN / Hesap', de: 'IBAN / Konto', it: 'IBAN / Conto', ro: 'IBAN / Cont', pl: 'IBAN / Konto' },
        'No bank information added yet': { ru: 'Банковские данные не добавлены', uk: 'Банківські дані не додані', tr: 'Henüz banka bilgisi eklenmedi', de: 'Noch keine Bankdaten', it: 'Nessuna informazione bancaria', ro: 'Nicio informație bancară', pl: 'Brak danych bankowych' },
        // ── Description ──
        'Description & Notes': { ru: 'Описание и заметки', uk: 'Опис та нотатки', tr: 'Açıklama ve Notlar', de: 'Beschreibung & Notizen', it: 'Descrizione e note', ro: 'Descriere și note', pl: 'Opis i uwagi' },
        'Description': { ru: 'Описание', uk: 'Опис', tr: 'Açıklama', de: 'Beschreibung', it: 'Descrizione', ro: 'Descriere', pl: 'Opis' },
        'Account description...': { ru: 'Описание счёта...', uk: 'Опис рахунку...', tr: 'Hesap açıklaması...', de: 'Kontobeschreibung...', it: 'Descrizione conto...', ro: 'Descrierea contului...', pl: 'Opis konta...' },
        'No description': { ru: 'Нет описания', uk: 'Немає опису', tr: 'Açıklama yok', de: 'Keine Beschreibung', it: 'Nessuna descrizione', ro: 'Fără descriere', pl: 'Brak opisu' },
        'Notes': { ru: 'Заметки', uk: 'Нотатки', tr: 'Notlar', de: 'Notizen', it: 'Note', ro: 'Note', pl: 'Notatki' },
        'Additional notes...': { ru: 'Дополнительные заметки...', uk: 'Додаткові нотатки...', tr: 'Ek notlar...', de: 'Zusätzliche Notizen...', it: 'Note aggiuntive...', ro: 'Note suplimentare...', pl: 'Dodatkowe uwagi...' },
        'No notes': { ru: 'Нет заметок', uk: 'Немає нотаток', tr: 'Not yok', de: 'Keine Notizen', it: 'Nessuna nota', ro: 'Fără note', pl: 'Brak notatek' },
        // ── Multi-language ──
        'Names in Other Languages': { ru: 'Названия на других языках', uk: 'Назви іншими мовами', tr: 'Diğer dillerde isimler', de: 'Namen in anderen Sprachen', it: 'Nomi in altre lingue', ro: 'Nume în alte limbi', pl: 'Nazwy w innych językach' },
        'Add language...': { ru: 'Добавить язык...', uk: 'Додати мову...', tr: 'Dil ekle...', de: 'Sprache hinzufügen...', it: 'Aggiungi lingua...', ro: 'Adaugă limbă...', pl: 'Dodaj język...' },
        'No translations added yet': { ru: 'Переводы ещё не добавлены', uk: 'Переклади ще не додані', tr: 'Henüz çeviri eklenmedi', de: 'Noch keine Übersetzungen', it: 'Nessuna traduzione', ro: 'Nicio traducere', pl: 'Brak tłumaczeń' },
        // ── Balance / Summary Cards ──
        'Current Balance': { ru: 'Текущий баланс', uk: 'Поточний баланс', tr: 'Mevcut Bakiye', de: 'Aktueller Saldo', it: 'Saldo attuale', ro: 'Sold curent', pl: 'Bieżące saldo' },
        'Account Settled': { ru: 'Счёт закрыт', uk: 'Рахунок закритий', tr: 'Hesap kapatıldı', de: 'Konto ausgeglichen', it: 'Conto saldato', ro: 'Cont soldat', pl: 'Konto rozliczone' },
        'Opening Balance': { ru: 'Начальный баланс', uk: 'Початковий баланс', tr: 'Açılış Bakiyesi', de: 'Eröffnungssaldo', it: 'Saldo apertura', ro: 'Sold inițial', pl: 'Saldo otwarcia' },
        'Group': { ru: 'Группа', uk: 'Група', tr: 'Grup', de: 'Gruppe', it: 'Gruppo', ro: 'Grup', pl: 'Grupa' },
        'Detail': { ru: 'Детальный', uk: 'Детальний', tr: 'Detay', de: 'Detail', it: 'Dettaglio', ro: 'Detaliu', pl: 'Szczegółowy' },
        'Settled': { ru: 'Закрыт', uk: 'Закритий', tr: 'Kapatıldı', de: 'Ausgeglichen', it: 'Saldato', ro: 'Soldat', pl: 'Rozliczone' },
        'They owe us': { ru: 'Нам должны', uk: 'Нам винні', tr: 'Bize borçlular', de: 'Sie schulden uns', it: 'Ci devono', ro: 'Ne datorează', pl: 'Są nam winni' },
        'We owe them': { ru: 'Мы должны', uk: 'Ми винні', tr: 'Biz borçluyuz', de: 'Wir schulden', it: 'Dobbiamo loro', ro: 'Le datorăm', pl: 'Jesteśmy im winni' },
        'No data': { ru: 'Нет данных', uk: 'Немає даних', tr: 'Veri yok', de: 'Keine Daten', it: 'Nessun dato', ro: 'Fără date', pl: 'Brak danych' },
        // ── Party Info ──
        'Basic Information': { ru: 'Основная информация', uk: 'Основна інформація', tr: 'Temel Bilgiler', de: 'Grundinformationen', it: 'Informazioni base', ro: 'Informații de bază', pl: 'Informacje podstawowe' },
        'Name (Arabic)': { ru: 'Название (Арабский)', uk: 'Назва (Арабська)', tr: 'Ad (Arapça)', de: 'Name (Arabisch)', it: 'Nome (Arabo)', ro: 'Nume (Arabă)', pl: 'Nazwa (Arabski)' },
        'Name (English)': { ru: 'Название (Английский)', uk: 'Назва (Англійська)', tr: 'Ad (İngilizce)', de: 'Name (Englisch)', it: 'Nome (Inglese)', ro: 'Nume (Engleză)', pl: 'Nazwa (Angielski)' },
        'Company Name': { ru: 'Название компании', uk: 'Назва компанії', tr: 'Şirket Adı', de: 'Firmenname', it: 'Nome azienda', ro: 'Numele companiei', pl: 'Nazwa firmy' },
        'Company name if entity is a company': { ru: 'Название компании (если юрлицо)', uk: 'Назва компанії (якщо юрособа)', tr: 'Şirket adı (tüzel kişi ise)', de: 'Firmenname (bei Unternehmen)', it: 'Nome azienda (se entità)', ro: 'Numele companiei (dacă este firmă)', pl: 'Nazwa firmy (jeśli podmiot prawny)' },
        'Customer': { ru: 'Клиент', uk: 'Клієнт', tr: 'Müşteri', de: 'Kunde', it: 'Cliente', ro: 'Client', pl: 'Klient' },
        'Supplier': { ru: 'Поставщик', uk: 'Постачальник', tr: 'Tedarikçi', de: 'Lieferant', it: 'Fornitore', ro: 'Furnizor', pl: 'Dostawca' },
        'Customer Type': { ru: 'Тип клиента', uk: 'Тип клієнта', tr: 'Müşteri Türü', de: 'Kundentyp', it: 'Tipo cliente', ro: 'Tip client', pl: 'Typ klienta' },
        'Supplier Type': { ru: 'Тип поставщика', uk: 'Тип постачальника', tr: 'Tedarikçi Türü', de: 'Lieferantentyp', it: 'Tipo fornitore', ro: 'Tip furnizor', pl: 'Typ dostawcy' },
        'Party Type': { ru: 'Тип контрагента', uk: 'Тип контрагента', tr: 'Taraf Türü', de: 'Parteiart', it: 'Tipo parte', ro: 'Tip parte', pl: 'Typ kontrahenta' },
        'Accounting Type': { ru: 'Тип учёта', uk: 'Тип обліку', tr: 'Muhasebe Türü', de: 'Buchungsart', it: 'Tipo contabile', ro: 'Tip contabil', pl: 'Typ księgowy' },
        'Receivable (Debit)': { ru: 'Дебиторская (Дебет)', uk: 'Дебіторська (Дебет)', tr: 'Alacak (Borç)', de: 'Forderung (Soll)', it: 'Credito (Dare)', ro: 'De încasat (Debit)', pl: 'Należność (Debet)' },
        'Payable (Credit)': { ru: 'Кредиторская (Кредит)', uk: 'Кредиторська (Кредит)', tr: 'Borç (Alacak)', de: 'Verbindlichkeit (Haben)', it: 'Debito (Avere)', ro: 'De plătit (Credit)', pl: 'Zobowiązanie (Kredyt)' },
        'Auto by party type': { ru: 'Авто по типу контрагента', uk: 'Авто за типом контрагента', tr: 'Taraf türüne göre otomatik', de: 'Auto nach Parteityp', it: 'Auto per tipo parte', ro: 'Auto după tip parte', pl: 'Auto wg typu kontrahenta' },
        'Chart Account Code': { ru: 'Код счёта в плане', uk: 'Код рахунку в плані', tr: 'Hesap Planı Kodu', de: 'Kontenplan-Code', it: 'Codice piano conti', ro: 'Cod plan conturi', pl: 'Kod planu kont' },
        // ── Contact ──
        'Contact & Address': { ru: 'Контакты и адрес', uk: 'Контакти та адреса', tr: 'İletişim ve Adres', de: 'Kontakt & Adresse', it: 'Contatto e indirizzo', ro: 'Contact și adresă', pl: 'Kontakt i adres' },
        'Phone': { ru: 'Телефон', uk: 'Телефон', tr: 'Telefon', de: 'Telefon', it: 'Telefono', ro: 'Telefon', pl: 'Telefon' },
        'Mobile': { ru: 'Мобильный', uk: 'Мобільний', tr: 'Cep', de: 'Mobil', it: 'Cellulare', ro: 'Mobil', pl: 'Komórkowy' },
        'Email': { ru: 'Эл. почта', uk: 'Ел. пошта', tr: 'E-posta', de: 'E-Mail', it: 'E-mail', ro: 'E-mail', pl: 'E-mail' },
        'Telegram': { ru: 'Телеграм', uk: 'Телеграм', tr: 'Telegram', de: 'Telegram', it: 'Telegram', ro: 'Telegram', pl: 'Telegram' },
        'Country': { ru: 'Страна', uk: 'Країна', tr: 'Ülke', de: 'Land', it: 'Paese', ro: 'Țară', pl: 'Kraj' },
        'Select country': { ru: 'Выберите страну', uk: 'Виберіть країну', tr: 'Ülke seçin', de: 'Land wählen', it: 'Seleziona paese', ro: 'Selectează țara', pl: 'Wybierz kraj' },
        'City': { ru: 'Город', uk: 'Місто', tr: 'Şehir', de: 'Stadt', it: 'Città', ro: 'Oraș', pl: 'Miasto' },
        'Full Address': { ru: 'Полный адрес', uk: 'Повна адреса', tr: 'Tam Adres', de: 'Vollständige Adresse', it: 'Indirizzo completo', ro: 'Adresa completă', pl: 'Pełny adres' },
        'Detailed address...': { ru: 'Подробный адрес...', uk: 'Детальна адреса...', tr: 'Detaylı adres...', de: 'Detaillierte Adresse...', it: 'Indirizzo dettagliato...', ro: 'Adresa detaliată...', pl: 'Szczegółowy adres...' },
        'Preferred Language': { ru: 'Предпочтительный язык', uk: 'Бажана мова', tr: 'Tercih Edilen Dil', de: 'Bevorzugte Sprache', it: 'Lingua preferita', ro: 'Limba preferată', pl: 'Preferowany język' },
        // ── Tax ──
        'Tax': { ru: 'Налоги', uk: 'Податки', tr: 'Vergi', de: 'Steuer', it: 'Tasse', ro: 'Taxe', pl: 'Podatki' },
        'Tax ID': { ru: 'ИНН', uk: 'ІПН', tr: 'Vergi No', de: 'Steuer-ID', it: 'Codice fiscale', ro: 'Cod fiscal', pl: 'NIP' },
        'Tax Number / VAT': { ru: 'ИНН / НДС', uk: 'ІПН / ПДВ', tr: 'Vergi No / KDV', de: 'Steuernr. / USt', it: 'P.IVA', ro: 'Cod fiscal / TVA', pl: 'NIP / VAT' },
        'Tax System': { ru: 'Налоговая система', uk: 'Податкова система', tr: 'Vergi Sistemi', de: 'Steuersystem', it: 'Sistema fiscale', ro: 'Sistem fiscal', pl: 'System podatkowy' },
        '🌍 International — taxes paid via container': { ru: '🌍 Международный — налоги через контейнер', uk: '🌍 Міжнародний — податки через контейнер', tr: '🌍 Uluslararası — konteyner üzerinden vergi', de: '🌍 International — Steuern via Container', it: '🌍 Internazionale — tasse via container', ro: '🌍 Internațional — taxe prin container', pl: '🌍 Międzynarodowy — podatki przez kontener' },
        // ── Financial ──
        'Financial & Banking': { ru: 'Финансы и банк', uk: 'Фінанси та банк', tr: 'Finans ve Banka', de: 'Finanzen & Bank', it: 'Finanza e banca', ro: 'Finanțe și bancă', pl: 'Finanse i bankowość' },
        'Credit Limit': { ru: 'Кредитный лимит', uk: 'Кредитний ліміт', tr: 'Kredi Limiti', de: 'Kreditlimit', it: 'Limite credito', ro: 'Limită credit', pl: 'Limit kredytowy' },
        'Payment Terms (days)': { ru: 'Условия оплаты (дни)', uk: 'Умови оплати (дні)', tr: 'Ödeme Koşulları (gün)', de: 'Zahlungsbedingungen (Tage)', it: 'Termini pagamento (giorni)', ro: 'Condiții plată (zile)', pl: 'Warunki płatności (dni)' },
        'Discount %': { ru: 'Скидка %', uk: 'Знижка %', tr: 'İskonto %', de: 'Rabatt %', it: 'Sconto %', ro: 'Reducere %', pl: 'Rabat %' },
        'days': { ru: 'дней', uk: 'днів', tr: 'gün', de: 'Tage', it: 'giorni', ro: 'zile', pl: 'dni' },
        '— None —': { ru: '— Нет —', uk: '— Немає —', tr: '— Yok —', de: '— Keine —', it: '— Nessuno —', ro: '— Nimic —', pl: '— Brak —' },
        // ── Sales/Purchase Agent ──
        'Sales Agent': { ru: 'Торговый представитель', uk: 'Торговий представник', tr: 'Satış Temsilcisi', de: 'Verkaufsagent', it: 'Agente vendite', ro: 'Agent vânzări', pl: 'Agent sprzedaży' },
        'Purchase Agent': { ru: 'Агент закупок', uk: 'Агент закупівель', tr: 'Satın Alma Temsilcisi', de: 'Einkaufsagent', it: 'Agente acquisti', ro: 'Agent achiziții', pl: 'Agent zakupów' },
        'Select responsible agent': { ru: 'Выберите ответственного', uk: 'Виберіть відповідального', tr: 'Sorumlu temsilci seçin', de: 'Verantwortlichen wählen', it: 'Seleziona agente', ro: 'Selectează agentul', pl: 'Wybierz odpowiedzialnego' },
        'Not assigned': { ru: 'Не назначен', uk: 'Не призначено', tr: 'Atanmadı', de: 'Nicht zugewiesen', it: 'Non assegnato', ro: 'Neatribuit', pl: 'Nie przypisano' },
        'For targets & incentives': { ru: 'Для целей и поощрений', uk: 'Для цілей та заохочень', tr: 'Hedefler ve teşvikler için', de: 'Für Ziele & Anreize', it: 'Per obiettivi e incentivi', ro: 'Pentru obiective', pl: 'Dla celów i premii' },
        'Save customer data first': { ru: 'Сначала сохраните данные клиента', uk: 'Спочатку збережіть дані клієнта', tr: 'Önce müşteri verilerini kaydedin', de: 'Zuerst Kundendaten speichern', it: 'Prima salva i dati cliente', ro: 'Salvați mai întâi datele clientului', pl: 'Najpierw zapisz dane klienta' },
        'Save agent data first': { ru: 'Сначала сохраните данные агента', uk: 'Спочатку збережіть дані агента', tr: 'Önce temsilci verilerini kaydedin', de: 'Zuerst Agentendaten speichern', it: 'Prima salva i dati agente', ro: 'Salvați mai întâi datele agentului', pl: 'Najpierw zapisz dane agenta' },
        'Save partner data first': { ru: 'Сначала сохраните данные партнёра', uk: 'Спочатку збережіть дані партнера', tr: 'Önce ortak verilerini kaydedin', de: 'Zuerst Partnerdaten speichern', it: 'Prima salva i dati partner', ro: 'Salvați mai întâi datele partenerului', pl: 'Najpierw zapisz dane partnera' },
        // ── Documents ──
        'Documents & Identity': { ru: 'Документы и удостоверение', uk: 'Документи та посвідчення', tr: 'Belgeler ve Kimlik', de: 'Dokumente & Identität', it: 'Documenti e identità', ro: 'Documente și identitate', pl: 'Dokumenty i tożsamość' },
    };
    const t = (ar: string, en: string): string => {
        if (language === 'ar') return ar;
        if (language === 'en') return en;
        const trans = LABEL_TRANSLATIONS[en];
        if (trans && trans[language]) return trans[language];
        return en;
    };
    const { fmtAmount } = useNumberFormat();

    // ─── Detect if this is an ACCOUNT from chart_of_accounts (not a party) ───
    const isFundMode = docType === 'fund';
    const isPartyLikeDocType = docType === 'party' || docType === 'exchange_agent' || docType === 'exchange_partner';
    const isAccountMode = !isPartyLikeDocType && (isFundMode || !!(data?.account_code || data?.account_type_id || data?.is_group !== undefined));

    // ─── Determine party type from data (only relevant for party mode) ───
    const partyType: 'customer' | 'supplier' | 'agent' | 'partner' = data?._partyType || data?.party_type || data?.type || 'customer';
    // الوكلاء والشركاء في الصرافة = أصول (ذمم مدينة) وليسوا موردين
    const isCustomer = partyType === 'customer' || partyType === 'agent' || partyType === 'partner';

    // ─── State ───
    const [accountInfo, setAccountInfo] = useState<any>(null);
    const [accountTypeInfo, setAccountTypeInfo] = useState<any>(null);
    const [parentInfo, setParentInfo] = useState<any>(null);
    const [companyCurrencies, setCompanyCurrencies] = useState<string[]>([]);
    const [visibleLanguages, setVisibleLanguages] = useState<string[]>([]);
    const [showLanguages, setShowLanguages] = useState(false);
    const [salesAgents, setSalesAgents] = useState<{ id: string; full_name: string; role: string }[]>([]);

    // ─── Load account info from chart_of_accounts (party mode only) ───
    useEffect(() => {
        if (isAccountMode) return; // Skip for account mode
        const fetchAccountInfo = async () => {
            const accountId = (partyType === 'agent' || partyType === 'partner' || partyType === 'supplier')
                ? data?.payable_account_id
                : data?.receivable_account_id;
            if (!accountId) return;

            const { data: acct, error } = await supabase
                .from('chart_of_accounts')
                .select(`
                    id, account_code, name_ar, name_en, account_type_id, parent_id, is_group,
                    parent:chart_of_accounts!parent_id(id, account_code, name_ar, name_en)
                `)
                .eq('id', accountId)
                .single();

            if (!error && acct) {
                setAccountInfo(acct);
            }
        };
        fetchAccountInfo();
    }, [data?.receivable_account_id, data?.payable_account_id, isCustomer, isAccountMode]);

    // ─── Load account type info (account mode only) ───
    useEffect(() => {
        if (!isAccountMode || !data?.account_type_id) return;
        const fetchTypeInfo = async () => {
            const { data: typeData } = await supabase
                .from('account_types')
                .select('id, code, name_ar, name_en, classification, normal_balance')
                .eq('id', data.account_type_id)
                .maybeSingle();
            if (typeData) setAccountTypeInfo(typeData);
        };
        fetchTypeInfo();
    }, [isAccountMode, data?.account_type_id]);

    // ─── Load parent account info (account mode only) ───
    useEffect(() => {
        if (!isAccountMode || !data?.parent_id) return;
        const fetchParent = async () => {
            const { data: parent } = await supabase
                .from('chart_of_accounts')
                .select('id, account_code, name_ar, name_en')
                .eq('id', data.parent_id)
                .maybeSingle();
            if (parent) setParentInfo(parent);
        };
        fetchParent();
    }, [isAccountMode, data?.parent_id]);

    // ─── Load company currencies ───
    useEffect(() => {
        const fetchCurrencies = async () => {
            const cId = companyId || data?.company_id;
            if (!cId) return;
            const { data: settings } = await supabase
                .from('company_accounting_settings')
                .select('supported_currencies, base_currency')
                .eq('company_id', cId)
                .single();
            const supported = settings?.supported_currencies || [];
            const baseCur = settings?.base_currency || '';
            const merged = baseCur ? [baseCur, ...supported.filter((c: string) => c !== baseCur)] : supported;
            setCompanyCurrencies(merged.length > 0 ? merged : ['USD']);
            // Auto-set currency to base currency when creating a new entity
            if (!data?.currency && baseCur) {
                onChange({ currency: baseCur });
            } else if (!data?.currency && merged.length > 0) {
                onChange({ currency: merged[0] });
            }
        };
        fetchCurrencies();
    }, [companyId, data?.company_id]);

    // ─── Load sales agents (employees) — party mode only ───
    useEffect(() => {
        if (isAccountMode) return;
        const fetchAgents = async () => {
            const cId = companyId || data?.company_id;
            if (!cId) return;
            const { data: agents, error } = await supabase
                .from('user_profiles')
                .select('id, full_name, role')
                .eq('company_id', cId)
                .eq('is_active', true)
                .order('full_name');
            if (!error && agents) {
                setSalesAgents(agents);
            }
        };
        fetchAgents();
    }, [companyId, data?.company_id, isAccountMode]);

    // ─── Language visibility ───
    useEffect(() => {
        const langs: string[] = [];
        LANGUAGE_CONFIG.forEach((lang) => {
            if (!lang.required && data?.[lang.field]) {
                langs.push(lang.code);
            }
        });
        if (isEditable && !langs.includes('en')) langs.push('en');
        setVisibleLanguages(langs);
        if (langs.length > 0) setShowLanguages(true);
    }, [data?.id, isEditable]);

    // ─── Handlers ───
    const handleChange = useCallback((field: string, value: any) => {
        onChange({ [field]: value });
    }, [onChange]);

    // ═══ Fund Mode: Auto-init parent_id & account_type_id on create ═══
    const [fundAutoInitDone, setFundAutoInitDone] = useState(false);
    useEffect(() => {
        if (!isFundMode || mode !== 'create' || fundAutoInitDone) return;
        const cId = companyId || data?.company_id;
        if (!cId) return;

        const autoInit = async () => {
            const isBankFund = data?.is_bank_account;
            // Support both TexaCore (111/112) and Al-Rasheed (181/182) code patterns
            const parentCodes = isBankFund ? ['112', '182', '1120'] : ['111', '181', '1110'];

            // Find parent account — try each code pattern
            let parentAcct: any = null;
            for (const parentCode of parentCodes) {
              const { data: found } = await supabase
                .from('chart_of_accounts')
                .select('id, account_code, name_ar, name_en, account_type_id')
                .eq('company_id', cId)
                .eq('account_code', parentCode)
                .single();
              if (found) { parentAcct = found; break; }
            }
            // Also try flag-based detection as ultimate fallback
            if (!parentAcct) {
              const flagField = isBankFund ? 'is_bank_account' : 'is_cash_account';
              const { data: flagAcct } = await supabase
                .from('chart_of_accounts')
                .select('id, account_code, name_ar, name_en, account_type_id')
                .eq('company_id', cId)
                .eq(flagField, true)
                .eq('is_group', true)
                .limit(1)
                .single();
              if (flagAcct) parentAcct = flagAcct;
            }

            if (parentAcct) {
                // Set parent
                onChange({ parent_id: parentAcct.id });
                setParentInfo(parentAcct);

                // Auto-set account_type_id from parent
                if (parentAcct.account_type_id) {
                    onChange({ account_type_id: parentAcct.account_type_id });
                }

                // Auto-generate next code
                const { data: siblings } = await supabase
                    .from('chart_of_accounts')
                    .select('account_code')
                    .eq('company_id', cId)
                    .eq('parent_id', parentAcct.id);

                if (siblings && siblings.length > 0) {
                    const codes = siblings
                        .map((s: any) => parseInt(s.account_code))
                        .filter((n: number) => !isNaN(n));
                    const nextCode = codes.length > 0 ? (Math.max(...codes) + 1).toString() : parentAcct.account_code + '1';
                    onChange({ account_code: nextCode });
                } else {
                    onChange({ account_code: parentAcct.account_code + '1' });
                }

                // Set is_group to false and is_cash/is_bank flags
                onChange({ is_group: false });
                if (isBankFund) {
                    onChange({ is_bank_account: true, is_cash_account: false });
                } else {
                    onChange({ is_cash_account: true, is_bank_account: false });
                }
            }
            setFundAutoInitDone(true);
        };

        autoInit();
    }, [isFundMode, mode, fundAutoInitDone, companyId, data?.company_id, data?.is_bank_account]);

    // ─── The entity type (individual/company) — party mode ───
    const entityType = data?.customer_type || data?.supplier_type || 'wholesale';
    const entityKind = (entityType === 'individual' || entityType === 'retail') ? 'individual' : 'company';

    // ─── Country info — party mode ───
    const countryInfo = COUNTRY_LIST.find(c =>
        c.code === data?.country || c.name_en?.toLowerCase() === data?.country?.toLowerCase() || c.name_ar === data?.country
    );

    // ═══ Balance Card ═══
    const balance = data?.current_balance ?? data?.balance ?? 0;
    const openingBalance = data?.opening_balance ?? 0;
    const balanceLabel = isAccountMode
        ? (balance === 0 ? t('الحساب مُصفّى', 'Account Settled') : t('الرصيد الحالي', 'Current Balance'))
        : balance === 0
            ? t('مُصفّى', 'Settled')
            : balance > 0
                ? (isCustomer ? t('مستحق لنا', 'They owe us') : t('مستحق لهم', 'We owe them'))
                : (isCustomer ? t('مستحق لهم', 'We owe them') : t('مستحق لنا', 'They owe us'));
    const balanceColor = balance === 0
        ? 'text-gray-500'
        : isAccountMode
            ? 'text-indigo-600'
            : balance > 0
                ? (isCustomer ? 'text-green-600' : 'text-red-600')
                : (isCustomer ? 'text-red-600' : 'text-green-600');

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════
    if (!data) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <p>{t('لا توجد بيانات', 'No data')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">

            {/* ════════ Balance Summary Card ════════ */}
            {!isEditable && !isAccountMode && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="border rounded-xl p-3 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('الرصيد الحالي', 'Current Balance')}</p>
                        <p className={cn("text-lg font-bold font-mono", balanceColor)} dir="ltr">
                            {getCurrencySymbol(data?.currency || 'USD')} {fmtAmount(Math.abs(balance))}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{balanceLabel}</p>
                    </div>

                    <div className="border rounded-xl p-3 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-900/10 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('رقم الحساب', 'Account Code')}</p>
                        <p className="text-lg font-bold font-mono text-indigo-600" dir="ltr">
                            {accountInfo?.account_code || '—'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            {isCustomer ? t('ذمم مدينة', 'Receivable') : t('ذمم دائنة', 'Payable')}
                        </p>
                    </div>

                    <div className="border rounded-xl p-3 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-900/10 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('العملة', 'Currency')}</p>
                        <p className="text-lg font-bold font-mono">
                            {countryInfo?.flag || '🏳️'} {data?.currency || '—'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{countryInfo?.name_ar || data?.country || ''}</p>
                    </div>

                    <div className="border rounded-xl p-3 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-900/10 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('نوع الجهة', 'Party Type')}</p>
                        <div className="flex items-center gap-2 mt-1">
                            {isCustomer
                                ? <Users className="w-5 h-5 text-blue-500" />
                                : <Building2 className="w-5 h-5 text-orange-500" />
                            }
                            <span className="font-semibold text-sm">
                                {isCustomer ? t('عميل', 'Customer') : t('مورد', 'Supplier')}
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{data?.code}</p>
                    </div>
                </div>
            )}

            {/* ════════ Account Mode — Summary Cards ════════ */}
            {!isEditable && isAccountMode && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="border rounded-xl p-3 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('الرصيد الحالي', 'Current Balance')}</p>
                        <p className={cn("text-lg font-bold font-mono", balanceColor)} dir="ltr">
                            {getCurrencySymbol(data?.currency || 'USD')} {fmtAmount(Math.abs(balance))}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{balanceLabel}</p>
                    </div>

                    <div className="border rounded-xl p-3 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-900/10 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('رمز الحساب', 'Account Code')}</p>
                        <p className="text-lg font-bold font-mono text-indigo-600" dir="ltr">
                            {data?.account_code || '—'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            {accountTypeInfo ? getLocalizedName(accountTypeInfo, language) : ''}
                        </p>
                    </div>

                    <div className="border rounded-xl p-3 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-900/10 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('العملة', 'Currency')}</p>
                        <p className="text-lg font-bold font-mono">
                            {getCurrencySymbol(data?.currency || 'USD')} {data?.currency || '—'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            {data?.is_multi_currency ? t('متعدد العملات', 'Multi-Currency') : ''}
                        </p>
                    </div>

                    <div className="border rounded-xl p-3 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-900/10 dark:to-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1">{t('الرصيد الافتتاحي', 'Opening Balance')}</p>
                        <p className="text-lg font-bold font-mono text-amber-600" dir="ltr">
                            {getCurrencySymbol(data?.currency || 'USD')} {fmtAmount(Math.abs(openingBalance))}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{data?.is_group ? t('حساب رئيسي', 'Group') : t('حساب تفصيلي', 'Detail')}</p>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* ═══ ACCOUNT MODE SECTIONS ═══ */}
            {/* ═══════════════════════════════════════════════════════ */}
            {isAccountMode && (
                <>
                    {/* ════════ 1. Account Details ════════ */}
                    <Section
                        title={t('التفاصيل', 'Details')}
                        icon={BookOpen}
                        defaultOpen={true}
                        badge={data?.is_group ? t('رئيسي', 'Group') : t('تفصيلي', 'Detail')}
                        badgeColor={data?.is_group ? 'purple' : 'blue'}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            {/* Primary Name — user's current language */}
                            {(() => {
                                const userLang = LANGUAGE_CONFIG.find(l => l.code === language) || LANGUAGE_CONFIG[0];
                                const nameField = `name_${language}`;
                                const isRtlLang = language === 'ar';
                                return (
                                    <Field label={`${t('اسم الحساب', 'Account Name')} (${userLang.flag} ${userLang.label})`} required>
                                        {isEditable ? (
                                            <Input
                                                value={data?.[nameField] || ''}
                                                onChange={(e) => handleChange(nameField, e.target.value)}
                                                dir={isRtlLang ? 'rtl' : 'ltr'}
                                                placeholder={`${userLang.label}...`}
                                            />
                                        ) : (
                                            <p className="text-sm font-semibold mt-1">{data?.[nameField] || '—'}</p>
                                        )}
                                    </Field>
                                );
                            })()}

                            {/* English Name — shown when user language is NOT English */}
                            {language !== 'en' && (
                                <Field label={`${t('اسم الحساب', 'Account Name')} (🇬🇧 English)`}>
                                    {isEditable ? (
                                        <Input
                                            value={data?.name_en || ''}
                                            onChange={(e) => handleChange('name_en', e.target.value)}
                                            dir="ltr"
                                            placeholder="English name"
                                        />
                                    ) : (
                                        <p className="text-sm mt-1">{data?.name_en || '—'}</p>
                                    )}
                                </Field>
                            )}

                            <Field label={t('رمز الحساب', 'Account Code')}>
                                <p className="text-sm font-mono font-bold text-indigo-600 mt-1" dir="ltr">{data?.account_code || '—'}</p>
                            </Field>

                            <Field label={t('نوع الحساب', 'Account Type')}>
                                <div className="flex items-center gap-2 mt-1">
                                    {accountTypeInfo ? (
                                        <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                            {getLocalizedName(accountTypeInfo, language)}
                                        </Badge>
                                    ) : (
                                        <span className="text-sm text-gray-400">—</span>
                                    )}
                                    {accountTypeInfo?.normal_balance && (
                                        <Badge variant="outline" className="text-[10px]">
                                            {accountTypeInfo.normal_balance === 'debit' ? t('مدين', 'Debit') : t('دائن', 'Credit')}
                                        </Badge>
                                    )}
                                </div>
                            </Field>

                            <Field label={t('نوع السجل', 'Record Type')}>
                                <div className="flex items-center gap-2 mt-1">
                                    {data?.is_group ? (
                                        <Badge className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                            <Layers className="w-3 h-3 me-1" />
                                            {t('حساب رئيسي (مجموعة)', 'Group Account')}
                                        </Badge>
                                    ) : (
                                        <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                            <Hash className="w-3 h-3 me-1" />
                                            {t('حساب تفصيلي', 'Detail Account')}
                                        </Badge>
                                    )}
                                </div>
                            </Field>

                            <Field label={t('الحساب الأب', 'Parent Account')}>
                                <div className="flex items-center gap-2 mt-1">
                                    {parentInfo ? (
                                        <>
                                            <span className="font-mono text-xs text-gray-600" dir="ltr">
                                                {parentInfo.account_code}
                                            </span>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                {getLocalizedName(parentInfo, language)}
                                            </span>
                                        </>
                                    ) : data?.parent_id ? (
                                        <span className="text-sm text-gray-400">{t('جاري التحميل...', 'Loading...')}</span>
                                    ) : (
                                        <span className="text-sm text-gray-400">{t('حساب جذر', 'Root Account')}</span>
                                    )}
                                </div>
                            </Field>

                            <Field label={t('العملة', 'Currency')}>
                                {isEditable ? (
                                    <Select
                                        value={data?.currency || ''}
                                        onValueChange={(v) => handleChange('currency', v)}
                                    >
                                        <SelectTrigger><SelectValue placeholder={t('اختر العملة', 'Select')} /></SelectTrigger>
                                        <SelectContent>
                                            {companyCurrencies.map((c) => (
                                                <SelectItem key={c} value={c}>
                                                    <span className="font-mono text-xs">{getCurrencySymbol(c)} {c}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-sm font-mono mt-1">
                                        {data?.currency ? `${getCurrencySymbol(data.currency)} ${data.currency}` : '—'}
                                        {data?.is_multi_currency && (
                                            <Badge variant="outline" className="text-[10px] ms-2">{t('متعدد العملات', 'Multi-Currency')}</Badge>
                                        )}
                                    </p>
                                )}
                            </Field>

                            <Field label={t('الحالة', 'Status')}>
                                {isEditable ? (
                                    <div className="flex items-center gap-3 mt-1">
                                        <Switch
                                            checked={data?.is_active !== false}
                                            onCheckedChange={(v) => handleChange('is_active', v)}
                                        />
                                        <span className={cn('text-sm', data?.is_active !== false ? 'text-green-600' : 'text-red-500')}>
                                            {data?.is_active !== false ? t('✓ نشط', '✓ Active') : t('✗ غير نشط', '✗ Inactive')}
                                        </span>
                                    </div>
                                ) : (
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'text-xs mt-1',
                                            data?.is_active !== false
                                                ? 'border-green-500 text-green-600'
                                                : 'border-red-400 text-red-500'
                                        )}
                                    >
                                        {data?.is_active !== false ? t('✓ نشط', '✓ Active') : t('✗ غير نشط', '✗ Inactive')}
                                    </Badge>
                                )}
                            </Field>

                            {/* Account properties badges */}
                            {(data?.is_bank_account || data?.is_cash_account || data?.is_receivable || data?.is_payable) && (
                                <div className="md:col-span-2">
                                    <Field label={t('خصائص الحساب', 'Account Properties')}>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {data?.is_bank_account && (
                                                <Badge className="text-xs bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                                                    🏦 {t('حساب بنكي', 'Bank Account')}
                                                </Badge>
                                            )}
                                            {data?.is_cash_account && (
                                                <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    💵 {t('حساب نقدي (صندوق)', 'Cash Account')}
                                                </Badge>
                                            )}
                                            {data?.is_receivable && (
                                                <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {t('ذمم مدينة', 'Receivable')}
                                                </Badge>
                                            )}
                                            {data?.is_payable && (
                                                <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                    {t('ذمم دائنة', 'Payable')}
                                                </Badge>
                                            )}
                                        </div>
                                    </Field>
                                </div>
                            )}

                            {/* Creation date */}
                            <Field label={t('تاريخ الإنشاء', 'Created At')}>
                                <p className="text-sm mt-1">
                                    {data?.created_at ? new Date(data.created_at).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US', {
                                        year: 'numeric', month: 'short', day: 'numeric'
                                    }) : '—'}
                                </p>
                            </Field>
                        </div>
                    </Section>

                    {/* ════════ 2. Bank Info (only for bank accounts) ════════ */}
                    {data?.is_bank_account && (
                        <Section
                            title={t('البيانات البنكية', 'Bank Information')}
                            icon={Landmark}
                            defaultOpen={true}
                            badge="🏦"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <Field label={t('اسم البنك', 'Bank Name')}>
                                    {isEditable ? (
                                        <Input
                                            value={data?.bank_name || ''}
                                            onChange={(e) => handleChange('bank_name', e.target.value)}
                                            placeholder={t('اسم البنك', 'Bank name')}
                                        />
                                    ) : (
                                        <p className="text-sm mt-1">{data?.bank_name || '—'}</p>
                                    )}
                                </Field>

                                <Field label={t('رقم الحساب البنكي / IBAN', 'Account Number / IBAN')}>
                                    {isEditable ? (
                                        <Input
                                            value={data?.bank_account_number || ''}
                                            onChange={(e) => handleChange('bank_account_number', e.target.value)}
                                            dir="ltr"
                                            placeholder="UA123456789012345678901234567"
                                        />
                                    ) : (
                                        <p className="text-sm font-mono mt-1" dir="ltr">{data?.bank_account_number || '—'}</p>
                                    )}
                                </Field>
                            </div>
                            {!data?.bank_name && !data?.bank_account_number && !isEditable && (
                                <p className="text-xs text-gray-400 text-center mt-2">
                                    {t('لم تُضف بيانات بنكية بعد', 'No bank information added yet')}
                                </p>
                            )}
                        </Section>
                    )}

                    {/* ════════ 3. Description & Notes ════════ */}
                    <Section
                        title={t('الوصف والملاحظات', 'Description & Notes')}
                        icon={Info}
                        defaultOpen={!!(data?.description || data?.notes)}
                    >
                        <div className="grid grid-cols-1 gap-4 mt-2">
                            <Field label={t('الوصف', 'Description')}>
                                {isEditable ? (
                                    <Textarea
                                        value={data?.description || ''}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        placeholder={t('وصف الحساب...', 'Account description...')}
                                        rows={2}
                                        className="text-sm"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600 mt-1">{data?.description || t('لا يوجد وصف', 'No description')}</p>
                                )}
                            </Field>
                            <Field label={t('ملاحظات', 'Notes')}>
                                {isEditable ? (
                                    <Textarea
                                        value={data?.notes || ''}
                                        onChange={(e) => handleChange('notes', e.target.value)}
                                        placeholder={t('ملاحظات إضافية...', 'Additional notes...')}
                                        rows={2}
                                        className="text-sm"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600 mt-1">{data?.notes || t('لا توجد ملاحظات', 'No notes')}</p>
                                )}
                            </Field>
                        </div>
                    </Section>

                    {/* ════════ 4. Multi-Language Names ════════ */}
                    <Section
                        title={t('الأسماء بلغات أخرى', 'Names in Other Languages')}
                        icon={Globe}
                        defaultOpen={false}
                    >
                        <div className="space-y-3 mt-2">
                            {LANGUAGE_CONFIG.filter(
                                (l) => !l.required && (visibleLanguages.includes(l.code) || data?.[l.field])
                            ).map((lang) => (
                                <div key={lang.code} className="flex items-center gap-2">
                                    <span className="text-lg w-8 shrink-0">{lang.flag}</span>
                                    <span className="text-xs text-gray-500 w-10 shrink-0">{lang.code.toUpperCase()}</span>
                                    {isEditable ? (
                                        <>
                                            <Input
                                                value={data?.[lang.field] || ''}
                                                onChange={(e) => handleChange(lang.field, e.target.value)}
                                                placeholder={`${lang.label}...`}
                                                className="flex-1 text-sm"
                                                dir={lang.code === 'ar' ? 'rtl' : 'ltr'}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="shrink-0 w-8 h-8 text-gray-400 hover:text-red-500"
                                                onClick={() => {
                                                    handleChange(lang.field, '');
                                                    setVisibleLanguages(prev => prev.filter(c => c !== lang.code));
                                                }}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </>
                                    ) : (
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {data?.[lang.field] || '—'}
                                        </span>
                                    )}
                                </div>
                            ))}

                            {isEditable && (() => {
                                const addable = LANGUAGE_CONFIG.filter(
                                    (l) => !l.required && !visibleLanguages.includes(l.code) && !data?.[l.field]
                                );
                                if (addable.length === 0) return null;
                                return (
                                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <Select onValueChange={(code) => setVisibleLanguages(prev => [...prev, code])}>
                                            <SelectTrigger className="w-full text-xs text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <Plus className="w-3 h-3" />
                                                    {t('إضافة لغة...', 'Add language...')}
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {addable.map((l) => (
                                                    <SelectItem key={l.code} value={l.code}>
                                                        <span className="flex items-center gap-2">
                                                            <span>{l.flag}</span>
                                                            <span>{l.label}</span>
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                );
                            })()}

                            {!isEditable && visibleLanguages.length === 0 && !LANGUAGE_CONFIG.some(l => !l.required && data?.[l.field]) && (
                                <p className="text-xs text-gray-400 text-center py-2">
                                    {t('لم تُضف ترجمات بلغات أخرى', 'No translations added yet')}
                                </p>
                            )}
                        </div>
                    </Section>
                </>
            )}

            {/* ════════ PARTY MODE SECTIONS ════════ */}
            {!isAccountMode && (<>
                <Section
                    title={t('المعلومات الأساسية', 'Basic Information')}
                    icon={Info}
                    defaultOpen={true}
                    badge={isCustomer ? t('عميل', 'Customer') : t('مورد', 'Supplier')}
                    badgeColor={isCustomer ? 'blue' : 'orange'}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        {/* اسم الجهة (عربي) */}
                        <Field label={t('اسم الجهة (العربية)', 'Name (Arabic)')} required>
                            {isEditable ? (
                                <Input
                                    value={data?.name_ar || ''}
                                    onChange={(e) => handleChange('name_ar', e.target.value)}
                                    dir="rtl"
                                    placeholder={t('الاسم بالعربية', 'Arabic name')}
                                />
                            ) : (
                                <p className="text-sm font-semibold mt-1">{data?.name_ar || '—'}</p>
                            )}
                        </Field>

                        {/* اسم الجهة (إنجليزي) */}
                        <Field label={t('اسم الجهة (الإنجليزية)', 'Name (English)')}>
                            {isEditable ? (
                                <Input
                                    value={data?.name_en || ''}
                                    onChange={(e) => handleChange('name_en', e.target.value)}
                                    dir="ltr"
                                    placeholder="English name"
                                />
                            ) : (
                                <p className="text-sm mt-1">{data?.name_en || '—'}</p>
                            )}
                        </Field>

                        {/* رقم الحساب بالشجرة المحاسبية */}
                        <Field
                            label={t('رقم الحساب بالشجرة', 'Chart Account Code')}
                            hint={t('تلقائي', 'Auto')}
                        >
                            <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono font-bold text-indigo-600 text-base" dir="ltr">
                                    {accountInfo?.account_code || '—'}
                                </span>
                                {accountInfo && (
                                    <span className="text-[11px] text-gray-400">
                                        {getLocalizedName(accountInfo, language)}
                                    </span>
                                )}
                            </div>
                        </Field>

                        {/* نوع الحساب */}
                        <Field
                            label={t('نوع الحساب المحاسبي', 'Accounting Type')}
                            hint={t('تلقائي حسب الجهة', 'Auto by party type')}
                        >
                            <div className="flex items-center gap-2 mt-1">
                                <Badge className={cn(
                                    "text-xs",
                                    isCustomer
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                )}>
                                    {isCustomer ? t('ذمم مدينة (مدين)', 'Receivable (Debit)') : t('ذمم دائنة (دائن)', 'Payable (Credit)')}
                                </Badge>
                            </div>
                        </Field>

                        {/* الحساب الأب */}
                        <Field
                            label={t('الحساب الأب', 'Parent Account')}
                            hint={t('تلقائي', 'Auto')}
                        >
                            <div className="flex items-center gap-2 mt-1">
                                {accountInfo?.parent ? (
                                    <>
                                        <span className="font-mono text-xs text-gray-600" dir="ltr">
                                            {(accountInfo.parent as any).account_code}
                                        </span>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {getLocalizedName(accountInfo.parent as any, language)}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-sm text-gray-400">—</span>
                                )}
                            </div>
                        </Field>

                        {/* نوع الجهة (جملة / تجزئة / أقمشة...) */}
                        <Field label={isCustomer ? t('تصنيف العميل', 'Customer Type') : t('تصنيف المورد', 'Supplier Type')}>
                            {isEditable ? (
                                <Select
                                    value={isCustomer ? (data?.customer_type || '') : (data?.supplier_type || '')}
                                    onValueChange={(v) => handleChange(isCustomer ? 'customer_type' : 'supplier_type', v)}
                                >
                                    <SelectTrigger><SelectValue placeholder={t('اختر', 'Select')} /></SelectTrigger>
                                    <SelectContent>
                                        {(isCustomer ? CUSTOMER_TYPES : SUPPLIER_TYPES).map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {isAr ? opt.label_ar : opt.label_en}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm mt-1">
                                    {(() => {
                                        const types = isCustomer ? CUSTOMER_TYPES : SUPPLIER_TYPES;
                                        const val = isCustomer ? data?.customer_type : data?.supplier_type;
                                        const found = types.find(t => t.value === val);
                                        return found ? (isAr ? found.label_ar : found.label_en) : (val || '—');
                                    })()}
                                </p>
                            )}
                        </Field>

                        {/* اسم الشركة */}
                        <Field label={t('اسم الشركة / المؤسسة', 'Company Name')}>
                            {isEditable ? (
                                <Input
                                    value={data?.company_name || ''}
                                    onChange={(e) => handleChange('company_name', e.target.value)}
                                    placeholder={t('اسم المؤسسة إذا كانت شركة', 'Company name if entity is a company')}
                                />
                            ) : (
                                <p className="text-sm mt-1">{data?.company_name || '—'}</p>
                            )}
                        </Field>

                        {/* العملة — إلزامي */}
                        <Field label={t('العملة', 'Currency')} required>
                            {isEditable ? (
                                <Select
                                    value={data?.currency || ''}
                                    onValueChange={(v) => handleChange('currency', v)}
                                >
                                    <SelectTrigger className={cn(!data?.currency && 'border-red-300 dark:border-red-700')}>
                                        <SelectValue placeholder={t('اختر العملة', 'Select currency')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companyCurrencies.map((c) => (
                                            <SelectItem key={c} value={c}>
                                                <span className="font-mono text-xs">{getCurrencySymbol(c)} {c}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm font-mono mt-1">
                                    {data?.currency ? `${getCurrencySymbol(data.currency)} ${data.currency}` : '—'}
                                </p>
                            )}
                        </Field>

                        {/* الحالة */}
                        <Field label={t('الحالة', 'Status')}>
                            {isEditable ? (
                                <div className="flex items-center gap-3 mt-1">
                                    <Switch
                                        checked={data?.status === 'active' || data?.is_active !== false}
                                        onCheckedChange={(v) => {
                                            handleChange('status', v ? 'active' : 'inactive');
                                            handleChange('is_active', v);
                                        }}
                                    />
                                    <span className={cn('text-sm', (data?.status === 'active' || data?.is_active !== false) ? 'text-green-600' : 'text-red-500')}>
                                        {(data?.status === 'active' || data?.is_active !== false)
                                            ? t('✓ نشط', '✓ Active')
                                            : t('✗ غير نشط', '✗ Inactive')}
                                    </span>
                                </div>
                            ) : (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'text-xs mt-1',
                                        data?.status === 'active'
                                            ? 'border-green-500 text-green-600'
                                            : 'border-red-400 text-red-500'
                                    )}
                                >
                                    {data?.status === 'active' ? t('✓ نشط', '✓ Active') : t('✗ غير نشط', '✗ Inactive')}
                                </Badge>
                            )}
                        </Field>

                        {/* موظف المبيعات / الوكيل المسؤول */}
                        <Field
                            label={isCustomer ? t('موظف المبيعات المسؤول', 'Sales Agent') : t('موظف المشتريات المسؤول', 'Purchase Agent')}
                            hint={t('للتارغت والحوافز لاحقاً', 'For targets & incentives')}
                        >
                            {isEditable ? (
                                <Select
                                    value={data?.sales_agent_id || ''}
                                    onValueChange={(v) => handleChange('sales_agent_id', v === '__none__' ? null : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('اختر الموظف المسؤول', 'Select responsible agent')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">
                                            <span className="text-gray-400">{t('— بدون —', '— None —')}</span>
                                        </SelectItem>
                                        {salesAgents.map((agent) => (
                                            <SelectItem key={agent.id} value={agent.id}>
                                                <div className="flex items-center gap-2">
                                                    <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                                                    <span>{agent.full_name}</span>
                                                    {agent.role && (
                                                        <span className="text-[10px] text-gray-400 ms-1">({agent.role})</span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex items-center gap-2 mt-1">
                                    {data?.sales_agent_id ? (
                                        <>
                                            <UserCheck className="w-4 h-4 text-indigo-500" />
                                            <span className="text-sm font-medium">
                                                {salesAgents.find(a => a.id === data.sales_agent_id)?.full_name || data.sales_agent_id}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-sm text-gray-400">{t('لم يُحدد بعد', 'Not assigned')}</span>
                                    )}
                                </div>
                            )}
                        </Field>

                        {/* ملاحظات */}
                        <div className="md:col-span-2">
                            <Field label={t('ملاحظات', 'Notes')}>
                                {isEditable ? (
                                    <Textarea
                                        value={data?.notes || ''}
                                        onChange={(e) => handleChange('notes', e.target.value)}
                                        placeholder={t('ملاحظات إضافية...', 'Additional notes...')}
                                        rows={2}
                                        className="text-sm"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600 mt-1">{data?.notes || t('لا توجد ملاحظات', 'No notes')}</p>
                                )}
                            </Field>
                        </div>
                    </div>
                </Section>

                {/* ════════ 1.5. KYC / Identity — Exchange Only (Dynamic) ════════ */}
                {(data?.customer_type === 'exchange' || data?.source === 'exchange' || data?._exchangeContext) && (
                <Section
                    title={t('المستندات والهويات', 'Documents & Identity')}
                    icon={FileText}
                    defaultOpen={!!data?.id}
                >
                    <div className="mt-2">
                        {data?.id ? (
                            <IdentityDocumentsSection
                                entityType={data?._partyLabel === 'agent' ? 'agent' : data?._partyLabel === 'partner' ? 'partner' : 'customer'}
                                entityId={data.id}
                                isEditable={isEditable}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <FileText className="w-8 h-8 text-gray-200 dark:text-gray-600 mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                    {data?._partyLabel === 'agent'
                                        ? t('احفظ بيانات الوكيل أولاً', 'Save agent data first')
                                        : data?._partyLabel === 'partner'
                                            ? t('احفظ بيانات الشريك أولاً', 'Save partner data first')
                                            : t('احفظ بيانات العميل أولاً', 'Save customer data first')}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {t(
                                        'بعد حفظ البيانات الأساسية يمكنك إضافة المستندات والهويات (جواز سفر، هوية، إقامة، SWIFT...)',
                                        'After saving basic data, you can add documents and IDs (passport, national ID, residence permit, SWIFT...)'
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                </Section>
                )}

                {/* ════════ 2. التواصل والعنوان (مدمج) ════════ */}
                <Section
                    title={t('التواصل والعنوان', 'Contact & Address')}
                    icon={Phone}
                    defaultOpen={!isEditable}
                    badge={[data?.phone, data?.email, data?.country].filter(Boolean).length > 0 ? `${[data?.phone, data?.email, data?.country].filter(Boolean).length}` : undefined}
                    badgeColor="blue"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                        <Field label={t('الهاتف', 'Phone')}>
                            {isEditable ? (
                                <Input
                                    value={data?.phone || ''}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    dir="ltr"
                                    placeholder="+380 XX XXX XXXX"
                                    type="tel"
                                />
                            ) : (
                                <p className="text-sm font-mono mt-1" dir="ltr">{data?.phone || '—'}</p>
                            )}
                        </Field>

                        <Field label={t('الجوال', 'Mobile')}>
                            {isEditable ? (
                                <Input
                                    value={data?.mobile || ''}
                                    onChange={(e) => handleChange('mobile', e.target.value)}
                                    dir="ltr"
                                    placeholder="+380 XX XXX XXXX"
                                    type="tel"
                                />
                            ) : (
                                <p className="text-sm font-mono mt-1" dir="ltr">{data?.mobile || '—'}</p>
                            )}
                        </Field>

                        <Field label={t('البريد الإلكتروني', 'Email')}>
                            {isEditable ? (
                                <Input
                                    value={data?.email || ''}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    dir="ltr"
                                    placeholder="email@example.com"
                                    type="email"
                                />
                            ) : (
                                <p className="text-sm font-mono mt-1" dir="ltr">{data?.email || '—'}</p>
                            )}
                        </Field>

                        <Field label={t('تلغرام', 'Telegram')}>
                            {isEditable ? (
                                <Input
                                    value={data?.telegram_username || ''}
                                    onChange={(e) => handleChange('telegram_username', e.target.value)}
                                    dir="ltr"
                                    placeholder="@username"
                                />
                            ) : (
                                <p className="text-sm font-mono mt-1" dir="ltr">
                                    {data?.telegram_username ? `@${data.telegram_username}` : '—'}
                                </p>
                            )}
                        </Field>

                        <Field label={t('الدولة', 'Country')}>
                            {isEditable ? (
                                <Select
                                    value={data?.country || ''}
                                    onValueChange={(v) => handleChange('country', v)}
                                >
                                    <SelectTrigger><SelectValue placeholder={t('اختر الدولة', 'Select country')} /></SelectTrigger>
                                    <SelectContent>
                                        {COUNTRY_LIST.map((c) => (
                                            <SelectItem key={c.code} value={c.name_en}>
                                                {c.flag} {isAr ? c.name_ar : c.name_en}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm mt-1">
                                    {countryInfo ? `${countryInfo.flag} ${isAr ? countryInfo.name_ar : countryInfo.name_en}` : (data?.country || '—')}
                                </p>
                            )}
                        </Field>

                        <Field label={t('المدينة', 'City')}>
                            {isEditable ? (
                                <Input
                                    value={data?.city || ''}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    placeholder={t('المدينة', 'City')}
                                />
                            ) : (
                                <p className="text-sm mt-1">{data?.city || '—'}</p>
                            )}
                        </Field>

                        <div className="md:col-span-3">
                            <Field label={t('العنوان التفصيلي', 'Full Address')}>
                                {isEditable ? (
                                    <Input
                                        value={data?.address || ''}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                        placeholder={t('العنوان بالتفصيل...', 'Detailed address...')}
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600 mt-1">{data?.address || '—'}</p>
                                )}
                            </Field>
                        </div>

                        {isCustomer && (
                            <Field label={t('اللغة المفضلة', 'Preferred Language')}>
                                {isEditable ? (
                                    <Select
                                        value={data?.preferred_language || ''}
                                        onValueChange={(v) => handleChange('preferred_language', v)}
                                    >
                                        <SelectTrigger><SelectValue placeholder={t('اختر', 'Select')} /></SelectTrigger>
                                        <SelectContent>
                                            {LANGUAGE_CONFIG.map((l) => (
                                                <SelectItem key={l.code} value={l.code}>
                                                    {l.flag} {l.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-sm mt-1">
                                        {(() => {
                                            const lang = LANGUAGE_CONFIG.find(l => l.code === data?.preferred_language);
                                            return lang ? `${lang.flag} ${lang.label}` : '—';
                                        })()}
                                    </p>
                                )}
                            </Field>
                        )}
                    </div>
                </Section>

                {/* ════════ 3. البيانات المالية والبنكية (مدمج) ════════ */}
                <Section
                    title={t('المالية والبنكية', 'Financial & Banking')}
                    icon={CreditCard}
                    defaultOpen={false}
                    badge={data?.tax_number ? t('ضريبي', 'Tax') : undefined}
                    badgeColor="purple"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                        {/* شروط الدفع */}
                        <Field label={t('شروط الدفع (أيام)', 'Payment Terms (days)')}>
                            {isEditable ? (
                                <Input
                                    type="number"
                                    value={data?.payment_terms_days ?? ''}
                                    onChange={(e) => handleChange('payment_terms_days', parseInt(e.target.value) || null)}
                                    dir="ltr"
                                    placeholder="30"
                                    min={0}
                                />
                            ) : (
                                <p className="text-sm font-mono mt-1">
                                    {data?.payment_terms_days != null ? `${data.payment_terms_days} ${t('يوم', 'days')}` : '—'}
                                </p>
                            )}
                        </Field>

                        {isCustomer && (
                            <>
                                <Field label={t('حد الائتمان', 'Credit Limit')}>
                                    {isEditable ? (
                                        <Input
                                            type="number"
                                            value={data?.credit_limit ?? ''}
                                            onChange={(e) => handleChange('credit_limit', parseFloat(e.target.value) || null)}
                                            dir="ltr"
                                            placeholder="0.00"
                                            step="0.01"
                                        />
                                    ) : (
                                        <p className="text-sm font-mono mt-1">
                                            {data?.credit_limit != null
                                                ? `${getCurrencySymbol(data?.currency || 'USD')} ${fmtAmount(data.credit_limit)}`
                                                : '—'
                                            }
                                        </p>
                                    )}
                                </Field>

                                <Field label={t('نسبة الخصم %', 'Discount %')}>
                                    {isEditable ? (
                                        <Input
                                            type="number"
                                            value={data?.discount_percent ?? ''}
                                            onChange={(e) => handleChange('discount_percent', parseFloat(e.target.value) || null)}
                                            dir="ltr"
                                            placeholder="0"
                                            min={0}
                                            max={100}
                                            step="0.5"
                                        />
                                    ) : (
                                        <p className="text-sm font-mono mt-1">
                                            {data?.discount_percent != null ? `${data.discount_percent}%` : '—'}
                                        </p>
                                    )}
                                </Field>
                            </>
                        )}

                        {/* بيانات ضريبية */}
                        <Field label={t('الرقم الضريبي', 'Tax Number / VAT')}>
                            {isEditable ? (
                                <Input
                                    value={data?.tax_number || ''}
                                    onChange={(e) => handleChange('tax_number', e.target.value)}
                                    dir="ltr"
                                    placeholder={t('رقم التسجيل الضريبي', 'Tax ID')}
                                />
                            ) : (
                                <p className="text-sm font-mono mt-1" dir="ltr">{data?.tax_number || '—'}</p>
                            )}
                        </Field>

                        {countryInfo?.taxSystem && (
                            <Field label={t('النظام الضريبي', 'Tax System')}>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                        {countryInfo.flag} {countryInfo.taxSystem}
                                    </Badge>
                                </div>
                            </Field>
                        )}

                        {/* بيانات بنكية */}
                        <Field label={t('اسم البنك', 'Bank Name')}>
                            {isEditable ? (
                                <Input
                                    value={data?.bank_name || ''}
                                    onChange={(e) => handleChange('bank_name', e.target.value)}
                                    placeholder={t('اسم البنك', 'Bank name')}
                                />
                            ) : (
                                <p className="text-sm mt-1">{data?.bank_name || '—'}</p>
                            )}
                        </Field>

                        <Field label={t('IBAN / رقم الحساب', 'IBAN / Account')}>
                            {isEditable ? (
                                <Input
                                    value={data?.iban || data?.bank_account || ''}
                                    onChange={(e) => handleChange('iban', e.target.value)}
                                    dir="ltr"
                                    placeholder="UA123456789..."
                                />
                            ) : (
                                <p className="text-sm font-mono mt-1" dir="ltr">{data?.iban || data?.bank_account || '—'}</p>
                            )}
                        </Field>
                    </div>

                    {/* تنبيه الجهة الدولية */}
                    {countryInfo && data?.country && (() => {
                        const isInternational = data?.country !== 'Ukraine' && data?.country !== 'UA';
                        if (!isInternational) return null;
                        return (
                            <div className="flex items-start gap-2 p-2.5 mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    {t('🌍 جهة دولية — الضرائب تُدفع عبر الكونتينر', '🌍 International — taxes paid via container')}
                                </p>
                            </div>
                        );
                    })()}
                </Section>

                {/* ════════ 7. Multi-Language Names ════════ */}
                <Section
                    title={t('الأسماء بلغات أخرى', 'Names in Other Languages')}
                    icon={Globe}
                    defaultOpen={false}
                >
                    <div className="space-y-3 mt-2">
                        {LANGUAGE_CONFIG.filter(
                            (l) => !l.required && (visibleLanguages.includes(l.code) || data?.[l.field])
                        ).map((lang) => (
                            <div key={lang.code} className="flex items-center gap-2">
                                <span className="text-lg w-8 shrink-0">{lang.flag}</span>
                                <span className="text-xs text-gray-500 w-10 shrink-0">{lang.code.toUpperCase()}</span>
                                {isEditable ? (
                                    <>
                                        <Input
                                            value={data?.[lang.field] || ''}
                                            onChange={(e) => handleChange(lang.field, e.target.value)}
                                            placeholder={`${lang.label}...`}
                                            className="flex-1 text-sm"
                                            dir={lang.code === 'ar' ? 'rtl' : 'ltr'}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="shrink-0 w-8 h-8 text-gray-400 hover:text-red-500"
                                            onClick={() => {
                                                handleChange(lang.field, '');
                                                setVisibleLanguages(prev => prev.filter(c => c !== lang.code));
                                            }}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </>
                                ) : (
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {data?.[lang.field] || '—'}
                                    </span>
                                )}
                            </div>
                        ))}

                        {/* Add language button (edit mode) */}
                        {isEditable && (() => {
                            const addable = LANGUAGE_CONFIG.filter(
                                (l) => !l.required && !visibleLanguages.includes(l.code) && !data?.[l.field]
                            );
                            if (addable.length === 0) return null;
                            return (
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <Select onValueChange={(code) => setVisibleLanguages(prev => [...prev, code])}>
                                        <SelectTrigger className="w-full text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Plus className="w-3 h-3" />
                                                {t('إضافة لغة...', 'Add language...')}
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {addable.map((l) => (
                                                <SelectItem key={l.code} value={l.code}>
                                                    <span className="flex items-center gap-2">
                                                        <span>{l.flag}</span>
                                                        <span>{l.label}</span>
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            );
                        })()}

                        {/* No languages message (view mode) */}
                        {!isEditable && visibleLanguages.length === 0 && !LANGUAGE_CONFIG.some(l => !l.required && data?.[l.field]) && (
                            <p className="text-xs text-gray-400 text-center py-2">
                                {t('لم تُضف ترجمات بلغات أخرى', 'No translations added yet')}
                            </p>
                        )}
                    </div>
                </Section>
            </>)}
        </div>
    );
}

export default PartyOverviewTab;
