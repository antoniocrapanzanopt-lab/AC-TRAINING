import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State & { error?: Error } = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State & { error: Error } {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Errore non gestito intercettato da ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--color-bg)] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[var(--color-panel)] border border-[var(--color-danger)]/40 rounded-2xl p-8 shadow-2xl text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 flex items-center justify-center mb-6">
              <AlertOctagon className="w-8 h-8 text-[var(--color-danger)]" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">Si è verificato un imprevisto</h2>

            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              L'applicazione ha riscontrato un problema temporaneo durante il caricamento della pagina. Può riprovare ricaricando la scheda.
            </p>

            {this.state.error && (
              <div className="bg-red-950/50 p-4 rounded-xl text-left overflow-auto mb-6 text-xs text-red-200 border border-red-500/30">
                <p className="font-bold mb-1">{this.state.error.toString()}</p>
                <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--color-primary)] text-black font-bold hover:bg-[var(--color-primary-hover)] transition-all shadow-lg shadow-[var(--color-primary)]/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Ricarica applicazione</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
