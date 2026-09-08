import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, info });
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-5">
        <h1 className="mb-2 text-lg font-semibold text-red-700">Something went wrong</h1>
        <p className="mb-3 text-sm text-red-600">{error.message}</p>
        <pre className="mb-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-slateblue-600">
          {error.stack}
          {info?.componentStack}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-nest-600 px-4 py-2 text-sm font-medium text-white hover:bg-nest-700"
        >
          Reload
        </button>
      </div>
    );
  }
}
