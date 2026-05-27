import { AppState } from '../App';
import { useJobPolling } from '../hooks/useJobPolling';
import { useBackendStatus } from '../hooks/useBackendStatus';
import { apiClient } from '../api/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle, PauseCircle, PlayCircle, Loader2, ServerCrash, Download, Folder } from 'lucide-react';
import { ModalitaOperativa } from '../types';

export function Step6Monitor({ state }: { state: AppState }) {
    const location = useLocation();
    const modalita = (location.state?.modalita as ModalitaOperativa) || 'email';
    
    const { job, error } = useJobPolling(modalita);
    const { status } = useBackendStatus();
    const navigate = useNavigate();

    const stopJob = async () => {
        try {
            await apiClient.post(modalita === 'email' ? '/email/stop' : '/output/status/current/stop', {});
        } catch(e) {
            console.error(e);
        }
    };

    if (!job) {
        return (
            <div className="bg-[#0f172a]/40 p-6 md:p-8 rounded-xl shadow-sm border border-white/5 text-center py-20">
                 {status === 'offline' ? (
                     <>
                         <ServerCrash size={32} className="text-red-500 mx-auto mb-4" />
                         <h2 className="text-xl font-bold text-red-400">Impossibile contattare il server locale</h2>
                         <p className="text-slate-400 mt-2">Avvia il server per vedere lo stato del job.</p>
                     </>
                 ) : (
                     <>
                         <Loader2 size={32} className="animate-spin text-[#10b981] mx-auto mb-4" />
                         <h2 className="text-xl font-bold">Avvio job in corso...</h2>
                     </>
                 )}
            </div>
        );
    }

    const isOffline = status === 'offline';
    
    if (modalita === 'file') {
        const fileJob = job as any;
        const completato = fileJob.stato === 'completato' || fileJob.stato === 'interrotto' || fileJob.stato === 'errore';
        return (
            <div className="bg-[#0f172a]/40 p-6 md:p-8 rounded-xl shadow-sm border border-white/5">
                {isOffline && (
                    <div className="mb-6 bg-red-950/50 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                        <ServerCrash className="text-red-400 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h3 className="text-red-400 font-bold">Connessione al server persa</h3>
                            <p className="text-red-200/80 text-sm mt-1">
                                Il server locale non è più raggiungibile. Se il processo era in corso, potrebbe essersi interrotto o essere andato in crash. 
                                Stiamo mostrando l'ultimo stato noto. Riaccendi il server e la connessione verrà ristabilita in automatico.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">Stato Generazione File</h2>
                        <p className="text-[#94a3b8]">
                            {fileJob.stato === 'in_corso' ? 'Generazione cartelle e PDF in corso...' : 
                             fileJob.stato === 'interrotto' ? 'Generazione interrotta.' : 
                             'Operazione completata.'}
                        </p>
                    </div>
                    {fileJob.stato === 'in_corso' && !isOffline && (
                        <button onClick={stopJob} className="flex items-center gap-2 bg-rose-500/20 text-rose-400 px-4 py-2 rounded font-medium hover:bg-red-200 transition">
                            <PauseCircle size={18} /> Ferma
                        </button>
                    )}
                </div>

                <div className="bg-slate-900/60 p-6 rounded-lg border border-white/5 mb-8">
                    <div className="flex justify-between font-bold text-slate-300 mb-2">
                        <span>{fileJob.percentuale}% Completato</span>
                        <span>{fileJob.processati + fileJob.errori} / {fileJob.totale} Cartelle</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-4 mb-6 relative overflow-hidden">
                        <div className="bg-[#10b981] h-4 rounded-full transition-all duration-500" style={{ width: `${fileJob.percentuale}%` }}></div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                         <div className="bg-[#0f172a]/40 rounded p-3 border border-white/5">
                             <div className="text-[#94a3b8] text-sm">Target Totale</div>
                             <div className="font-bold text-xl">{fileJob.totale}</div>
                         </div>
                         <div className="bg-[#0f172a]/40 rounded p-3 border border-white/5">
                             <div className="text-[#94a3b8] text-sm">Cartelle Create</div>
                             <div className="font-bold text-xl text-[#10b981]">{fileJob.processati}</div>
                         </div>
                         <div className="bg-[#0f172a]/40 rounded p-3 border border-white/5">
                             <div className="text-[#94a3b8] text-sm">Errori</div>
                             <div className="font-bold text-xl text-rose-500">{fileJob.errori}</div>
                         </div>
                         <div className="bg-[#0f172a]/40 rounded p-3 border border-white/5">
                             <div className="text-[#94a3b8] text-sm">Rimanenti</div>
                             <div className="font-bold text-xl">{fileJob.totale - fileJob.processati - fileJob.errori}</div>
                         </div>
                    </div>

                    {fileJob.stato === 'in_corso' && fileJob.agenteCorrente && (
                        <div className="mt-6 text-sm text-emerald-300 flex items-center gap-2 bg-emerald-950/30 p-3 rounded border border-emerald-500/20">
                             {!isOffline ? <Loader2 size={16} className="animate-spin text-emerald-500" /> : <ServerCrash size={16} className="text-red-400" />}
                             Elaborazione Agente: <span className="font-bold text-emerald-400">{fileJob.agenteCorrente.codice} - {fileJob.agenteCorrente.nome}</span> 
                             <span className="ml-auto text-emerald-500 font-mono">{fileJob.agenteCorrente.processati} / {fileJob.agenteCorrente.totale} completati</span>
                        </div>
                    )}
                </div>
                
                {completato && fileJob.zipDisponibile && (
                    <div className="mb-8 p-6 bg-gradient-to-r from-emerald-900/40 to-[#0f172a] rounded-xl border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        <div>
                            <h3 className="text-lg font-bold text-emerald-300 flex items-center gap-2">
                                <CheckCircle size={20} /> Generazione terminata
                            </h3>
                            <p className="text-sm text-emerald-100/70 mt-1">
                                L'archivio ZIP con tutte le cartelle è pronto per il download.
                            </p>
                        </div>
                        <a 
                            href={`${apiClient.getBaseUrl()}/output/download/zip?folder=${encodeURIComponent(fileJob.cartellaEsecuzione)}`}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                        >
                            <Download size={20} /> Scarica ZIP
                        </a>
                    </div>
                )}
                
                {completato && !fileJob.zipDisponibile && (
                    <div className="mb-8 p-4 bg-slate-900/60 rounded-xl border border-sky-500/20 text-sky-200 text-sm flex items-start gap-3">
                         <Folder size={20} className="shrink-0 text-sky-400 mt-0.5" />
                         <div className="w-full">
                             <div className="mb-2">Le cartelle sono state generate correttamente e si trovano sul server al percorso:</div>
                             <div className="font-mono bg-black/40 p-2 rounded border border-white/5">{fileJob.cartellaEsecuzione}</div>
                             
                             {fileJob.pdfAgentiGenerati && fileJob.pdfAgentiGenerati.length > 0 && (
                                 <div className="mt-4 border border-emerald-500/20 rounded p-3 bg-emerald-950/20">
                                     <div className="font-bold text-emerald-400 mb-2">PDF Unificati per Agente creati ({fileJob.pdfAgentiGenerati.length}):</div>
                                     <ul className="space-y-1">
                                         {fileJob.pdfAgentiGenerati.map((pdf: any, i: number) => (
                                             <li key={i} className="flex justify-between items-center text-emerald-200/80 bg-black/20 px-2 py-1.5 rounded">
                                                 <span className="font-mono truncate mr-3" title={pdf.nomeFile}>{pdf.nomeFile}</span>
                                                 <span className="shrink-0 bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded text-xs">{pdf.count} clienti</span>
                                             </li>
                                         ))}
                                     </ul>
                                 </div>
                             )}
                         </div>
                    </div>
                )}

                <div className="border border-white/5 rounded-lg overflow-hidden">
                     <div className="bg-slate-900/60 px-4 py-3 border-b border-white/5 font-medium text-slate-300">
                         Feed Eventi
                     </div>
                     <div className="h-64 overflow-y-auto w-full bg-[#000] border border-emerald-500/20 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] text-slate-600 font-mono text-xs p-4 space-y-1">
                         {fileJob.ultimiLog && fileJob.ultimiLog.map((log: any, i: number) => (
                             <div key={i} className="flex gap-4">
                                 <span className="text-[#94a3b8] shrink-0">[{log.ts ? new Date(log.ts).toLocaleTimeString() : ''}]</span>
                                 <span className={log.stato === 'SUCCESSO' ? 'text-emerald-400' : 'text-rose-400'}>
                                     {log.stato}
                                 </span>
                                 <span className="text-white">{log.cliente}</span>
                                 {log.errore && <span className="text-rose-400">({log.errore})</span>}
                             </div>
                         ))}
                         {(!fileJob.ultimiLog || fileJob.ultimiLog.length === 0) && <div className="text-[#94a3b8]">In attesa di eventi...</div>}
                     </div>
                </div>

                {completato && (
                    <div className="mt-8 flex justify-end">
                        <button onClick={() => navigate('/step1')} className="bg-sky-600 text-white px-6 py-2 rounded hover:bg-sky-700 transition font-medium">
                            Nuova Esecuzione
                        </button>
                    </div>
                )}
            </div>
        )
    }

    const { percentuale, stato, totale, inviati, errori, corrente, ultimiLog, dryRun } = job as any;
    const completato = stato === 'completato' || stato === 'interrotto' || stato === 'errore';

    return (
        <div className="bg-[#0f172a]/40 p-6 md:p-8 rounded-xl shadow-sm border border-white/5">
            {isOffline && (
                <div className="mb-6 bg-red-950/50 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                    <ServerCrash className="text-red-400 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h3 className="text-red-400 font-bold">Connessione al server persa</h3>
                        <p className="text-red-200/80 text-sm mt-1">
                            Il server locale non è più raggiungibile. Se il processo era in corso, potrebbe essersi interrotto o essere andato in crash. 
                            Stiamo mostrando l'ultimo stato noto. Riaccendi il server e la connessione verrà ristabilita in automatico.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Stato Invio {dryRun ? '(Dry Run)' : ''}</h2>
                    <p className="text-[#94a3b8]">
                        {stato === 'in_corso' ? 'Il processo è in corso, non chiudere questa pagina.' : 
                         stato === 'interrotto' ? 'Il processo è stato interrotto dall\'utente.' : 
                         'Il processo è terminato.'}
                    </p>
                </div>
                {stato === 'in_corso' && !isOffline && (
                    <button onClick={stopJob} className="flex items-center gap-2 bg-rose-500/20 text-rose-400 px-4 py-2 rounded font-medium hover:bg-red-200 transition">
                        <PauseCircle size={18} /> Ferma
                    </button>
                )}
            </div>

            <div className="bg-slate-900/60 p-6 rounded-lg border border-white/5 mb-8">
                <div className="flex justify-between font-bold text-slate-300 mb-2">
                    <span>{percentuale}% Qualificazione Completata</span>
                    <span>{inviati + errori} / {totale} Email</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-4 mb-6 relative overflow-hidden">
                    <div className="bg-[#10b981] h-4 rounded-full transition-all duration-500" style={{ width: `${percentuale}%` }}></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                     <div className="bg-[#0f172a]/40 rounded p-3 border border-white/5">
                         <div className="text-[#94a3b8] text-sm">Totale</div>
                         <div className="font-bold text-xl">{totale}</div>
                     </div>
                     <div className="bg-[#0f172a]/40 rounded p-3 border border-white/5">
                         <div className="text-[#94a3b8] text-sm">Inviate</div>
                         <div className="font-bold text-xl text-[#10b981]">{inviati}</div>
                     </div>
                     <div className="bg-[#0f172a]/40 rounded p-3 border border-white/5">
                         <div className="text-[#94a3b8] text-sm">Errori</div>
                         <div className="font-bold text-xl text-rose-500">{errori}</div>
                     </div>
                     <div className="bg-[#0f172a]/40 rounded p-3 border border-white/5">
                         <div className="text-[#94a3b8] text-sm">Rimanenti</div>
                         <div className="font-bold text-xl">{totale - inviati - errori}</div>
                     </div>
                </div>
                
                {stato === 'in_corso' && corrente && (
                    <div className="mt-6 text-sm text-slate-400 flex items-center gap-2">
                         {!isOffline ? <Loader2 size={16} className="animate-spin text-[#10b981]" /> : <ServerCrash size={16} className="text-red-400" />}
                         Sto elaborando: <span className="font-medium text-white">{corrente._email} ({corrente.ragioneSociale})</span>
                    </div>
                )}
            </div>

            <div className="border border-white/5 rounded-lg overflow-hidden">
                 <div className="bg-slate-900/60 px-4 py-3 border-b border-white/5 font-medium text-slate-300 flex justify-between items-center">
                     <span>Feed Eventi</span>
                     <a href={`${apiClient.getBaseUrl()}/log/download`} target="_blank" className="text-sm text-[#38bdf8] hover:underline">Scarica Log CSV</a>
                 </div>
                 <div className="h-64 overflow-y-auto w-full bg-[#000] border border-emerald-500/20 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] text-slate-600 font-mono text-xs p-4 space-y-1">
                     {ultimiLog && ultimiLog.map((log: any, i: number) => (
                         <div key={i} className="flex gap-4">
                             <span className="text-[#94a3b8] shrink-0">[{log.timestamp}]</span>
                             <span className={log.stato === 'SUCCESSO' || log.stato === 'DRY_RUN_OK' ? 'text-emerald-400' : log.stato === 'SALTATO' ? 'text-sky-400' : 'text-rose-400'}>
                                 {log.stato}
                             </span>
                             <span className="text-white">{log.email}</span>
                             {log.errore && <span className="text-rose-400">({log.errore})</span>}
                         </div>
                     ))}
                     {(!ultimiLog || ultimiLog.length === 0) && <div className="text-[#94a3b8]">In attesa di eventi...</div>}
                 </div>
            </div>

            {completato && (
                <div className="mt-8 flex justify-end">
                    <button onClick={() => navigate('/step1')} className="bg-sky-600 text-white px-6 py-2 rounded hover:bg-sky-700 transition font-medium">
                        Nuovo Invio
                    </button>
                </div>
            )}
        </div>
    );
}
