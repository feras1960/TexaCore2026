/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
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
        <div className="min-h-screen flex items-center justify-center bg-erp-cream dark:bg-gray-950 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">
                حدث خطأ
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 mb-2">
                  تفاصيل الخطأ (للتطوير فقط)
                </summary>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="flex gap-3">
              <Button onClick={this.handleReset} variant="teal">
                العودة للصفحة الرئيسية
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                إعادة تحميل الصفحة
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
