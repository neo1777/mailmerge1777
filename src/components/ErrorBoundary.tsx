import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorStr: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorStr: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorStr: error.toString() };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#020203] font-sans text-slate-200 p-4">
          <div className="max-w-2xl w-full bg-[#0f172a]/80 p-8 rounded-xl shadow-lg border border-rose-500/30 text-center">
             <AlertCircle size={48} className="text-rose-500 mx-auto mb-6" />
             <h1 className="text-2xl font-bold text-white mb-4">Errore imprevisto dell'interfaccia</h1>
             <p className="text-[#94a3b8] mb-6">L'applicazione si è interrotta a causa di un errore. Ricarica la pagina per riprovare.</p>
             <div className="bg-black/50 p-4 rounded text-left text-rose-400 font-mono text-sm overflow-auto max-h-40 break-all mb-6">
                {this.state.errorStr}
             </div>
             <button 
               onClick={() => window.location.reload()}
               className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded font-medium transition-colors"
             >
               Ricarica App
             </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
