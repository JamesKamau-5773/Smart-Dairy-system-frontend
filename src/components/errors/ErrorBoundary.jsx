import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { SITE } from '../../landing/content';
import { reportError } from '../../lib/telemetry';
import { shellCopy } from '../../i18n/shell';

const { errorBoundary: copy } = shellCopy;

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

    reportError(error, { where: 'ErrorBoundary' });
  }

  componentDidUpdate(prevProps) {
    // A page-level boundary is keyed to the route; moving to another page clears the error.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) this.handleReset();
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
      const isPage = this.props.variant === 'page';

      return (
        <div role="alert" className={`flex items-center justify-center p-4 ${isPage ? 'min-h-[60vh]' : 'min-h-screen bg-background'}`}>
          <div className="w-full max-w-md rounded-modal border border-ink/10 bg-white p-8">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-danger-50 p-4">
                <AlertTriangle size={32} className="text-danger-900" aria-hidden="true" />
              </div>
            </div>

            <h1 className="mb-2 text-center text-xl font-bold text-ink">
              {isPage ? copy.pageTitle : copy.appTitle}
            </h1>
            <p className="mb-6 text-center text-sm text-ink-muted">
              {copy.message}
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 max-h-40 overflow-auto rounded-input bg-danger-50 p-3 font-mono text-xs text-danger-900">
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

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center justify-center rounded-button bg-brand px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-dark"
              >
                {copy.tryAgain}
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-button border border-ink/10 bg-surface px-4 py-2.5 font-medium text-ink transition-colors hover:bg-brand-50"
              >
                {copy.reload}
              </button>
            </div>

            {this.state.errorCount > 3 && (
              <p className="mt-4 rounded-input bg-warning-50 p-3 text-sm text-ink">
                {copy.keepsHappening(SITE.phoneDisplay)}
              </p>
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
