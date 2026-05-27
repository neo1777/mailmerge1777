import { useState, useCallback } from 'react';
import { UploadCloud } from 'lucide-react';
import { clsx } from 'clsx';

export function DropZone({ onFileSelect, accept, title, subtitle }: { onFileSelect: (file: File) => void, accept?: string, title: string, subtitle: string }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragOver(true);
    } else if (e.type === 'dragleave') {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={clsx(
        "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer flex flex-col items-center justify-center",
        isDragOver ? "border-[#10b981] bg-rose-500/10" : "border-slate-700 hover:border-[#10b981] hover:bg-slate-900/60"
      )}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        id={`file-upload-${title.replace(/\s+/g, '-')}`}
      />
      <label htmlFor={`file-upload-${title.replace(/\s+/g, '-')}`} className="cursor-pointer flex flex-col items-center">
        <div className="w-16 h-16 bg-[#0f172a]/40 rounded-full flex items-center justify-center shadow-sm mb-4 text-[#10b981]">
          <UploadCloud size={32} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-[#94a3b8]">{subtitle}</p>
        <div className="mt-4 px-4 py-2 bg-[#0f172a]/40 border border-white/5 rounded text-sm font-medium hover:bg-slate-900/60 transition-colors">
          Sfoglia file
        </div>
      </label>
    </div>
  );
}
