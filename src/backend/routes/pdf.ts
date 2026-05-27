import express from 'express';
import multer from 'multer';
import os from 'os';
import { detectPdfFields, compilaPdf } from '../services/pdfService';
import fs from 'fs/promises';

const router = express.Router();
const upload = multer({ dest: os.tmpdir() });

router.post('/fields', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nessun file caricato." });
    const campi = await detectPdfFields(req.file.path);
    res.json(campi);
  } catch (err: any) {
    console.error("Errore rilevamento campi PDF:", err);
    res.status(400).json({ error: err.message || "Errore durante la lettura del PDF" });
  }
});

router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nessun file caricato." });
    
    const configStr = req.body.config;
    if (!configStr) return res.status(400).json({ error: "Manca configurazione preview." });
    
    const { destinatario, mapping, opzioniPdf } = JSON.parse(configStr);
    
    // costruisci valoriCampi
    const valoriCampi: Record<string, string> = {};
    for (const map of mapping) {
        if (map.colonnaInput) {
             valoriCampi[map.nomeCampoPdf] = destinatario[map.colonnaInput];
        }
    }

    const templateBytes = await fs.readFile(req.file.path);
    const compiledBytes = await compilaPdf(templateBytes, valoriCampi, opzioniPdf);
    
    const base64 = Buffer.from(compiledBytes).toString('base64');
    res.json({ pdfBase64: base64 });
  } catch(err: any) {
    console.error("Errore preview PDF:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
