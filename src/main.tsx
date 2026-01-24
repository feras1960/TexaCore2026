import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './i18n/config';

// Note: StrictMode disabled temporarily to fix auth issues
// It causes double renders which abort Supabase requests
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />,
);
