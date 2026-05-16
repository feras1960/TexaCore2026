import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation strings
const resources = {
  ar: {
    translation: {
      "app": {
        "title": "تطبيق الاتصال TexaCore",
        "activeCall": "مكالمة جارية",
        "return": "عودة",
        "ringing": "مكالمة واردة...",
        "connecting": "جاري الاتصال...",
        "connected": "مكالمة جارية",
        "mute": "كتم",
        "unmute": "إلغاء الكتم",
        "hold": "انتظار",
        "resume": "استئناف",
        "transfer": "تحويل",
        "transferTo": "تحويل المكالمة إلى:",
        "transferConfirm": "تأكيد",
        "otherNumber": "رقم آخر...",
        "unknownVisitor": "زائر مجهول",
        "webVisitor": "زائر موقع",
        "pc": "كمبيوتر",
        "mobile": "جوال"
      },
      "nav": {
        "dialpad": "لوحة المفاتيح",
        "history": "السجل",
        "contacts": "جهات الاتصال",
        "settings": "الإعدادات"
      },
      "contacts": {
        "search": "ابحث عن اسم أو رقم...",
        "loading": "جاري تحميل جهات الاتصال...",
        "empty": "لا توجد جهات اتصال",
        "noResults": "لا توجد نتائج",
        "all": "الكل",
        "customers": "العملاء",
        "suppliers": "الموردين",
        "customer": "عميل",
        "supplier": "مورد",
        "unnamed": "بدون اسم"
      },
      "history": {
        "empty": "لا يوجد سجل للمكالمات",
        "all": "الكل",
        "missed": "فائتة",
        "inbound": "واردة",
        "outbound": "صادرة",
        "justNow": "الآن",
        "minsAgo": "منذ {{count}} دقيقة",
        "hoursAgo": "منذ {{count}} ساعة",
        "yesterday": "أمس",
        "min": "د",
        "sec": "ث",
        "clearAll": "مسح السجل بالكامل"
      },
      "settings": {
        "title": "الإعدادات",
        "language": "لغة العرض",
        "autoSync": "📱 الربط التلقائي بـ ERP",
        "autoSyncDesc": "افتح إعدادات السنترال في المتصفح واضغط على 'نقل الإعدادات'",
        "startSync": "🔗 ابدأ الربط التلقائي",
        "waitingSync": "⏳ جاري انتظار الإعدادات...",
        "manual": "أو الإعداد اليدوي",
        "domain": "رابط السنترال (Domain)",
        "extension": "رقم التحويلة (Extension)",
        "password": "كلمة المرور",
        "save": "حفظ الإعدادات"
      }
    }
  },
  en: {
    translation: {
      "app": {
        "title": "TexaCore Softphone",
        "activeCall": "Active Call",
        "return": "Return",
        "ringing": "Incoming Call...",
        "connecting": "Connecting...",
        "connected": "Call Connected",
        "mute": "Mute",
        "unmute": "Unmute",
        "hold": "Hold",
        "resume": "Resume",
        "transfer": "Transfer",
        "transferTo": "Transfer call to:",
        "transferConfirm": "Confirm",
        "otherNumber": "Other number...",
        "unknownVisitor": "Unknown Visitor",
        "webVisitor": "Web Visitor",
        "pc": "PC",
        "mobile": "Mobile"
      },
      "nav": {
        "dialpad": "Dialpad",
        "history": "History",
        "contacts": "Contacts",
        "settings": "Settings"
      },
      "contacts": {
        "search": "Search name or number...",
        "loading": "Loading contacts...",
        "empty": "No contacts available",
        "noResults": "No results found",
        "all": "All",
        "customers": "Customers",
        "suppliers": "Suppliers",
        "customer": "Customer",
        "supplier": "Supplier",
        "unnamed": "Unnamed"
      },
      "history": {
        "empty": "No call history available",
        "all": "All",
        "missed": "Missed",
        "inbound": "Inbound",
        "outbound": "Outbound",
        "justNow": "Just now",
        "minsAgo": "{{count}} mins ago",
        "hoursAgo": "{{count}} hours ago",
        "yesterday": "Yesterday",
        "min": "m",
        "sec": "s",
        "clearAll": "Clear History"
      },
      "settings": {
        "title": "Settings",
        "language": "Display Language",
        "autoSync": "📱 Auto-sync with ERP",
        "autoSyncDesc": "Open PBX settings in browser and click 'Transfer Settings'",
        "startSync": "🔗 Start Auto-sync",
        "waitingSync": "⏳ Waiting for settings...",
        "manual": "Or Manual Setup",
        "domain": "PBX Domain",
        "extension": "Extension",
        "password": "Password",
        "save": "Save Settings"
      }
    }
  },
  uk: {
    translation: {
      "app": {
        "title": "TexaCore Softphone",
        "activeCall": "Активний дзвінок",
        "return": "Повернутися",
        "ringing": "Вхідний дзвінок...",
        "connecting": "З'єднання...",
        "connected": "Дзвінок підключено",
        "mute": "Вимкнути мікрофон",
        "unmute": "Увімкнути мікрофон",
        "hold": "Утримати",
        "resume": "Відновити",
        "transfer": "Переказ",
        "transferTo": "Перевести дзвінок на:",
        "transferConfirm": "Підтвердити",
        "otherNumber": "Інший номер...",
        "unknownVisitor": "Невідомий відвідувач",
        "webVisitor": "Відвідувач сайту",
        "pc": "ПК",
        "mobile": "Мобільний"
      },
      "nav": {
        "dialpad": "Клавіатура",
        "history": "Історія",
        "contacts": "Контакти",
        "settings": "Налаштування"
      },
      "contacts": {
        "search": "Пошук імені або номера...",
        "loading": "Завантаження контактів...",
        "empty": "Немає доступних контактів",
        "noResults": "Нічого не знайдено",
        "all": "Всі",
        "customers": "Клієнти",
        "suppliers": "Постачальники",
        "customer": "Клієнт",
        "supplier": "Постачальник",
        "unnamed": "Без імені"
      },
      "history": {
        "empty": "Історія дзвінків порожня",
        "all": "Всі",
        "missed": "Пропущені",
        "inbound": "Вхідні",
        "outbound": "Вихідні",
        "justNow": "Щойно",
        "minsAgo": "{{count}} хв тому",
        "hoursAgo": "{{count}} год тому",
        "yesterday": "Вчора",
        "min": "хв",
        "sec": "с",
        "clearAll": "Очистити історію"
      },
      "settings": {
        "title": "Налаштування",
        "language": "Мова відображення",
        "autoSync": "📱 Авто-синхронізація з ERP",
        "autoSyncDesc": "Відкрийте налаштування PBX у браузері та натисніть 'Перенести налаштування'",
        "startSync": "🔗 Почати авто-синхронізацію",
        "waitingSync": "⏳ Очікування налаштувань...",
        "manual": "Або ручне налаштування",
        "domain": "PBX Домен",
        "extension": "Внутрішній номер",
        "password": "Пароль",
        "save": "Зберегти налаштування"
      }
    }
  },
  ru: {
    translation: {
      "app": {
        "title": "TexaCore Softphone",
        "activeCall": "Активный вызов",
        "return": "Вернуться",
        "ringing": "Входящий вызов...",
        "connecting": "Соединение...",
        "connected": "Вызов подключен",
        "mute": "Отключить микрофон",
        "unmute": "Включить микрофон",
        "hold": "Удержание",
        "resume": "Возобновить",
        "transfer": "Перевод",
        "transferTo": "Перевести звонок на:",
        "transferConfirm": "Подтвердить",
        "otherNumber": "Другой номер...",
        "unknownVisitor": "Неизвестный посетитель",
        "webVisitor": "Посетитель сайта",
        "pc": "ПК",
        "mobile": "Мобильный"
      },
      "nav": {
        "dialpad": "Клавиатура",
        "history": "История",
        "contacts": "Контакты",
        "settings": "Настройки"
      },
      "contacts": {
        "search": "Поиск имени или номера...",
        "loading": "Загрузка контактов...",
        "empty": "Нет доступных контактов",
        "noResults": "Ничего не найдено",
        "all": "Все",
        "customers": "Клиенты",
        "suppliers": "Поставщики",
        "customer": "Клиент",
        "supplier": "Поставщик",
        "unnamed": "Без имени"
      },
      "history": {
        "empty": "История вызовов пуста",
        "all": "Все",
        "missed": "Пропущенные",
        "inbound": "Входящие",
        "outbound": "Исходящие",
        "justNow": "Только что",
        "minsAgo": "{{count}} мин назад",
        "hoursAgo": "{{count}} ч назад",
        "yesterday": "Вчера",
        "min": "м",
        "sec": "с",
        "clearAll": "Очистить историю"
      },
      "settings": {
        "title": "Настройки",
        "language": "Язык интерфейса",
        "autoSync": "📱 Авто-синхронизация с ERP",
        "autoSyncDesc": "Откройте настройки PBX в браузере и нажмите 'Перенести настройки'",
        "startSync": "🔗 Начать авто-синхронизацию",
        "waitingSync": "⏳ Ожидание настроек...",
        "manual": "Или ручная настройка",
        "domain": "PBX Домен",
        "extension": "Внутренний номер",
        "password": "Пароль",
        "save": "Сохранить настройки"
      }
    }
  }
};

// Detect OS language
const getSystemLanguage = () => {
  const lang = navigator.language || 'en';
  if (lang.startsWith('ar')) return 'ar';
  if (lang.startsWith('uk')) return 'uk';
  if (lang.startsWith('ru')) return 'ru';
  return 'en';
};

const savedLang = localStorage.getItem('app_lang');
const defaultLang = savedLang || getSystemLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

// Apply document direction based on language
document.documentElement.dir = defaultLang === 'ar' ? 'rtl' : 'ltr';

// Update direction dynamically when language changes
i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  localStorage.setItem('app_lang', lng);
});

export default i18n;
