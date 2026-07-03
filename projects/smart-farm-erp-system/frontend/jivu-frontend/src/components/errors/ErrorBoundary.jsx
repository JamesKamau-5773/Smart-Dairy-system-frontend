import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary Component
 * Catches errors in child components and displays a fallback UI
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log to external service in production
    console.error('[Error Boundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="flex min-h-screen items-center justify-center bg-surface p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-raised p-8 shadow-lg">
            {/* Icon */}
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-rose-100 p-4">
                <AlertTriangle size={32} className="text-rose-600" />
              </div>
            </div>

            {/* Title & Message */}
            <h1 className="mb-2 text-center text-xl font-bold text-ink">
              Something went wrong
            </h1>
            <p className="mb-6 text-center text-sm text-ink-muted">
              We encountered an unexpected error. Try refreshing the page or contact support if the problem persists.
            </p>

            {/* Error Details (Development Only) */}
            {isDevelopment && this.state.error && (
              <div className="mb-6 max-h-40 overflow-auto rounded-lg bg-rose-50 p-3 font-mono text-xs text-rose-900">
                <p className="font-bold">Error:</p>
                <p>{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <>
                    <p className="mt-2 font-bold">Component Stack:</p>
                    <p>{this.state.errorInfo.componentStack}</p>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-dark"
              >
                <RefreshCw size={18} />
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="rounded-lg border border-ink/10 bg-surface px-4 py-2.5 font-medium text-ink transition-colors hover:bg-surface-raised"
              >
                Go Home
              </button>
            </div>

            {/* Error Count Warning */}
            {this.state.errorCount > 3 && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                This error has occurred {this.state.errorCount} times. If this continues, please clear your browser cache or contact support.
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Async Error Boundary for promise rejections
 * Catches unhandled promise rejections
 */
export class AsyncErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };

    this.handleRejection = this.handleRejection.bind(this);
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.handleRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleRejection);
  }

  handleRejection(event) {
    this.setState({
      hasError: true,
      error: event.reason,
    });
    console.error('[Unhandled Promise Rejection]', event.reason);
  }

  render() {
    return <ErrorBoundary>{this.props.children}</ErrorBoundary>;
  }
}
