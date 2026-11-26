import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut, Copy, Check } from 'lucide-react';
import { Button } from './ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled Application Render Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleResetAuth = (): void => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/login';
  };

  private handleCopyError = (): void => {
    const errorDetails = `Error: ${this.state.error?.message || 'Unknown'}\n\nStack:\n${this.state.error?.stack || ''}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || ''}`;
    void navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }).catch(() => {
      // ignore clipboard error
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 text-foreground">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">Something went wrong</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  The application encountered an unexpected runtime error.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 font-mono text-xs text-destructive overflow-auto max-h-40 whitespace-pre-wrap">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Reload Page
              </Button>
              <Button variant="outline" onClick={this.handleResetAuth} className="gap-2">
                <LogOut className="h-4 w-4" /> Reset Session & Login
              </Button>
              <Button variant="ghost" size="sm" onClick={this.handleCopyError} className="gap-2 ml-auto text-xs">
                {this.state.copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {this.state.copied ? 'Copied' : 'Copy Error Details'}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
