#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');

// Filter and table translations for all languages
const filterTranslations = {
  de: {
    'costCenter': 'Kostenstelle',
    'Entry Number': 'Buchungsnummer',
    'Entry Nu...': 'Buchungs...',
    'More': 'Mehr',
    'moreFilters': 'Weitere Filter',
    'additionalFilters': 'Zusätzliche Filter',
    'activeFilters': 'Aktive Filter',
    'selectAll': 'Alle auswählen',
    'clear': 'Löschen',
    'empty': 'Leer',
    'columnVisibility': 'Spalten anzeigen/ausblenden',
    'columns': 'Spalten',
    'showAll': 'Alle anzeigen',
    'marker': 'Markierung',
    'selectMarkerColor': 'Markierungsfarbe wählen',
    'clearMarker': 'Markierung entfernen',
    'clickRowToMark': 'Klicken Sie auf eine Zeile um sie zu markieren',
    'exportCSV': 'Als CSV exportieren',
    'exportExcel': 'Als Excel exportieren',
    'openGoogleSheets': 'In Google Sheets öffnen',
    'clearFilters': 'Filter löschen',
    'totals': 'Summen',
    'filteredData': 'Gefilterte Daten',
    'records': 'Datensätze',
    'markerLegend': 'Farbführer',
    'filteredResults': 'Gefilterte Ergebnisse',
  },
  tr: {
    'costCenter': 'Maliyet Merkezi',
    'Entry Number': 'Kayıt Numarası',
    'Entry Nu...': 'Kayıt No...',
    'More': 'Daha Fazla',
    'moreFilters': 'Daha Fazla Filtre',
    'additionalFilters': 'Ek Filtreler',
    'activeFilters': 'Aktif Filtreler',
    'selectAll': 'Tümünü Seç',
    'clear': 'Temizle',
    'empty': 'Boş',
    'columnVisibility': 'Sütunları Göster/Gizle',
    'columns': 'Sütunlar',
    'showAll': 'Tümünü Göster',
    'marker': 'İşaretleyici',
    'selectMarkerColor': 'İşaretleyici rengi seçin',
    'clearMarker': 'İşareti kaldır',
    'clickRowToMark': 'İşaretlemek için satıra tıklayın',
    'exportCSV': 'CSV olarak dışa aktar',
    'exportExcel': 'Excel olarak dışa aktar',
    'openGoogleSheets': 'Google Sheets\'te aç',
    'clearFilters': 'Filtreleri temizle',
    'totals': 'Toplamlar',
    'filteredData': 'Filtrelenmiş veriler',
    'records': 'kayıt',
    'markerLegend': 'Renk kılavuzu',
    'filteredResults': 'Filtrelenmiş sonuçlar',
  },
  ru: {
    'costCenter': 'Центр затрат',
    'Entry Number': 'Номер записи',
    'Entry Nu...': 'Номер зап...',
    'More': 'Ещё',
    'moreFilters': 'Больше фильтров',
    'additionalFilters': 'Дополнительные фильтры',
    'activeFilters': 'Активные фильтры',
    'selectAll': 'Выбрать все',
    'clear': 'Очистить',
    'empty': 'Пусто',
    'columnVisibility': 'Показать/скрыть столбцы',
    'columns': 'Столбцы',
    'showAll': 'Показать все',
    'marker': 'Маркер',
    'selectMarkerColor': 'Выберите цвет маркера',
    'clearMarker': 'Удалить маркер',
    'clickRowToMark': 'Нажмите на строку для маркировки',
    'exportCSV': 'Экспорт в CSV',
    'exportExcel': 'Экспорт в Excel',
    'openGoogleSheets': 'Открыть в Google Sheets',
    'clearFilters': 'Очистить фильтры',
    'totals': 'Итого',
    'filteredData': 'Отфильтрованные данные',
    'records': 'записей',
    'markerLegend': 'Цветовой справочник',
    'filteredResults': 'Отфильтрованные результаты',
  },
  uk: {
    'costCenter': 'Центр витрат',
    'Entry Number': 'Номер запису',
    'More': 'Більше',
    'moreFilters': 'Більше фільтрів',
    'selectAll': 'Вибрати все',
    'clear': 'Очистити',
    'columns': 'Стовпці',
    'showAll': 'Показати все',
    'marker': 'Маркер',
    'clearFilters': 'Очистити фільтри',
    'totals': 'Всього',
  },
  it: {
    'costCenter': 'Centro di costo',
    'Entry Number': 'Numero voce',
    'More': 'Altro',
    'moreFilters': 'Altri filtri',
    'selectAll': 'Seleziona tutto',
    'clear': 'Cancella',
    'columns': 'Colonne',
    'showAll': 'Mostra tutto',
    'marker': 'Marcatore',
    'clearFilters': 'Cancella filtri',
    'totals': 'Totali',
  },
  pl: {
    'costCenter': 'Centrum kosztów',
    'Entry Number': 'Numer wpisu',
    'More': 'Więcej',
    'moreFilters': 'Więcej filtrów',
    'selectAll': 'Zaznacz wszystko',
    'clear': 'Wyczyść',
    'columns': 'Kolumny',
    'showAll': 'Pokaż wszystko',
    'marker': 'Marker',
    'clearFilters': 'Wyczyść filtry',
    'totals': 'Sumy',
  },
  ro: {
    'costCenter': 'Centru de cost',
    'Entry Number': 'Număr intrare',
    'More': 'Mai mult',
    'moreFilters': 'Mai multe filtre',
    'selectAll': 'Selectează tot',
    'clear': 'Șterge',
    'columns': 'Coloane',
    'showAll': 'Arată tot',
    'marker': 'Marker',
    'clearFilters': 'Șterge filtrele',
    'totals': 'Totaluri',
  }
};

// Process each language
Object.entries(filterTranslations).forEach(([lang, translations]) => {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const prefix = `[${lang.toUpperCase()}] `;
  
  Object.entries(translations).forEach(([key, value]) => {
    // Replace placeholder with proper translation
    const placeholder = prefix + key;
    const regex = new RegExp(`"\\[${lang.toUpperCase()}\\] ${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
    content = content.replace(regex, `"${value}"`);
  });
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ ${lang.toUpperCase()} filter translations fixed`);
});

console.log('\n✅ All filter translations fixed!');
