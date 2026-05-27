import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropZone } from '../components/upload/DropZone';
import { FileCard } from '../components/upload/FileCard';
import { apiClient } from '../api/client';
import { AppState } from '../App';
import { AlertCircle } from 'lucide-react';
import { ParseReport } from '../components/data/ParseReport';

export function Step1Dati({ state, setState, isOffline }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>>, isOffline?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any>(null);
  const [customMapping, setCustomMapping] = useState<Record<string, number | null>>({});
  const navigate = useNavigate();

  const handleFileSelect = async (selectedFile: File, newMapping?: Record<string, number | null>) => {
    setFile(selectedFile);
    setLoading(true);
    setError('');
    const mapToUse = newMapping || customMapping;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (Object.keys(mapToUse).length > 0) {
        formData.append('mapping', JSON.stringify(mapToUse));
      }
      
      const payload = await apiClient.post<any>('/data/parse', formData);
      setResults(payload);
      
      const missingCampi = payload.reportParsing?.campiMancanti?.length > 0;
      
      setState(prev => ({
          ...prev,
          destinatari: payload.destinatari,
          colonneRilevate: payload.colonneRilevate,
          campiDerivati: [], 
          reportParsing: payload.reportParsing
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (field: string, newHeaderIndex: number | null) => {
      const updatedMapping = { ...customMapping, [field]: newHeaderIndex };
      setCustomMapping(updatedMapping);
      if (file) {
          handleFileSelect(file, updatedMapping);
      }
  };

  const handleNext = () => {
    navigate('/step2');
  };

  const canContinue = results && results.righeValide > 0 && results.reportParsing?.campiMancanti?.length === 0;

  return (
    <div className="bg-[#0f172a]/40 p-6 md:p-8 rounded-xl shadow-sm border border-white/5">
      <h2 className="text-2xl font-bold mb-2">Carica Destinatari</h2>
      <p className="text-[#94a3b8] mb-8">Carica il file Excel o CSV con l'elenco dei destinatari. Il sistema estrarrà automaticamente i dati.</p>
      
      {!file && (
          <DropZone 
              onFileSelect={(f) => { setCustomMapping({}); handleFileSelect(f, {}); }} 
              accept=".xlsx,.xls,.csv,.txt,.tsv" 
              title="Trascina qui il file dati" 
              subtitle="Formati supportati: Excel, CSV, Testo delimitato" 
          />
      )}

      {file && (
          <div className="mb-8">
             <FileCard file={file} onRemove={() => { setFile(null); setResults(null); setError(''); setCustomMapping({}); }} status={loading ? 'loading' : 'success'} />
          </div>
      )}

      {loading && <div className="text-center py-8 text-[#94a3b8]">Analisi file in corso...</div>}
      
      {error && (
          <div className="bg-rose-500/10 p-4 rounded-lg border border-rose-500/20 text-rose-400 flex items-start gap-3 mb-8">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div>
                  <h4 className="font-medium">Errore di lettura</h4>
                  <p className="text-sm mt-1">{error}</p>
              </div>
          </div>
      )}

      {results && results.reportParsing && !loading && (
          <div className="space-y-6">
              <ParseReport 
                  report={results.reportParsing} 
                  allHeaders={results.headersRaw || (Array.isArray(results.colonneRilevate) ? results.colonneRilevate : [])}
                  onChangeMapping={handleMappingChange}
              />

              <div className="flex justify-end pt-4 border-t border-white/5">
                  <button 
                      onClick={handleNext}
                      disabled={!canContinue}
                      className="bg-[#10b981] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      Continua
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}
