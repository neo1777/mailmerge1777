import { AppState } from '../App';
import { useNavigate } from 'react-router-dom';
import { MappingTable } from '../components/mapping/MappingTable';
import { LivePreview } from '../components/mapping/LivePreview';
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export function Step3Mapping({ state, setState, isOffline }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>>, isOffline?: boolean }) {
   const navigate = useNavigate();
   const [showWarning, setShowWarning] = useState(false);

   const unmapped = state.mapping.filter(m => !m.colonnaInput).map(m => m.nomeCampoPdf);

   const onNext = () => {
       if (unmapped.length > 0 && !showWarning) {
           setShowWarning(true);
           return;
       }
       navigate('/step4');
   };

   return (
    <div className="bg-[#0f172a]/40 p-6 md:p-8 rounded-xl shadow-sm border border-white/5">
      <h2 className="text-2xl font-bold mb-2">Mapping Dati</h2>
      <p className="text-[#94a3b8] mb-8">Abbina i campi rilevati nel PDF (a sinistra) alle colonne del file dati caricato (a destra).</p>
      
      <MappingTable state={state} mapping={state.mapping} setMapping={(m) => setState(p => ({...p, mapping: m}))} />
      
      <LivePreview state={state} mapping={state.mapping} />

      {showWarning && (
          <div className="mt-8 bg-amber-500/10 p-4 rounded-lg border border-amber-500/20 text-amber-500 flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div>
                  <h4 className="font-bold mb-1">Campi non abbinati</h4>
                  <p className="text-sm mb-2">Ci sono {unmapped.length} campi PDF che non hanno una colonna assegnata ({unmapped.slice(0,3).join(', ')}{unmapped.length > 3 ? '...' : ''}). Nel PDF rimarranno vuoti.</p>
                  <p className="text-sm font-semibold">Clicca di nuovo "Continua all'Email" per confermare e proseguire comunque.</p>
              </div>
          </div>
      )}

      <div className="flex justify-between pt-8 mt-8 border-t border-white/5">
          <button onClick={() => navigate('/step2')} className="text-slate-400 hover:text-white font-medium px-4 py-2">
              Indietro
          </button>
          <button 
              onClick={onNext}
              disabled={isOffline}
              title={isOffline ? "Avvia prima il server locale — vedi la barra rossa in cima alla pagina" : ""}
              className="bg-[#10b981] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
              Continua all'Email
          </button>
      </div>
    </div>
   );
}
