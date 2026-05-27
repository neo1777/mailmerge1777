import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { parseDataFile } from '../services/dataService';

const router = express.Router();
const upload = multer({ dest: os.tmpdir() });

router.post('/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nessun file caricato." });
    }
    
    let customMapping = undefined;
    if (req.body.mapping) {
        try {
            customMapping = JSON.parse(req.body.mapping);
        } catch (e) {
            console.error("Invalid mapping JSON", e);
        }
    }
    
    // Pass original name to detect extension
    const result = await parseDataFile(req.file.path, req.file.originalname, customMapping);
    res.json({
      formato: result.formato,
      totaleRighe: result.report.totaleRighe,
      righeValide: result.report.righeValide,
      righeScartate: result.report.righeScartate.length,
      colonneRilevate: result.headers,
      headersRaw: result.headers,
      campiMancanti: result.report.campiMancanti,
      emailDisponibile: result.report.emailDisponibile,
      agenteDisponibile: result.report.agenteDisponibile,
      correzioniAutomatiche: result.report.correzioniAutomatiche,
      agenti: result.report.agenti,
      destinatari: result.destinatari,
      problemi: result.report.righeScartate,
      reportParsing: result.report // export this so frontend can save it
    });
  } catch (err: any) {
    console.error("Errore parsing:", err);
    res.status(500).json({ error: err.message || "Errore sconosciuto durante il parsing." });
  }
});

export default router;
