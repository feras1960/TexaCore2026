module.exports = {
  input: ['src/**/*.{js,jsx,ts,tsx}'],
  output: './',
  options: {
    debug: false,
    sort: true,
    func: {
      list: ['t', 'i18next.t'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    lngs: ['ar', 'en', 'ru', 'uk', 'pl', 'tr', 'de', 'it', 'ro'],
    defaultLng: 'ar',
    defaultValue: (lng, ns, key) => `__NEEDS_TRANSLATION__${key}`,
    resource: {
      loadPath: 'src/i18n/locales/{{lng}}.json',
      savePath: 'src/i18n/locales/{{lng}}.json',
      jsonIndent: 2,
    },
    keySeparator: '.',
  },
};
