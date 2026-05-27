import { File as FileIcon, X, CheckCircle } from 'lucide-react';

export function FileCard({ file, onRemove, status = 'success' }: { file: File, onRemove: () => void, status?: 'success' | 'loading' }) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#0f172a]/40 border border-white/5 rounded-lg shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-sky-500/10 text-[#38bdf8] rounded flex items-center justify-center shrink-0">
          <FileIcon size={20} />
        </div>
        <div>
          <div className="font-medium text-white truncate max-w-[200px] sm:max-w-xs">{file.name}</div>
          <div className="text-xs text-[#94a3b8]">{(file.size / 1024).toFixed(1)} KB</div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {status === 'success' && <div className="text-[#10b981] flex items-center gap-1 text-sm font-medium"><CheckCircle size={16}/> Caricato</div>}
        <button onClick={onRemove} className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors" title="Rimuovi">
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
