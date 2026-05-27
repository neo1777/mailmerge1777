import express from 'express';
import path from 'path';
import fs from 'fs';
import { generateOutput, getJobOutputStatus, stopJobOutput } from '../services/outputService';

const router = express.Router();

router.post('/generate', async (req, res) => {
    try {
        const result = await generateOutput(req.body);
        res.json(result);
    } catch (error: any) {
        console.error('Error generating output:', error);
        res.status(500).json({ error: error.message || 'Errore durante la generazione dei file' });
    }
});

router.get('/status/current', (req, res) => {
    const status = getJobOutputStatus();
    if (!status) {
        return res.json({ status: 'nessun_job' });
    }
    res.json(status);
});

router.post('/status/current/stop', (req, res) => {
    stopJobOutput();
    res.json({ ok: true });
});

router.get('/download/zip', (req, res) => {
    const folder = req.query.folder as string;
    if (!folder) return res.status(400).send("Cartella base mancante");
    
    // The folder is something like `./output/timestamp`
    // The ZIP is effectively `timestamp.zip` in `./output`
    const parentDir = path.dirname(path.resolve(folder));
    const timestampStr = path.basename(folder);
    const zipFile = path.join(parentDir, `${timestampStr}.zip`);

    if (fs.existsSync(zipFile)) {
        res.download(zipFile, `${timestampStr}.zip`);
    } else {
        res.status(404).send("File ZIP non trovato");
    }
});

export default router;
