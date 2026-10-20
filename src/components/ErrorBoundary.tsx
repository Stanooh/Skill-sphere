'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';

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
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', color: '#273339' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#6B7C84', marginBottom: '1rem' }}>
            The app encountered an error while loading. Try clearing your browser's local storage
            and refreshing the page.
          </p>
          <pre style={{
            background: '#F5F7F8',
            padding: '1rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
          }}>
            {this.state.error?.message ?? 'Unknown error'}
          </pre>
          <button
            onClick={() => {
              try {
                localStorage.clear();
              } catch {
                // ignore
              }
              window.location.reload();
            }}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#3770FF',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Clear storage and reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
