import express from 'express';
import multer from 'multer';
import os from 'os';

const router = express.Router();
const upload = multer({ dest: os.tmpdir() });

router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Nessun file caricato." });
    }
    res.json({
        path: req.file.path,
        nome: req.file.originalname,
        dimensioneMB: req.file.size / (1024 * 1024)
    });
});

export default router;
