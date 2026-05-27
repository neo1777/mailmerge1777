import { AppState } from '../App';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useState } from 'react';

export function Step4Email({ state, setState, isOffline }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>>, isOffline?: boolean }) {
    const navigate = useNavigate();
    const [rawHtmlMode, setRawHtmlMode] = useState(false);

    const updateEmail = (key: string, value: any) => {
        setState(p => ({
            ...p,
            configEmail: { ...p.configEmail, [key]: value }
        }));
    };

    const updatePdf = (key: string, value: any) => {
        setState(p => ({
            ...p,
            opzioniPdf: { ...p.opzioniPdf, [key]: value }
        }));
    };

    const handleNext = async () => {
        // Save config implicitly
        try {
            await apiClient.post('/config', {
                email: state.configEmail,
                pdf: { opzioni: state.opzioniPdf }
            });
        } catch (e) {
            console.error("Non sono riuscito a salvare la conf", e);
        }
        navigate('/step5');
    };

    const insertPlaceholder = (ph: string, field: 'oggetto' | 'html' | 'testo' | 'firma') => {
         updateEmail(field, state.configEmail[field] + `{{${ph}}}`);
    };

    const placeholders = state.colonneRilevate.concat(state.campiDerivati);

    return (
        <div className="bg-[#0f172a]/40 p-6 md:p-8 rounded-xl shadow-sm border border-white/5">
          <h2 className="text-2xl font-bold mb-2">Composizione Email & Opzioni PDF</h2>
          <p className="text-[#94a3b8] mb-8">Personalizza il testo dell'email. Usa i placeholder per inserire dati specifici del cliente.</p>

          <div className="space-y-6">
              <div>
                  <label className="block text-sm font-semibold mb-1">Oggetto dell'email</label>
                  <div className="flex gap-2 mb-2">
                       <select className="border border-white/10 bg-slate-950/50 text-white rounded px-2 py-1 text-sm bg-slate-900/60" onChange={e => { if(e.target.value) insertPlaceholder(e.target.value, 'oggetto'); e.target.value=''; }}>
                           <option value="">Inserisci campo...</option>
                           {placeholders.map(p => <option key={p} value={p}>{p}</option>)}
                       </select>
                  </div>
                  <input 
                      type="text" 
                      className="w-full border border-white/10 bg-slate-950/50 text-white rounded p-2 focus:ring-[#10b981] outline-none transition" 
                      value={state.configEmail.oggetto} 
                      onChange={e => updateEmail('oggetto', e.target.value)} 
                  />
              </div>

              <div>
                  <div className="flex justify-between items-end mb-1">
                      <label className="block text-sm font-semibold">Corpo Email (HTML)</label>
                      <label className="text-xs flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={rawHtmlMode} onChange={e => setRawHtmlMode(e.target.checked)} />
                          Visualizza HTML grezzo
                      </label>
                  </div>
                  <div className="flex gap-2 mb-2">
                       <select className="border border-white/10 bg-slate-950/50 text-white rounded px-2 py-1 text-sm bg-slate-900/60" onChange={e => { if(e.target.value) insertPlaceholder(e.target.value, 'html'); e.target.value=''; }}>
                           <option value="">Inserisci campo...</option>
                           {placeholders.map(p => <option key={p} value={p}>{p}</option>)}
                       </select>
                  </div>
                  <textarea 
                      className="w-full border border-white/10 bg-slate-950/50 text-white rounded p-3 h-48 font-mono text-sm focus:ring-[#10b981] outline-none" 
                      value={state.configEmail.html} 
                      onChange={e => updateEmail('html', e.target.value)} 
                      placeholder="<p>Gentile {{RAGIONE SOCIALE}},</p>"
                  />
              </div>

              <div>
                  <label className="block text-sm font-semibold mb-1">Corpo Email (Plain Text)</label>
                  <p className="text-xs text-[#94a3b8] mb-2">Alternativa per client mail non HTML</p>
                  <div className="flex gap-2 mb-2">
                       <select className="border border-white/10 bg-slate-950/50 text-white rounded px-2 py-1 text-sm bg-slate-900/60" onChange={e => { if(e.target.value) insertPlaceholder(e.target.value, 'testo'); e.target.value=''; }}>
                           <option value="">Inserisci campo...</option>
                           {placeholders.map(p => <option key={p} value={p}>{p}</option>)}
                       </select>
                  </div>
                  <textarea 
                      className="w-full border border-white/10 bg-slate-950/50 text-white rounded p-3 h-32 focus:ring-[#10b981] outline-none" 
                      value={state.configEmail.testo} 
                      onChange={e => updateEmail('testo', e.target.value)} 
                  />
              </div>

              <div className="pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-semibold">Firma Email</label>
                      <label className="text-sm flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={state.configEmail.includiFirma} onChange={e => updateEmail('includiFirma', e.target.checked)} className="accent-[#10b981] w-4 h-4" />
                          Includi firma in coda
                      </label>
                  </div>
                  {state.configEmail.includiFirma && (
                      <textarea 
                          className="w-full border border-white/10 bg-slate-950/50 text-white rounded p-3 h-24 font-mono text-sm focus:ring-[#10b981] outline-none" 
                          value={state.configEmail.firma} 
                          onChange={e => updateEmail('firma', e.target.value)} 
                      />
                  )}
              </div>

              <div className="pt-6 border-t border-white/5">
                   <h3 className="text-sm font-semibold mb-3">Opzioni Sicurezza PDF</h3>
                   <div className="space-y-4">
                       <label className="flex items-start gap-3 cursor-pointer">
                           <input type="checkbox" checked={state.opzioniPdf.appiattisciCampiDato} onChange={e => updatePdf('appiattisciCampiDato', e.target.checked)} className="mt-1 w-4 h-4 accent-[#10b981]" />
                           <div>
                               <div className="font-medium text-white">Blocca i dati che abbiamo inserito noi (campi aziendali)</div>
                               <div className="text-sm text-[#94a3b8]">I dati come nome, indirizzo e punti verranno bloccati nel PDF. Il destinatario non potrà modificarli.</div>
                           </div>
                       </label>

                       <label className="flex items-start gap-3 cursor-pointer">
                           <input type="checkbox" checked={state.opzioniPdf.appiattisciCampiCliente} onChange={e => updatePdf('appiattisciCampiCliente', e.target.checked)} className="mt-1 w-4 h-4 accent-[#10b981]" />
                           <div>
                               <div className="font-medium text-white">Blocca anche i campi che deve compilare il destinatario</div>
                               <div className="text-sm text-[#94a3b8]">Attenzione: se attivo, il destinatario non potrà inserire firma e data nel PDF.</div>
                               {state.opzioniPdf.appiattisciCampiCliente && <div className="text-sm text-amber-500 font-medium mt-1">Avviso: Il documento sarà in sola lettura per tutti.</div>}
                           </div>
                       </label>
                   </div>
              </div>
          </div>

          <div className="flex justify-between pt-8 mt-8 border-t border-white/5">
              <button onClick={() => navigate('/step3')} className="text-slate-400 hover:text-white font-medium px-4 py-2">
                  Indietro
              </button>
              <button 
                  onClick={handleNext}
                  disabled={isOffline}
                  title={isOffline ? "Avvia prima il server locale — vedi la barra rossa in cima alla pagina" : ""}
                  className="bg-[#10b981] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  Continua alla Configurazione
              </button>
          </div>
        </div>
    );
}
