/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI
 * Uses direct translations since class components can't use hooks
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { translations, SupportedLanguage, SUPPORTED_LANGUAGES } from '@/i18n/config';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Get nested value from object by dot notation key
function getNestedValue(obj: Record<string, unknown>, key: string): string | undefined {
  const keys = key.split('.');
  let current: unknown = obj;
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = (current as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  
  return typeof current === 'string' ? current : undefined;
}

// Get current language from localStorage or document
function getCurrentLanguage(): SupportedLanguage {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('erp-language');
    if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) {
      return stored as SupportedLanguage;
    }
  }
  return 'en';
}

// Simple translation function for ErrorBoundary
function translate(key: string): string {
  const lang = getCurrentLanguage();
  const currentTranslations = translations[lang];
  
  let value = getNestedValue(currentTranslations as Record<string, unknown>, key);
  
  // Fallback to English
  if (value === undefined && lang !== 'en') {
    value = getNestedValue(translations.en as Record<string, unknown>, key);
  }
  
  return value || key;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <motion.div 
          className="min-h-screen flex items-center justify-center bg-erp-cream dark:bg-gray-950 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="max-w-md w-full bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 border border-red-200 dark:border-red-800"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </motion.div>
              <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">
                {translate('errors.title')}
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {translate('errors.unexpectedError')}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {translate('errors.devDetails')}
                </summary>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="flex gap-3">
              <Button onClick={this.handleReset} variant="teal">
                {translate('errors.goHome')}
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                {translate('errors.reload')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}
