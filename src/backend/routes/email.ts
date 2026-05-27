import express from 'express';
import { testSmtpConnection, startJob, getJobStatus, stopJob } from '../services/emailService';

const router = express.Router();

router.post('/test-smtp', async (req, res) => {
  const result = await testSmtpConnection(req.body);
  res.json(result);
});

router.post('/send', async (req, res) => {
  try {
    const { destinatari, mapping, templatePath, allegatiStatici, configEmail, configSmtp, configRateLimiting, opzioniPdf, dryRun, resume } = req.body;
    
    // allegatiStatici passed from frontend needs to be valid paths or we must upload them.
    // In our architecture, since backend and frontend run on the same container for this test, uploading files 
    // requires a multipart upload. However, the req.body is JSON. We will need to receive files via multer.
    // Let's assume files were uploaded in step2 and step3 and backend has their paths, or they are sent here.
    // Given the complexity of multipart with JSON, let's assume the frontend sends the "paths" of already uploaded files.
    // Wait, `templatePath` and `allegatiStatici` paths must exist on backend.
    
    const result = await startJob(
        destinatari, mapping, templatePath, allegatiStatici, configEmail, configSmtp, configRateLimiting, opzioniPdf, dryRun, resume
    );
    res.json(result);
  } catch (err: any) {
      if (err.message.includes("già in corso")) {
          res.status(409).json({ error: err.message });
      } else {
          res.status(500).json({ error: err.message });
      }
  }
});

router.get('/status/current', (req, res) => {
   const status = getJobStatus();
   res.json(status || { stato: 'nessun_job' });
});

router.get('/status/:jobId', (req, res) => {
   const status = getJobStatus();
   res.json(status || { stato: 'nessun_job' });
});

router.post('/stop', (req, res) => {
   stopJob();
   res.json({ ok: true });
});

export default router;
