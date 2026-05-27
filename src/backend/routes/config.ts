import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const configPath = path.resolve(process.cwd(), 'config.json');

router.get('/', async (req, res) => {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(data);
    
    const configToSend = { ...config, smtp: { ...config.smtp } };
    const passwordConfigurata = !!configToSend.smtp.password;
    delete configToSend.smtp.password;
    configToSend.smtp.passwordConfigurata = passwordConfigurata;
    
    res.json(configToSend);
  } catch (err) {
    console.error("Errore lettura config:", err);
    res.status(500).json({ error: "Errore durante la lettura della configurazione" });
  }
});

router.post('/', async (req, res) => {
  try {
    const oldData = await fs.readFile(configPath, 'utf8');
    const oldConfig = JSON.parse(oldData);
    
    const newConfig = req.body;
    
    // se non viene passata una password nuova o non è stata cambiata, mantieni quella vecchia
    if (newConfig.smtp && 'password' in newConfig.smtp) {
        if (!newConfig.smtp.password) {
            newConfig.smtp.password = oldConfig.smtp.password;
        }
    }

    // Merge deep (semplice per questo caso d'uso dove la struttura è piatta)
    const mergedConfig = {
      ...oldConfig,
      ...newConfig,
      smtp: {
        ...oldConfig.smtp,
        ...(newConfig.smtp || {})
      },
      rateLimiting: {
        ...oldConfig.rateLimiting,
        ...(newConfig.rateLimiting || {})
      },
      pdf: {
        ...oldConfig.pdf,
        ...(newConfig.pdf || {})
      },
      email: {
        ...oldConfig.email,
        ...(newConfig.email || {})
      }
    };

    // Pulizia prima del salvataggio
    if(mergedConfig.smtp.passwordConfigurata !== undefined) {
      delete mergedConfig.smtp.passwordConfigurata;
    }

    await fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 2), 'utf8');
    res.json({ success: true });
  } catch (err) {
    console.error("Errore scrittura config:", err);
    res.status(500).json({ error: "Errore durante il salvataggio della configurazione" });
  }
});

export default router;
