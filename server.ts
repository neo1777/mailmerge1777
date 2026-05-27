import express from 'express';
import path from 'path';
import multer from 'multer';
import dataRouter from './src/backend/routes/data';
import pdfRouter from './src/backend/routes/pdf';
import emailRouter from './src/backend/routes/email';
import configRouter from './src/backend/routes/config';
import logRouter from './src/backend/routes/log';
import uploadRouter from './src/backend/routes/upload';
import systemRouter from './src/backend/routes/system';
import outputRouter from './src/backend/routes/output';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Setup APIs
  app.use('/api/data', dataRouter);
  app.use('/api/pdf', pdfRouter);
  app.use('/api/email', emailRouter);
  app.use('/api/config', configRouter);
  app.use('/api/log', logRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/system', systemRouter);
  app.use('/api/output', outputRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
