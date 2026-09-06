import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { technicalLogger } from '../../utils/technicalLogger';

interface SectionErrorBoundaryProps {
  children: ReactNode;
  sectionName: string;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  public state: SectionErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    technicalLogger.error('system', 'SECTION_CRASH', `Eccezione intercettata in ${this.props.sectionName}`, {
      errorMessage: error.message,
      componentStack: errorInfo.componentStack || undefined,
    });
  }

  private handleRetry = (): void => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 my-4 rounded-3xl bg-[var(--color-panel)] border border-rose-500/30 text-white shadow-xl max-w-xl mx-auto text-center space-y-4 animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-black text-white">
              Problema temporaneo in {this.props.sectionName}
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Il resto dell'applicazione è pienamente operativo e i tuoi dati sono al sicuro. Puoi riprovare a caricare questa sezione.
            </p>
          </div>

          {this.state.error && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-left text-[11px] font-mono text-rose-300/80 max-h-24 overflow-y-auto">
              {this.state.error.message}
            </div>
          )}

          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Riprova sezione</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
