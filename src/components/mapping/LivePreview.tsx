import { useState } from 'react';
import { apiClient } from '../../api/client';

export function LivePreview({ state, mapping }: { state: any, mapping: any }) {
    const [pdfBase64, setPdfBase64] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const generatePreview = async () => {
        if (!state.templatePdf || state.destinatari.length === 0) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', state.templatePdf);
            const config = {
                destinatario: state.destinatari[0],
                mapping: mapping,
                opzioniPdf: { appiattisciCampiDato: false, appiattisciCampiCliente: false }
            };
            formData.append('config', JSON.stringify(config));
            
            const res = await apiClient.post<any>('/pdf/preview', formData);
            setPdfBase64(res.pdfBase64);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-8">
             <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-semibold">Anteprima</h3>
                 <button onClick={generatePreview} disabled={loading || !mapping.length} className="bg-slate-800/50 px-4 py-2 rounded text-sm hover:bg-slate-700 transition">
                     {loading ? 'Generazione...' : 'Genera Anteprima 1° Cliente'}
                 </button>
             </div>
             {pdfBase64 && (
                 <div className="border border-slate-700 rounded overflow-hidden" style={{height: '500px'}}>
                     <iframe src={`data:application/pdf;base64,${pdfBase64}`} width="100%" height="100%" />
                 </div>
             )}
        </div>
    );
}
