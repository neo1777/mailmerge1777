import express from 'express';
import { getLogs } from '../services/emailService';
import path from 'path';

const router = express.Router();

router.get('/', async (req, res) => {
  const content = await getLogs();
  
  const lines = content.split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return res.json([]);
  
  const headers = lines[0].split(',');
  const result = lines.slice(1).map(line => {
      const vals = line.split(','); // simplistic parsing, works for our schema since we don't have commas in the fields we wrap in quotes, except we do have quotes so we might need proper parse.
      // let's use a simple regex for CSV parsing
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const cleanVals = matches.map(m => m.replace(/^"|"$/g, '').trim());
      
      const obj: any = {};
      headers.forEach((h, i) => {
          obj[h] = cleanVals[i] || '';
      });
      return obj;
  });
  
  res.json(result);
});

router.get('/download', (req, res) => {
   res.download(path.resolve(process.cwd(), 'log_invii.csv'));
});

export default router;
