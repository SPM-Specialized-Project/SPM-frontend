import { Component, type ErrorInfo, type ReactNode } from 'react';

import { captureException } from '@/services/observability';

type ObservabilityErrorBoundaryProps = {
  children: ReactNode;
};

type ObservabilityErrorBoundaryState = {
  hasError: boolean;
};

export class ObservabilityErrorBoundary extends Component<
  ObservabilityErrorBoundaryProps,
  ObservabilityErrorBoundaryState
> {
  state: ObservabilityErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ObservabilityErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    captureException(error, {
      componentStack: errorInfo.componentStack ?? '',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center p-6 text-center">
          <div role="alert" className="max-w-md space-y-3">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p>Please reload the page to continue.</p>
            <button
              className="rounded bg-blue-700 px-4 py-2 text-white"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload page
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
