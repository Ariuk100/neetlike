'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('🚨 ErrorBoundary:', error, errorInfo);
    
    // Report error to Sentry with context
    if (typeof window !== 'undefined') {
      import('../lib/monitoring').then(({ errorReporter }) => {
        errorReporter.captureError(error, {
          tags: {
            errorBoundary: 'true',
            component: 'ErrorBoundary'
          },
          extra: {
            componentStack: errorInfo.componentStack,
            errorBoundary: true
          },
          level: 'error'
        });
      }).catch(console.warn);
    }
    
    this.setState({ error, errorInfo });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h1 className="text-lg font-medium text-gray-900 dark:text-white">
                  Алдаа гарлаа
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Хуудас ачаалахад алдаа гарлаа
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                {this.state.error?.message || 'Тодорхойгүй алдаа'}
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Дахин ачаалах
              </button>
              <button
                onClick={() => window.history.back()}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
              >
                Буцах
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Stack trace
                </summary>
                <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-600 rounded overflow-auto max-h-32">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;