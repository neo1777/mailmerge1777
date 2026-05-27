import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import { parse } from 'csv-parse/sync';
import fastCsv from 'fast-csv';
import path from 'path';
import { compilaPdf } from './pdfService';

let jobCorrente: any = null;

const checkEnv = async () => {
    // try to make sure pdf_generati exists
    try { await fs.mkdir('./pdf_generati', { recursive: true }); } catch {}
    try { await fs.mkdir('./pdf_generati/dry_run', { recursive: true }); } catch {}
};

export async function testSmtpConnection(configSmtp: any) {
  const transporter = nodemailer.createTransport({
    host: configSmtp.host,
    port: configSmtp.port,
    secure: configSmtp.secure,
    auth: {
      user: configSmtp.username,
      pass: configSmtp.password,
    },
    tls: { rejectUnauthorized: configSmtp.rejectUnauthorized }
  });

  try {
    await transporter.verify();
    return { ok: true };
  } catch (err: any) {
    let msg = "Errore di connessione.";
    if (err.code === 'ECONNREFUSED') msg = "Impossibile connettersi al server. Verificare host e porta.";
    else if (err.code === 'EAUTH' || err.responseCode === 535) msg = "Credenziali non valide. Controllare username e password.";
    else if (err.code === 'ETIMEDOUT') msg = "Il server non risponde. Verificare la connessione internet.";
    else msg = err.message;
    return { ok: false, error: msg };
  }
}

export function getJobStatus() {
  if (!jobCorrente) return null;
  return jobCorrente;
}

export function stopJob() {
  if (jobCorrente) {
    jobCorrente.stopRichiesto = true;
    jobCorrente.stato = 'interrotto';
  }
}

export async function startJob(
  destinatari: any[],
  mapping: any[],
  templatePath: string,
  allegatiStaticiPaths: any[],
  configEmail: any,
  configSmtp: any,
  configRateLimiting: any,
  opzioniPdf: any,
  dryRun: boolean,
  resume: boolean
) {
  if (jobCorrente && (jobCorrente.stato === 'in_corso')) {
    throw new Error('Un invio è già in corso. Attendi che finisca o interrompilo prima.');
  }

  await checkEnv();

  jobCorrente = {
    id: Date.now().toString(),
    stato: 'in_corso',
    totale: destinatari.length,
    inviati: 0,
    errori: 0,
    iniziatoAlle: new Date(),
    stopRichiesto: false,
    ultimiLog: [],
    dryRun
  };

  const templateBytes = await fs.readFile(templatePath);
  
  // Asincrono senza await main loop per non bloccare HTTP
  runJobLoop(
    destinatari, mapping, templateBytes, allegatiStaticiPaths, configEmail, configSmtp, configRateLimiting, opzioniPdf, dryRun, resume
  ).catch(console.error);

  return { jobId: jobCorrente.id };
}

async function runJobLoop(
  destinatari: any[], mapping: any[], templateBytes: Uint8Array, allegatiStatici: any[],
  configEmail: any, configSmtp: any, configRateLimiting: any, opzioniPdf: any, dryRun: boolean, resume: boolean
) {
  // Read previous log if resume is true
  let giaInviati = new Set<string>();
  if (resume) {
      try {
          const logContent = await fs.readFile('./log_invii.csv', 'utf8');
          const righe = parse(logContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_quotes: true
          });

          (righe as any[]).forEach((r: Record<string, string>) => {
            if (r.stato === 'SUCCESSO' || r.stato === 'DRY_RUN_OK') {
              giaInviati.add(r.email.toLowerCase());
            }
          });
      } catch (e) {}
  }

  const transporter = nodemailer.createTransport({
    host: configSmtp.host,
    port: configSmtp.port,
    secure: configSmtp.secure,
    auth: {
      user: configSmtp.username,
      pass: configSmtp.password,
    },
    tls: { rejectUnauthorized: configSmtp.rejectUnauthorized }
  });

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  let countInBatch = 0;

  for (let i = 0; i < destinatari.length; i++) {
    if (jobCorrente.stopRichiesto) break;

    const cliente = destinatari[i];
    jobCorrente.corrente = { email: cliente._email, ragioneSociale: cliente['RAGIONE SO'] || cliente['RAGIONE SOCIALE'] || 'Sconosciuto' };

    if (resume && giaInviati.has(cliente._email)) {
         await appendLog({ 
             timestamp: new Date().toISOString(), 
             codice: cliente.CODICE || '', 
             ragioneSociale: jobCorrente.corrente.ragioneSociale, 
             email: cliente._email, 
             pdfGenerato: false, pdfPath: '', stato: 'SALTATO', errore: '', dryRun 
         });
         jobCorrente.inviati++; // Contiamo come fatto? O ignoriamo. Ignoriamo per logica.
         jobCorrente.percentuale = Math.round((i+1) / jobCorrente.totale * 100);
         continue;
    }

    try {
      // 1. Map fields
      const valoriCampi: Record<string, string> = {};
      for (const map of mapping) {
          if (map.colonnaInput) {
               valoriCampi[map.nomeCampoPdf] = cliente[map.colonnaInput] || '';
          }
      }

      // 2. Generate PDF
      const pdfBytes = await compilaPdf(templateBytes, valoriCampi, opzioniPdf);
      const sanitisedName = (cliente['RAGIONE SO'] || cliente['RAGIONE SOCIALE'] || 'DatoAcquisito').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cliente.CODICE || i}_${sanitisedName}.pdf`;
      const pdfPath = dryRun ? `./pdf_generati/dry_run/${fileName}` : `./pdf_generati/${fileName}`;
      
      await fs.writeFile(pdfPath, pdfBytes);

      // 3. Prepare Email Body
      let oggetto = configEmail.oggetto;
      let testo = configEmail.testo;
      let html = configEmail.html;

      // Replace placeholders {{COLONNA}} for subject, body, and signature.
      let firmaHtml = configEmail.includiFirma && configEmail.firma ? `<br><br>--<br>${configEmail.firma}` : '';
      let firmaTesto = configEmail.includiFirma && configEmail.firma ? `\n\n--\n${configEmail.firma}` : '';

      html += firmaHtml;
      testo += firmaTesto;

      for (const key of Object.keys(cliente)) {
          if(key.startsWith('_')) continue;
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          const val = String(cliente[key] || '');
          oggetto = oggetto.replace(regex, val);
          testo = testo.replace(regex, val);
          html = html.replace(regex, val);
      }

      // 4. Send Email
      if (!dryRun) {
          const mailAttachments = [
              { filename: fileName, content: Buffer.from(pdfBytes) }
          ];

          for (const stat of allegatiStatici) {
             mailAttachments.push({
                 filename: stat.nome, content: await fs.readFile(stat.path)
             });
          }

          await transporter.sendMail({
            from: configSmtp.mittente,
            to: cliente._email,
            subject: oggetto,
            text: testo,
            html: html,
            attachments: mailAttachments
          });
      }

      const lStato = dryRun ? 'DRY_RUN_OK' : 'SUCCESSO';
      await appendLog({ 
        timestamp: new Date().toISOString(), codice: String(cliente.CODICE || ''), ragioneSociale: jobCorrente.corrente.ragioneSociale, 
        email: cliente._email, pdfGenerato: true, pdfPath, stato: lStato as any, errore: '', dryRun 
      });
      jobCorrente.inviati++;

    } catch (err: any) {
      await appendLog({ 
        timestamp: new Date().toISOString(), codice: String(cliente.CODICE || ''), ragioneSociale: jobCorrente.corrente.ragioneSociale, 
        email: cliente._email, pdfGenerato: false, pdfPath: '', stato: 'ERRORE', errore: err.message, dryRun 
      });
      jobCorrente.errori++;
    }

    jobCorrente.percentuale = Math.round((i+1) / jobCorrente.totale * 100);

    // Rate Limiting
    countInBatch++;
    if (i < destinatari.length - 1) { // non aspettare dopo l'ultimo
        await sleep(configRateLimiting.pausaTraEmailMs);
        if (countInBatch >= configRateLimiting.emailsPerBatch) {
             countInBatch = 0;
             await sleep(configRateLimiting.pausaTraBatchMs);
        }
    }
  }

  if (jobCorrente.stato === 'in_corso') {
      jobCorrente.stato = 'completato';
  }
}

async function appendLog(riga: import('../../types').RigaLog) {
  const line = `${riga.timestamp},"${riga.codice}","${riga.ragioneSociale}","${riga.email}",${riga.pdfGenerato ? 'si' : 'no'},"${riga.pdfPath}","${riga.stato}","${riga.errore || ''}",${riga.dryRun ? 'si' : 'no'}\n`;
  try {
      if(jobCorrente) {
          jobCorrente.ultimiLog.unshift(riga);
          if (jobCorrente.ultimiLog.length > 50) jobCorrente.ultimiLog.pop();
      }
      // write headers if not exists
      try { await fs.stat('./log_invii.csv'); } catch {
        await fs.writeFile('./log_invii.csv', 'timestamp,codice,ragione_sociale,email,pdf_generato,pdf_path,stato,errore,dry_run\n');
      }
      await fs.appendFile('./log_invii.csv', line);
  } catch(e) {}
}

export async function getLogs() {
    try {
        const content = await fs.readFile('./log_invii.csv', 'utf8');
        return content;
    } catch {
        return "";
    }
}
