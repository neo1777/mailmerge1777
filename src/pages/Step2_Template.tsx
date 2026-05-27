import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropZone } from '../components/upload/DropZone';
import { FileCard } from '../components/upload/FileCard';
import { apiClient } from '../api/client';
import { AppState } from '../App';
import { AlertCircle } from 'lucide-react';

export function Step2Template({ state, setState, isOffline }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>>, isOffline?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [docWarning, setDocWarning] = useState(false);
  const navigate = useNavigate();

  const handleTemplateUpload = async (file: File) => {
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const payload = await apiClient.post<any>('/pdf/fields', formData);
      const fileData = await apiClient.post<any>('/upload', formData); // We need the path for backend operations later.
      
      setState(prev => {
          // Auto mapping
          const initialMapping = payload.map((campo: any) => {
              // try to find a matching column (case insensitive)
              const match = prev.colonneRilevate.find(c => c.toLowerCase() === campo.nome.toLowerCase())
                           || prev.campiDerivati.find(c => c.toLowerCase() === campo.nome.toLowerCase());
              return {
                  nomeCampoPdf: campo.nome,
                  colonnaInput: match || null,
                  isDerivato: prev.campiDerivati.includes(match || '')
              };
          });

          return {
              ...prev,
              templatePdf: Object.assign(file, { serverPath: fileData.path }),
              campiPdf: payload,
              mapping: initialMapping
          };
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [maxLimits, setMaxLimits] = useState({ maxAllegatoMB: 10, maxTotaleMB: 25 });

  useEffect(() => {
     apiClient.get<any>('/config').then(data => {
         if(data.upload) setMaxLimits(data.upload);
     }).catch(() => {});
  }, []);

  const handleStaticAttachmentUpload = async (file: File) => {
     const sizeMB = file.size / (1024 * 1024);
     if (sizeMB > maxLimits.maxAllegatoMB) {
         setError(`Il file "${file.name}" supera il limite di ${maxLimits.maxAllegatoMB}MB (è ${Math.ceil(sizeMB)}MB).`);
         return;
     }

     const currentTotalMB = state.allegatiStatici.reduce((acc, f) => acc + (f.size / (1024*1024)), 0);
     if (currentTotalMB + sizeMB > maxLimits.maxTotaleMB) {
         setError(`Aggiungendo questo file supereresti il limite totale di ${maxLimits.maxTotaleMB}MB per email.`);
         return;
     }

     if (file.name.endsWith('.doc') || file.name.endsWith('.docx') || file.name.endsWith('.odt')) {
         // Show warning
         setDocWarning(true);
     }

     try {
         const formData = new FormData();
         formData.append('file', file);
         const fileData = await apiClient.post<any>('/upload', formData);
         
         const staticFile = Object.assign(file, { serverPath: fileData.path });
         setState(prev => ({
             ...prev,
             allegatiStatici: [...prev.allegatiStatici, staticFile]
         }));
     } catch (err: any) {
         setError(err.message);
     }
  };

  const handleNext = () => {
    navigate('/step3');
  };
  
  const handleBack = () => {
     navigate('/step1');
  };

  return (
    <div className="bg-[#0f172a]/40 p-6 md:p-8 rounded-xl shadow-sm border border-white/5">
      <h2 className="text-2xl font-bold mb-2">Template & Allegati</h2>
      <p className="text-[#94a3b8] mb-8">Carica il PDF AcroForm da compilare e gli eventuali allegati fissi per tutte le email.</p>
      
      <div className="space-y-8">
        <div>
            <h3 className="text-lg font-semibold mb-3">Template PDF AcroForm</h3>
            {!state.templatePdf && (
                <DropZone 
                    onFileSelect={handleTemplateUpload} 
                    accept=".pdf" 
                    title="Trascina qui il file PDF" 
                    subtitle="Deve contenere campi form" 
                />
            )}
            {state.templatePdf && (
                <FileCard 
                    file={state.templatePdf} 
                    onRemove={() => setState(p => ({...p, templatePdf: null, campiPdf: []}))} 
                    status="success" 
                />
            )}
        </div>

        {error && (
            <div className="bg-rose-500/10 p-4 rounded-lg border border-rose-500/20 text-rose-400 flex items-start gap-3">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <div>{error}</div>
            </div>
        )}

        {state.templatePdf && state.campiPdf.length > 0 && (
             <div className="bg-sky-500/10 p-4 rounded-lg border border-sky-500/20 text-sky-300 text-sm">
                 Rilevati <strong>{state.campiPdf.length}</strong> campi nel modulo PDF. Nel prossimo step potrai abbinarli ai dati.
             </div>
        )}

        <div>
            <h3 className="text-lg font-semibold mb-1">Allegati fissi (Opzionale)</h3>
            <p className="text-sm text-[#94a3b8] mb-3">Verranno inviati identici a tutti i destinatari (Listini, brochure, manuali).</p>
            <DropZone 
                onFileSelect={handleStaticAttachmentUpload} 
                title="Trascina qui un file da allegare" 
                subtitle="Fino a 10MB per file" 
            />
            
            {state.allegatiStatici.length > 0 && (
                <div className="mt-4 space-y-2">
                    {state.allegatiStatici.map((f, i) => (
                        <FileCard 
                            key={i} 
                            file={f} 
                            onRemove={() => setState(p => ({...p, allegatiStatici: p.allegatiStatici.filter((_, idx) => idx !== i)}))} 
                        />
                    ))}
                </div>
            )}

            {docWarning && (
                <div className="mt-4 bg-amber-500/10 p-4 rounded-lg border border-amber-500/20 text-amber-500 flex items-start gap-3 text-sm">
                    <AlertCircle size={20} className="mt-0.5 shrink-0" />
                    <div>
                        <strong>Attenzione:</strong> I file Word/ODT possono essere allegati ma non compilati automaticamente.
                        Per compilare documenti personalizzati usa acroform1777 per convertirli in PDF AcroForm.
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="flex justify-between pt-8 mt-8 border-t border-white/5">
          <button onClick={handleBack} className="text-slate-400 hover:text-white font-medium px-4 py-2">
              Indietro
          </button>
          <button 
              onClick={handleNext}
              disabled={!state.templatePdf || isOffline}
              title={isOffline ? "Avvia prima il server locale — vedi la barra rossa in cima alla pagina" : ""}
              className="bg-[#10b981] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
              Continua al Mapping
          </button>
      </div>
    </div>
  );
}
