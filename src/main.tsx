import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './i18n/config';
import { Toaster } from 'sonner';

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
