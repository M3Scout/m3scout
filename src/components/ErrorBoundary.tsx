import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
          <div className="glass-card p-8 max-w-md text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Algo deu errado</h2>
              <p className="text-muted-foreground text-sm">
                {this.props.fallbackMessage || "Ocorreu um erro inesperado. Por favor, tente novamente."}
              </p>
            </div>
            {this.state.error && (
              <details className="text-left text-xs text-muted-foreground bg-muted/50 rounded p-3 mt-4">
                <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <Button onClick={this.handleRetry} variant="outline" className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
