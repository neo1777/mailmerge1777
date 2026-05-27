import { ReportParsing } from '../../types';
import { Mail, UserCircle2, Settings2, FileWarning } from 'lucide-react';

interface Props {
  report: ReportParsing;
  allHeaders?: string[];
  onChangeMapping?: (field: string, newHeaderIndex: number | null) => void;
}

export function ParseReport({ report, allHeaders, onChangeMapping }: Props) {
  return (
    <div className="space-y-6 mt-6 max-w-4xl">
      {/* SEZIONE 3 - AVVISI IMPORTANTI */}
      <div className="space-y-3">
        {report.righeScartate.length > 0 && (
          <div className="bg-rose-950/40 border border-rose-600/30 rounded-lg p-4 flex gap-4">
            <FileWarning className="text-rose-500 shrink-0" size={24} />
            <div>
              <h4 className="font-semibold text-rose-500">
                Righe scartate: {report.righeScartate.length} (valide: {report.righeValide})
              </h4>
              <p className="text-sm text-rose-200/80 mt-1">
                Alcune righe presentano errori bloccanti (es. Ragione Sociale vuota o Email non valida).
              </p>
              <div className="mt-2 text-xs text-rose-300 max-h-32 overflow-y-auto w-full break-normal">
                {report.righeScartate.slice(0, 10).map((r, i) => (
                  <div key={i} className="mb-1 truncate"><strong>Riga {r.riga}:</strong> {r.motivo}</div>
                ))}
                {report.righeScartate.length > 10 && <div className="mt-1 opacity-70">... e altre {report.righeScartate.length - 10} righe.</div>}
              </div>
            </div>
          </div>
        )}

        {!report.emailDisponibile && (
          <div className="bg-amber-950/40 border border-amber-600/30 rounded-lg p-4 flex gap-4">
            <Mail className="text-amber-500 shrink-0" size={24} />
            <div>
              <h4 className="font-semibold text-amber-500">Colonna email non trovata nel file</h4>
              <p className="text-sm text-amber-200/80 mt-1">
                La modalità <strong>Invia Email</strong> non sarà disponibile per questa sessione. Solo la generazione file e stampa sarà attiva.
                Per usarla in futuro, aggiungi una colonna "E-MAIL" al file Excel.
              </p>
            </div>
          </div>
        )}

        {report.agenteDisponibile && (
          <div className="bg-emerald-950/40 border border-emerald-600/30 rounded-lg p-4 flex gap-4">
            <UserCircle2 className="text-emerald-500 shrink-0" size={24} />
            <div>
              <h4 className="font-semibold text-emerald-500">Trovati {report.agenti.length} agenti</h4>
              <p className="text-sm text-emerald-200/80 mt-1">
                La modalità di raggruppamento per agente è disponibile nello Step 5.
                Potrai generare un PDF unificato per ogni agente invece di centinaia di file singoli.
              </p>
            </div>
          </div>
        )}

        {report.campiMancanti.length > 0 && (
          <div className="bg-rose-950/40 border border-rose-600/30 rounded-lg p-4 flex gap-4">
            <FileWarning className="text-rose-500 shrink-0" size={24} />
            <div>
              <h4 className="font-semibold text-rose-500">Campi richiesti mancanti: {report.campiMancanti.join(', ')}</h4>
              <p className="text-sm text-rose-200/80 mt-1">
                Queste colonne sono obbligatorie. Impossibile procedere senza di esse.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SEZIONE 1 - MAPPATURA COLONNE */}
        <div className="bg-slate-900/50 rounded-xl border border-white/10 p-5">
           <h3 className="text-lg text-slate-300 font-bold mb-4 flex items-center gap-2">
               <Settings2 size={18} /> Rilevamento Colonne
           </h3>
           <div className="space-y-2 text-sm text-slate-400">
               {Object.entries(report.colonneRilevate).map(([campo, obj]) => {
                   const friendlyNames: Record<string, string> = {
                       email: 'Email',
                       ragioneSociale: 'Ragione Sociale',
                       indirizzo: 'Indirizzo',
                       cap: 'CAP',
                       localita: 'Località',
                       provincia: 'Provincia',
                       punti: 'Punti',
                       codice: 'Codice Cliente',
                       codiceAgente: 'Cod. Agente',
                       nomeAgente: 'Nome Agente'
                   };
                   const nome = friendlyNames[campo] || campo;
                   return (
                       <div key={campo} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                           <span className="font-medium">{nome}</span>
                           
                           {Array.isArray(allHeaders) && onChangeMapping ? (
                               <select 
                                   className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-300 ml-2 flex-grow max-w-[250px]"
                                   value={obj?.indice?.toString() ?? ""}
                                   onChange={(e) => {
                                       const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                                       onChangeMapping(campo, val);
                                   }}
                               >
                                   <option value="">-- Ignora / Non assegnata --</option>
                                   {allHeaders.map((header, idx) => (
                                       <option key={idx} value={idx} className={obj?.indice === idx ? "font-bold text-emerald-400" : ""}>
                                           (col {idx + 1}) {header || `Colonna vuota ${idx + 1}`}
                                       </option>
                                   ))}
                               </select>
                           ) : obj ? (
                               <span className="text-emerald-400 flex items-center gap-2">
                                  <span className="text-slate-500 text-xs">(col. {obj.indice + 1})</span>
                                  {obj.nomeOriginale} ✅
                               </span>
                           ) : (
                               <span className="text-slate-600">Non trovata ⚠️</span>
                           )}
                       </div>
                   );
               })}
           </div>
        </div>

        {/* SEZIONE 2 - CORREZIONI */}
        {report.correzioniAutomatiche.length > 0 && (
          <div className="bg-slate-900/50 rounded-xl border border-white/10 p-5">
             <h3 className="text-lg text-slate-300 font-bold mb-4 flex items-center gap-2">
                 <Settings2 size={18} /> Pulizia Dati Applicata
             </h3>
             <div className="space-y-3">
                 {report.correzioniAutomatiche.map((c, i) => (
                     <div key={i} className="flex items-start gap-3 bg-slate-950/50 p-2.5 rounded border border-white/5">
                         <span className="text-amber-500 mt-0.5">🔧</span>
                         <div>
                            <div className="text-slate-300 font-medium text-sm">
                                {c.descrizione}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                                Applicato su <strong>{c.count}</strong> valori
                            </div>
                         </div>
                     </div>
                 ))}
             </div>
          </div>
        )}
      </div>

      {/* SEZIONE 4 - AGENTI */}
      {report.agenteDisponibile && report.agenti.length > 0 && (
        <div className="bg-slate-900/50 rounded-xl border border-white/10 p-5">
           <h3 className="text-lg text-slate-300 font-bold mb-4 flex items-center gap-2">
               <UserCircle2 size={18} /> Struttura Agenti
           </h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
               {report.agenti.map(a => (
                   <div key={a.codice} className="bg-black/30 rounded p-3 border border-white/5">
                       <div className="text-sm font-bold text-slate-300 truncate" title={a.nome}>{a.nome}</div>
                       <div className="text-xs text-slate-500 mt-1 flex justify-between">
                           <span>Codice: {a.codice}</span>
                           <span className="text-emerald-500">{a.count} clienti</span>
                       </div>
                       <div className="w-full bg-slate-800 rounded-full h-1 mt-2">
                           <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${Math.max(2, (a.count / report.totaleRighe) * 100)}%` }}></div>
                       </div>
                   </div>
               ))}
           </div>
        </div>
      )}
    </div>
  );
}
