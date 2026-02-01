'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface SearchErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface SearchErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary for Search Components
 * Catches and handles errors in search-related components
 * Provides fallback UI and retry functionality
 */
export class SearchErrorBoundary extends Component<
  SearchErrorBoundaryProps,
  SearchErrorBoundaryState
> {
  constructor(props: SearchErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<SearchErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('SearchErrorBoundary caught an error:', error, errorInfo);
    }

    // TODO: Send error to monitoring service (e.g., Sentry) in production
    // Example: logErrorToService(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">검색 중 오류가 발생했습니다</h2>
          <p className="mt-2 text-sm text-gray-600">
            일시적인 문제일 수 있습니다. 다시 시도해주세요.
          </p>

          {/* Development mode: Show error details */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 w-full max-w-2xl">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                개발자 정보 (프로덕션에서는 표시되지 않음)
              </summary>
              <div className="mt-2 rounded bg-white p-4 text-left">
                <p className="text-sm font-semibold text-red-600">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="mt-2 overflow-x-auto text-xs text-gray-600">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </details>
          )}

          {/* Retry Button */}
          <button
            onClick={this.handleReset}
            className="mt-6 flex items-center gap-2 rounded-lg bg-[#E24EA0] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#E24EA0]/90"
          >
            <RefreshCcw className="h-4 w-4" />
            다시 시도
          </button>

          {/* Help Text */}
          <p className="mt-4 text-xs text-gray-500">
            문제가 계속되면{' '}
            <a href="mailto:support@peekle.com" className="text-[#E24EA0] underline">
              support@peekle.com
            </a>
            으로 문의해주세요.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
