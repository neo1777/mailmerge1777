import { AppState } from '../../App';
import { useState, useEffect } from 'react';

export function MappingTable({ state, mapping, setMapping }: { state: AppState, mapping: any[], setMapping: (val: any[]) => void }) {
  
  useEffect(() => {
    if (mapping.length === 0 && state.campiPdf.length > 0) {
        // Init mapping based on name similarity
        const initialMap = state.campiPdf.map(pdfField => {
            const pdfNameLow = pdfField.nome.toLowerCase();
            const matchingCol = state.colonneRilevate.find(col => {
                 const colNameLow = col.toLowerCase().replace(/[^a-z0-9]/g, '');
                 return pdfNameLow.replace(/[^a-z0-9]/g, '').includes(colNameLow) || colNameLow.includes(pdfNameLow.replace(/[^a-z0-9]/g, ''));
            });
            const matchingDer = state.campiDerivati.find(col => {
                 const colNameLow = col.toLowerCase().replace(/[^a-z0-9]/g, '');
                 return pdfNameLow.replace(/[^a-z0-9]/g, '').includes(colNameLow) || colNameLow.includes(pdfNameLow.replace(/[^a-z0-9]/g, ''));
            });

            return {
                nomeCampoPdf: pdfField.nome,
                tipo: pdfField.tipo,
                colonnaInput: matchingCol || matchingDer || null,
                isDerivato: !!matchingDer,
            };
        });
        setMapping(initialMap);
    }
  }, [state.campiPdf, mapping, setMapping, state.colonneRilevate, state.campiDerivati]);

  if (mapping.length === 0) return <div>Attesa dei campi...</div>;

  const handleColChange = (nomeCampoPdf: string, value: string) => {
      const isDer = state.campiDerivati.includes(value);
      setMapping(mapping.map(m => m.nomeCampoPdf === nomeCampoPdf ? { ...m, colonnaInput: value || null, isDerivato: isDer } : m));
  };

  return (
    <div className="border border-white/5 rounded-lg overflow-hidden mt-4">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900/60 text-slate-300 font-medium border-b border-white/5">
          <tr>
             <th className="px-4 py-3">Campo PDF</th>
             <th className="px-4 py-3">Tipo</th>
             <th className="px-4 py-3">Colonna Dati</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
           {mapping.map((m, i) => (
               <tr key={i} className="hover:bg-slate-900/60">
                  <td className="px-4 py-3 font-medium text-white">{m.nomeCampoPdf}</td>
                  <td className="px-4 py-3">
                      {m.tipo === 'dato' ? <span className="bg-blue-100 text-sky-300 text-xs px-2 py-0.5 rounded">Dato Aziendale</span> 
                                         : <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded">Campo Cliente</span>}
                  </td>
                  <td className="px-4 py-3">
                      <select 
                          className="w-full border border-white/10 bg-slate-950/50 text-white rounded p-1.5 focus:ring-[#10b981] focus:border-[#10b981] outline-none"
                          value={m.colonnaInput || ''}
                          onChange={e => handleColChange(m.nomeCampoPdf, e.target.value)}
                      >
                          <option value="">-- Non abbinare --</option>
                          <optgroup label="Colonne dal File">
                              {state.colonneRilevate.map(c => <option key={c} value={c}>{c}</option>)}
                          </optgroup>
                          {state.campiDerivati.length > 0 && (
                              <optgroup label="Campi Calcolati">
                                  {state.campiDerivati.map(c => <option key={c} value={c}>{c}</option>)}
                              </optgroup>
                          )}
                      </select>
                  </td>
               </tr>
           ))}
        </tbody>
      </table>
    </div>
  );
}
