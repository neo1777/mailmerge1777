import { ShieldCheck } from 'lucide-react';
import { BackendStatusBar } from './BackendStatusBar';

export function AppHeader() {
  return (
    <div className="sticky top-0 z-50">
      <header className="bg-[#020617]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#10b981] rounded flex items-center justify-center text-white">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white leading-tight">mailmerge1777</h1>
          <p className="text-sm text-[#94a3b8] leading-tight">Stampa unione PDF professionale</p>
        </div>
      </div>
      <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></div>
        PRODUCTION READY
      </div>
      </header>
      <BackendStatusBar />
    </div>
  );
}
