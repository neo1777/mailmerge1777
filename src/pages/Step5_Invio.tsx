import { AppState } from '../App';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, HardDrive, Users } from 'lucide-react';
import { ModalitaOperativa, OpzioniOutput } from '../types';

export function Step5Invio({ state, setState, isOffline }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>>, isOffline?: boolean }) {
    const navigate = useNavigate();
    
    // Default to the first found configuration or standard
    const [modalita, setModalita] = useState<ModalitaOperativa>('file');

    const [smtp, setSmtp] = useState({
        host: '', port: 465, secure: true, username: '', password: '', mittente: '', rejectUnauthorized: false, passwordConfigurata: false
    });
    const [rateLimiting, setRateLimiting] = useState({
        emailsPerBatch: 30, pausaTraEmailMs: 3000, pausaTraBatchMs: 600000, maxEmailPerOra: 100
    });
    
    const [opzioniOutput, setOpzioniOutput] = useState<OpzioniOutput>({
        comprimi: false,
        cartellaBase: './output',
        raggruppaPerAgente: false,
        creaRiepilogoAgente: false,
        includiSingoli: true
    });

    const [testOk, setTestOk] = useState<boolean | null>(null);
    const [testError, setTestError] = useState('');
    const [testing, setTesting] = useState(false);
    
    const [dryRun, setDryRun] = useState(false);
    const [resume, setResume] = useState(false);
    const [sending, setSending] = useState(false);
    
    const [diskSpace, setDiskSpace] = useState({ free: 0, size: 0 });
    const [hasPreviousLog, setHasPreviousLog] = useState(false);

    useEffect(() => {
        apiClient.get<any>('/config').then(data => {
            if (data.smtp) setSmtp(prev => ({...prev, ...data.smtp, password: ''}));
            if (data.rateLimiting) setRateLimiting(data.rateLimiting);
        });
        
        apiClient.get<any>('/system/disk').then(data => {
            setDiskSpace(data);
        }).catch(err => console.error("Error fetching disk space", err));
        
        apiClient.get<any[]>('/log').then(data => {
            if (data && data.length > 0) setHasPreviousLog(true);
        }).catch(() => setHasPreviousLog(false));
    }, []);

    const diskSpaceMB = diskSpace.free / (1024 * 1024);
    const isDiskWarning = diskSpaceMB > 0 && diskSpaceMB < 500; // < 500MB free

    // Calcolo dimensioni
    const countClienti = state.destinatari.length;
    let estimatedPdfSizeMB = countClienti * 0.15;
    let computedCartelle = countClienti;
    let targetPdf = countClienti;

    if (modalita === 'file' && state.reportParsing?.agenteDisponibile) {
         if (opzioniOutput.creaRiepilogoAgente) {
             targetPdf += state.reportParsing.agenti.length; // I PDF unificati
             estimatedPdfSizeMB += countClienti * 0.15; // I PDF unificati pesano approx come la somma (o meno)
         }
         if (opzioniOutput.includiSingoli === false) {
             targetPdf -= countClienti; // Non creiamo i PDF singoli
             computedCartelle = 0; // O la struttura base
             estimatedPdfSizeMB -= countClienti * 0.15;
         }
    }

    const testConnection = async () => {
        setTesting(true);
        setTestOk(null);
        setTestError('');
        try {
            await apiClient.post('/config', { smtp }); // save config first so password is saved if provided
            const res = await apiClient.post<any>('/email/test-smtp', smtp);
            if (res.ok) setTestOk(true);
            else { setTestOk(false); setTestError(res.error); }
        } catch(e: any) {
            setTestOk(false); setTestError(e.message);
        } finally {
            setTesting(false);
        }
    };

    const runJobEmail = async () => {
        setSending(true);
        try {
            await apiClient.post('/config', { smtp, rateLimiting });
            
            await apiClient.post('/email/send', {
                destinatari: state.destinatari,
                mapping: state.mapping,
                templatePath: state.templatePdf.serverPath,
                allegatiStatici: state.allegatiStatici.map(x => ({ nome: x.name, path: x.serverPath })),
                configEmail: state.configEmail,
                configSmtp: smtp,
                configRateLimiting: rateLimiting,
                opzioniPdf: state.opzioniPdf,
                dryRun,
                resume
            });
            
            navigate('/step6', { state: { modalita: 'email' } });
        } catch(e: any) {
             setTestError(e.message);
        } finally {
            setSending(false);
        }
    };

    const runJobFile = async () => {
        setSending(true);
        try {
            await apiClient.post('/output/generate', {
                destinatari: state.destinatari,
                mapping: state.mapping,
                pdfTemplatePath: state.templatePdf.serverPath,
                configEmail: state.configEmail,
                opzioniPdf: state.opzioniPdf,
                opzioniOutput
            });
            navigate('/step6', { state: { modalita: 'file' } });
        } catch(e: any) {
            setTestError(e.message);
        } finally {
            setSending(false);
        }
    }

    const runJob = () => {
        if (modalita === 'file') {
            const folderCountMsg = opzioniOutput.includiSingoli !== false ? `Verranno create ${state.destinatari.length} cartelle individuali` : `Nessuna cartella cliente verrà creata (solo riepilogo)`;
            if (window.confirm(`${folderCountMsg} in ${opzioniOutput.cartellaBase}. Confermi?`)) {
                runJobFile();
            }
        } else {
            runJobEmail();
        }
    };

    const isAvvioDisabled = sending || isOffline || (modalita === 'email' && !testOk && !dryRun) || (modalita === 'email' && !state.reportParsing?.emailDisponibile);
    let avvioTitle = "";
    if (isOffline) {
        avvioTitle = "Avvia prima il server locale — vedi la barra rossa in cima alla pagina";
    } else if (modalita === 'email' && !state.reportParsing?.emailDisponibile) {
        avvioTitle = "Bloccato. Impossibile inviare email senza una colonna EMAIL.";
    } else if (modalita === 'email' && !testOk && !dryRun) {
        avvioTitle = "Effettua prima il test SMTP";
    }

    return (
        <div className="bg-[#0f172a]/40 p-6 md:p-8 rounded-xl shadow-sm border border-white/5">
          <h2 className="text-2xl font-bold mb-2">Configurazione {modalita === 'email' ? 'Invio' : 'Output'}</h2>
          <p className="text-[#94a3b8] mb-8">Scegli la modalità operativa e configura i parametri.</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => setModalita('email')}
              className={`p-5 rounded-xl border-2 text-left transition-all ${
                modalita === 'email'
                  ? 'border-red-600 bg-red-950/40'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="text-2xl mb-2">📧</div>
              <div className="font-semibold text-white">Invia via Email</div>
              <div className="text-sm text-gray-400 mt-1">
                Compila il PDF e invia una email personalizzata a ogni destinatario
              </div>
            </button>

            <button
              onClick={() => setModalita('file')}
              className={`p-5 rounded-xl border-2 text-left transition-all ${
                modalita === 'file'
                  ? 'border-red-600 bg-red-950/40'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="text-2xl mb-2">📁</div>
              <div className="font-semibold text-white">Genera File</div>
              <div className="text-sm text-gray-400 mt-1">
                Crea una cartella per ogni destinatario con il PDF compilato e il testo dell'email
              </div>
            </button>
          </div>

          {modalita === 'email' && !state.reportParsing?.emailDisponibile && (
              <div className="bg-rose-950/50 border border-rose-500/50 p-6 rounded-xl mb-8 flex items-start gap-4">
                  <AlertCircle size={32} className="text-rose-500 shrink-0" />
                  <div>
                      <h3 className="text-xl font-bold text-rose-500">Impossibile usare questa modalità</h3>
                      <p className="text-rose-200 mt-2">
                          Nel file Excel/CSV caricato non è stata rilevata la colonna "E-MAIL". 
                          Per usare la modalità "Invia via Email", devi tornare allo Step 1 e caricare un file che contenga un indirizzo email per ogni riga.
                      </p>
                  </div>
              </div>
          )}

          {modalita === 'file' && (
            <div className="space-y-6 mb-8">
              <h3 className="text-lg font-semibold text-white">Configurazione output</h3>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Cartella base (sul PC server) dove salvare i file
                </label>
                <input
                  type="text"
                  value={opzioniOutput.cartellaBase}
                  onChange={e => setOpzioniOutput(v => ({ ...v, cartellaBase: e.target.value }))}
                  placeholder="./output"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Verrà creata in automatico una sottocartella timestampata es. `output/20261011_143000/` per i salvataggi.
                </p>
              </div>

              {state.reportParsing?.agenteDisponibile === true && (
                  <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-2 mb-2 border-b border-emerald-500/20 pb-3">
                          <Users className="text-emerald-500" size={20} />
                          <h4 className="font-semibold text-emerald-100">Impostazioni Agenti (Trovati {state.reportParsing.agenti.length})</h4>
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer group">
                          <input type="checkbox" checked={opzioniOutput.raggruppaPerAgente} onChange={e=>setOpzioniOutput(v=>({...v, raggruppaPerAgente: e.target.checked}))} className="mt-1 accent-emerald-500 w-4 h-4"/>
                          <div>
                              <div className="font-medium text-white group-hover:text-emerald-400">Raggruppa file in sottocartelle per agente</div>
                              <div className="text-sm text-slate-400 mt-0.5">I singoli clienti verranno raggruppati all'interno di una cartella `[codAg.]_[NomeAg.]/` invece che tutti sciolti insieme.</div>
                          </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer group">
                          <input type="checkbox" checked={opzioniOutput.creaRiepilogoAgente} onChange={e=>setOpzioniOutput(v=>({...v, creaRiepilogoAgente: e.target.checked, raggruppaPerAgente: e.target.checked ? true : v.raggruppaPerAgente}))} className="mt-1 accent-emerald-500 w-4 h-4"/>
                          <div>
                              <div className="font-medium text-white group-hover:text-emerald-400">Genera PDF unificato riepilogativo per l'agente</div>
                              <div className="text-sm text-slate-400 mt-0.5">Unisci tutti i PDF dei clienti di ogni singolo agente in un unico grande file PDF da stampare comodamente.</div>
                          </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer group ml-6">
                          <input type="checkbox" disabled={!opzioniOutput.creaRiepilogoAgente && !opzioniOutput.raggruppaPerAgente} checked={opzioniOutput.includiSingoli} onChange={e=>setOpzioniOutput(v=>({...v, includiSingoli: e.target.checked}))} className="mt-1 accent-emerald-500 w-4 h-4 disabled:opacity-50"/>
                          <div className={(!opzioniOutput.creaRiepilogoAgente && !opzioniOutput.raggruppaPerAgente) ? "opacity-50" : ""}>
                              <div className="font-medium text-white group-hover:text-emerald-400">Mantieni anche le cartelle individuali (PDF + TXT singolo)</div>
                              <div className="text-sm text-slate-400 mt-0.5">Deseleziona per **non** salvare i singoli clienti e generare ESCLUSIVAMENTE i PDF unificati degli agenti.</div>
                          </div>
                      </label>
                  </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg">
                <input
                  type="checkbox"
                  id="comprimi"
                  checked={opzioniOutput.comprimi}
                  onChange={e => setOpzioniOutput(v => ({ ...v, comprimi: e.target.checked }))}
                  className="mt-1 accent-red-600 w-4 h-4"
                />
                <div>
                  <label htmlFor="comprimi" className="font-medium text-white cursor-pointer hover:text-red-400">
                    Comprimi tutto in un unico file ZIP al termine
                  </label>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Alla fine del processo renderà scaricabile da UI tutto il blocco.
                  </p>
                </div>
              </div>
            </div>
          )}

          {modalita === 'email' && state.reportParsing?.emailDisponibile && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                 <div>
                     <h3 className="text-lg font-semibold mb-4 border-b pb-2">Server SMTP</h3>
                     <div className="space-y-4 text-sm">
                          <label className="block">
                              <span className="font-medium text-slate-300">Host Server</span>
                              <input type="text" className="w-full border border-white/10 bg-slate-950/50 text-white rounded p-2 mt-1" value={smtp.host} onChange={e=>setSmtp({...smtp, host: e.target.value})} placeholder="smtps.aruba.it" />
                          </label>
                          <div className="flex gap-4">
                              <label className="block w-1/3">
                                  <span className="font-medium text-slate-300">Porta</span>
                                  <input type="number" className="w-full border border-white/10 bg-slate-950/50 text-white rounded p-2 mt-1" value={smtp.port} onChange={e=>setSmtp({...smtp, port: Number(e.target.value)})} />
                              </label>
                              <label className="block w-2/3 mt-6">
                                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                                      <input type="checkbox" checked={smtp.secure} onChange={e=>setSmtp({...smtp, secure: e.target.checked})} className="accent-[#10b981] w-4 h-4"/>
                                      <span>Connessione Sicura (SSL/TLS)</span>
                                  </label>
                              </label>
                          </div>
                          <label className="block">
                              <span className="font-medium text-slate-300">Indirizzo Mittente</span>
                              <input type="email" className="w-full border border-white/10 bg-slate-950/50 text-white rounded p-2 mt-1" value={smtp.mittente} onChange={e=>setSmtp({...smtp, mittente: e.target.value})} placeholder="customer.service@yourcompany.com" />
                          </label>
                          <label className="block">
                              <span className="font-medium text-slate-300">Username</span>
                              <input type="text" className="w-full border border-white/10 bg-slate-950/50 text-white rounded p-2 mt-1" value={smtp.username} onChange={e=>setSmtp({...smtp, username: e.target.value})} />
                          </label>
                          <label className="block">
                              <span className="font-medium text-slate-300">Password {smtp.passwordConfigurata && !smtp.password && "(Già salvata)"}</span>
                              <input type="password" className="w-full border border-white/10 bg-slate-950/50 text-white rounded p-2 mt-1" value={smtp.password} onChange={e=>setSmtp({...smtp, password: e.target.value})} placeholder={smtp.passwordConfigurata ? "Inserisci per modificare" : "Richiesta"} />
                          </label>
                          <button onClick={testConnection} disabled={testing} className="w-full bg-slate-800/50 hover:bg-slate-700 text-slate-200 font-medium py-2 rounded transition">
                              {testing ? 'Test in corso...' : 'Testa Connessione SMTP'}
                          </button>

                          {testOk === true && <div className="text-[#10b981] flex items-center gap-1 mt-2 font-medium"><CheckCircle size={16}/> Connessione riuscita</div>}
                          {testOk === false && <div className="text-rose-500 flex items-start gap-1 mt-2 text-xs"><AlertCircle size={16} className="shrink-0"/> <span>{testError}</span></div>}
                     </div>
                 </div>

                 <div>
                     <h3 className="text-lg font-semibold mb-4 border-b pb-2">Rate Limiting</h3>
                     <p className="text-xs text-[#94a3b8] mb-4">Evita di essere segnalato come spam limitando la velocità di invio.</p>
                     <div className="space-y-6 text-sm">
                          <label className="block">
                              <div className="flex justify-between font-medium text-slate-300 mb-2"><span>Email per batch:</span> <span>{rateLimiting.emailsPerBatch}</span></div>
                              <input type="range" min="1" max="100" className="w-full accent-[#10b981]" value={rateLimiting.emailsPerBatch} onChange={e=>setRateLimiting({...rateLimiting, emailsPerBatch: Number(e.target.value)})} />
                          </label>
                          <label className="block">
                              <div className="flex justify-between font-medium text-slate-300 mb-2"><span>Pausa tra ogni email:</span> <span>{(rateLimiting.pausaTraEmailMs / 1000).toFixed(1)} s</span></div>
                              <input type="range" min="0" max="10000" step="500" className="w-full accent-[#10b981]" value={rateLimiting.pausaTraEmailMs} onChange={e=>setRateLimiting({...rateLimiting, pausaTraEmailMs: Number(e.target.value)})} />
                          </label>
                          <label className="block">
                              <div className="flex justify-between font-medium text-slate-300 mb-2"><span>Pausa tra batch:</span> <span>{(rateLimiting.pausaTraBatchMs / 60000).toFixed(1)} min</span></div>
                              <input type="range" min="0" max="1800000" step="60000" className="w-full accent-[#10b981]" value={rateLimiting.pausaTraBatchMs} onChange={e=>setRateLimiting({...rateLimiting, pausaTraBatchMs: Number(e.target.value)})} />
                          </label>

                          <div className="bg-slate-900/60 border border-white/5 rounded p-4 text-xs space-y-1">
                              <div className="font-semibold text-slate-300 mb-2">📊 Stima Invio</div>
                              <div>Per {state.destinatari.length} destinatari, verranno inviati {Math.ceil(state.destinatari.length / rateLimiting.emailsPerBatch)} batch.</div>
                              <div>Tempo totale stimato: ~{Math.ceil(((state.destinatari.length * rateLimiting.pausaTraEmailMs) + (Math.ceil(state.destinatari.length / rateLimiting.emailsPerBatch) * rateLimiting.pausaTraBatchMs)) / 60000)} minuti.</div>
                          </div>
                     </div>
                 </div>
            </div>
          )}

          <div className="rounded-xl overflow-hidden border border-white/5 mb-8">
               <div className="bg-slate-900/60 flex items-center justify-between p-4 border-b border-white/5">
                   <h3 className="font-semibold">Riepilogo finale</h3>
               </div>
               
               {modalita === 'email' ? (
                 <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                     <div><div className="text-[#94a3b8]">Destinatari</div><div className="font-bold text-lg">{state.destinatari.length}</div></div>
                     <div><div className="text-[#94a3b8]">PDF da AcroForm</div><div className="font-bold text-lg">{state.destinatari.length}</div></div>
                     <div><div className="text-[#94a3b8]">Allegati statici</div><div className="font-bold text-lg">{state.allegatiStatici.length}</div></div>
                     <div><div className="text-[#94a3b8]">Modalità</div><div className="font-bold text-lg text-[#10b981]">{dryRun ? 'DRY RUN' : 'INVIO REALE'}</div></div>
                 </div>
               ) : (
                 <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre bg-black text-emerald-400">
                    <div>Pronti alla generazione     : {new Date().toLocaleDateString('it-IT')}</div>
                    <div>────────────────────────────────────────</div>
                    <div>Destinatari nel DB          : {countClienti}</div>
                    {opzioniOutput.includiSingoli !== false && (
                    <div>Cartelle Singole Clienti  : {computedCartelle}</div>
                    )}
                    {opzioniOutput.creaRiepilogoAgente && (
                    <div className="text-emerald-300">PDF Unificati Agent       : {state.reportParsing?.agenti.length}</div>
                    )}
                    <div>Totale PDF da compilare   : {targetPdf}</div>
                    {opzioniOutput.includiSingoli !== false && (
                    <div>File TXT (Email Body)     : {countClienti}</div>
                    )}
                    <div>ZIP Finale su server      : {opzioniOutput.comprimi ? 'Attivo' : 'Spento'}</div>
                    <div>────────────────────────────────────────</div>
                 </div>
               )}
               {isDiskWarning && (
                   <div className="p-4 bg-amber-500/10 border-t border-amber-500/20 text-amber-500 flex items-start gap-2 text-sm">
                       <HardDrive size={18} className="shrink-0 mt-0.5" />
                       <div>
                           <span className="font-bold">Spazio su disco in esaurimento ({diskSpaceMB.toFixed(0)} MB rimanenti).</span> L'operazione genererà circa {estimatedPdfSizeMB.toFixed(1)} MB di PDF. Assicurati di avere spazio a sufficienza.
                       </div>
                   </div>
               )}
          </div>

          {modalita === 'email' && state.reportParsing?.emailDisponibile && (
            <div className="flex flex-col gap-3 mb-8">
                 <label className="flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors bg-[#0f172a]/40 border-amber-500/20 hover:bg-amber-500/10">
                      <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} className="w-5 h-5 accent-orange-500" />
                      <div>
                          <div className="font-bold text-amber-300">Usa modalità Dry Run (Simulazione)</div>
                          <div className="text-sm text-amber-400">Genera i PDF e crea i log, ma NON invia nessuna email reale. Usalo per testare.</div>
                      </div>
                 </label>
                 <label className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${hasPreviousLog ? 'cursor-pointer bg-[#0f172a]/40 border-sky-500/20 hover:bg-sky-500/10' : 'cursor-not-allowed bg-slate-900/40 border-white/5 opacity-50'}`} title={!hasPreviousLog ? "Nessun invio precedente trovato" : ""}>
                      <input type="checkbox" disabled={!hasPreviousLog} checked={resume && hasPreviousLog} onChange={e => setResume(e.target.checked)} className="w-5 h-5 accent-blue-500 disabled:cursor-not-allowed" />
                      <div>
                          <div className="font-bold text-sky-300">Riprendi da precedente</div>
                          <div className="text-sm text-sky-400">Salta i destinatari che risultano "SUCCESSO" nell'ultimo log CSV.</div>
                      </div>
                 </label>
            </div>
          )}

          <div className="flex justify-between pt-8 border-t border-white/5">
              <button disabled={sending} onClick={() => navigate('/step4')} className="text-slate-400 hover:text-white font-medium px-4 py-2">
                  Indietro
              </button>
              <button 
                  onClick={runJob}
                  disabled={isAvvioDisabled}
                  title={avvioTitle}
                  className="bg-[#10b981] text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-emerald-700 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {sending ? (modalita === 'file' ? 'Generazione...' : 'Avvio...') : modalita === 'file' ? 'Avvia Generazione' : dryRun ? 'Avvia Simulazione (Dry Run)' : 'Avvia Invio Massivo'}
              </button>
          </div>
        </div>
    );
}

