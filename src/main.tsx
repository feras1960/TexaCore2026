import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './i18n/config';
import { Toaster } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════
// 🔇 Suppress harmless AbortErrors from Supabase-js
// -----------------------------------------------------------------------
// Supabase-js creates internal Promises that reject with AbortError when
// a fetch is cancelled (page navigation, tab switch, React re-render).
// These are completely harmless but leak as "Uncaught (in promise)"
// because Supabase doesn't attach .catch() to its internal promises.
// We intercept them here BEFORE they reach the console.
// Real errors (non-Abort) are always re-reported normally.
// ═══════════════════════════════════════════════════════════════════════
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  const reason = event.reason;
  const isAbort =
    reason?.name === 'AbortError' ||
    String(reason?.message ?? '').toLowerCase().includes('aborted') ||
    String(reason?.message ?? '').toLowerCase().includes('signal is aborted');

  if (isAbort) {
    event.preventDefault(); // ← suppress console error, do NOT rethrow
  }
});

// Note: StrictMode disabled temporarily to fix auth issues
// It causes double renders which abort Supabase requests
ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Toaster
      position="top-center"
      richColors
      closeButton
      duration={3000}
      dir="auto"
    />
  </>,
);
