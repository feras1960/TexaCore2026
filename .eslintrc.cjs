module.exports = {
    root: true,
    env: { browser: true, es2021: true, node: true },
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
      'plugin:i18next/recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 'latest', sourceType: 'module' },
    plugins: ['react', '@typescript-eslint', 'i18next'],
    settings: { react: { version: 'detect' } },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'i18next/no-literal-string': ['error', { 
        markupOnly: true,
        ignoreAttribute: [
          'className', 'style', 'type', 'name', 'id', 'key', 'dir', 'lang',
          'href', 'src', 'alt', 'value', 'data-*', 'aria-*',
          'strokeLinecap', 'strokeLinejoin', 'fill', 'stroke', 'viewBox',
          'points', 'offset', 'stopColor', 'd', 'transform', 'gradientId'
        ],
        ignore: [
          // Technical strings
          /^[A-Z0-9_-]+$/, // CONSTANTS, IDs
          /^[a-z]+\.[a-z.]+$/, // translation keys like common.save
          /^\d+(\.\d+)?$/, // numbers
          /^#[0-9a-fA-F]+$/, // hex colors
          /^https?:\/\//, // URLs
          /^v\d/, // versions
          /^\+?\d[\d\s-]+$/, // phone numbers
          /^[a-z]{2,3}(-[A-Z]{2})?$/, // locales like en, en-US
        ]
      }],
    },
    ignorePatterns: [
      'node_modules/', 
      'dist/', 
      'build/', 
      '*.config.js', 
      '*.config.cjs', 
      'vite.config.ts',
      // Service files - backend logic doesn't need translation
      'src/services/**/*.ts',
      // Data files - mock data
      'src/**/data/*.ts',
      // Test files
      '*.test.tsx',
      '*.test.ts',
      // Hooks - utility logic
      'src/hooks/*.ts',
      // Lib utilities
      'src/lib/*.ts',
      // Config files
      'src/**/configs/*.ts',
    ],
  };
  