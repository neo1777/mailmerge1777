import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { compilaPdf } from './pdfService';
import { PDFDocument } from 'pdf-lib';

let jobOutputCorrente: any = null;

export function getJobOutputStatus() {
  return jobOutputCorrente;
}

export function stopJobOutput() {
  if (jobOutputCorrente) {
    jobOutputCorrente.stato = 'interrotto';
  }
}

export async function generateOutput(params: any) {
    if (jobOutputCorrente && jobOutputCorrente.stato === 'in_corso') {
        throw new Error('Una generazione file è già in corso.');
    }

    const {
        destinatari,
        mapping,
        pdfTemplatePath,
        configEmail,
        opzioniPdf,
        opzioniOutput
    } = params;

    const baseDir = opzioniOutput.cartellaBase || './output';
    const timestampStr = new Date().toLocaleDateString('it-IT').replace(/\//g,'') + '_' + new Date().toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit',second:'2-digit'}).replace(/:/g,'');
    const esecuzioneDir = path.join(baseDir, timestampStr);

    jobOutputCorrente = {
        id: Date.now().toString(),
        stato: 'in_corso',
        totale: destinatari.length,
        processati: 0,
        errori: 0,
        percentuale: 0,
        cartellaEsecuzione: esecuzioneDir,
        zipDisponibile: false,
        ultimiLog: [],
        agenteCorrente: null,
        pdfAgentiGenerati: []
    };

    const templateBytes = await fs.readFile(pdfTemplatePath);

    runOutputLoop(
        destinatari, mapping, templateBytes, configEmail, opzioniPdf, opzioniOutput, esecuzioneDir, timestampStr
    ).catch(console.error);

    return { jobId: jobOutputCorrente.id };
}

function sanitizzaNome(nome: string) {
    return (nome || '').replace(/[^a-zA-Z0-9]/g, '_');
}

async function generaPdfAgente(
  clientiAgente: any[],
  pdfSingoloPaths: string[],
  outputPath: string
): Promise<void> {
  const agentePdf = await PDFDocument.create();

  for (const pdfPath of pdfSingoloPaths) {
    const clienteBytes = await fs.readFile(pdfPath);
    const clientePdf = await PDFDocument.load(clienteBytes);
    
    try {
      const form = clientePdf.getForm();
      form.flatten();
    } catch (e) {
      // Ignora se non ci sono campi
    }
    
    const indices = clientePdf.getPageIndices();
    const pages = await agentePdf.copyPages(clientePdf, indices);
    pages.forEach(page => agentePdf.addPage(page));
  }

  const agentePdfBytes = await agentePdf.save();
  await fs.writeFile(outputPath, agentePdfBytes);
}

async function runOutputLoop(
    destinatari: any[], mapping: any[], templateBytes: Uint8Array, configEmail: any, opzioniPdf: any, opzioniOutput: any, esecuzioneDir: string, timestampStr: string
) {
    try {
        await fs.mkdir(esecuzioneDir, { recursive: true });
        if (opzioniOutput.raggruppaPerAgente || opzioniOutput.creaRiepilogoAgente) {
             if (opzioniOutput.includiSingoli || opzioniOutput.raggruppaPerAgente) await fs.mkdir(path.join(esecuzioneDir, 'singoli'), { recursive: true });
             if (opzioniOutput.creaRiepilogoAgente) await fs.mkdir(path.join(esecuzioneDir, 'per_agente'), { recursive: true });
        }
    } catch (e: any) {
        logEvent('SISTEMA', 'ERRORE', undefined, `Impossibile creare cartelle base: ${e.message}`);
        jobOutputCorrente.stato = 'errore';
        return;
    }

    // Raggruppamento per agente
    let destinatariRaggruppati: Record<string, any[]> = {};
    if (opzioniOutput.raggruppaPerAgente || opzioniOutput.creaRiepilogoAgente) {
        destinatari.forEach(c => {
            const cod = String(c._codiceAgente || 'NO_AG');
            if (!destinatariRaggruppati[cod]) destinatariRaggruppati[cod] = [];
            destinatariRaggruppati[cod].push(c);
        });
    } else {
        destinatariRaggruppati['TUTTI'] = destinatari;
    }

    const zipPathsToKeep: string[] = [];

    for (const [codAgente, clienti] of Object.entries(destinatariRaggruppati)) {
        if (jobOutputCorrente.stato === 'interrotto') break;

        const nomeAgenteRaw = clienti[0]?._nomeAgente || 'Senza_Agente';
        jobOutputCorrente.agenteCorrente = codAgente !== 'TUTTI' ? {
            codice: codAgente,
            nome: nomeAgenteRaw,
            processati: 0,
            totale: clienti.length
        } : null;

        const codAgSanitized = sanitizzaNome(codAgente);
        const nomeAgSanitized = sanitizzaNome(nomeAgenteRaw);
        
        let pathSingoliAgente = esecuzioneDir;
        if (codAgente !== 'TUTTI' && opzioniOutput.raggruppaPerAgente) {
            pathSingoliAgente = path.join(esecuzioneDir, 'singoli', `${codAgSanitized}_${nomeAgSanitized}`);
            await fs.mkdir(pathSingoliAgente, { recursive: true });
        } else if (codAgente !== 'TUTTI') {
             pathSingoliAgente = path.join(esecuzioneDir, 'singoli');
        }

        const pdfPathsRaccolti: string[] = [];

        for (let i = 0; i < clienti.length; i++) {
            if (jobOutputCorrente.stato === 'interrotto') break;

            const cliente = clienti[i];
            const nomeIdentificativo = (cliente['RAGIONE SO'] || cliente['RAGIONE SOCIALE'] || cliente._ragioneSociale || 'DatoAcquisito').replace(/[^a-zA-Z0-9]/g, '_');
            const folderName = `${cliente.CODICE || i}_${nomeIdentificativo}`;
            
            const folderPath = opzioniOutput.includiSingoli !== false || (!opzioniOutput.raggruppaPerAgente && !opzioniOutput.creaRiepilogoAgente) 
                 ? path.join(pathSingoliAgente, folderName) 
                 : path.join(esecuzioneDir, '.tmp', folderName);

            try {
                await fs.mkdir(folderPath, { recursive: true });

                const valoriCampi: Record<string, string> = {};
                for (const map of mapping) {
                    if (map.colonnaInput) {
                        valoriCampi[map.nomeCampoPdf] = cliente[map.colonnaInput] || '';
                    }
                }

                const pdfBytes = await compilaPdf(templateBytes, valoriCampi, opzioniPdf);
                const fileNamePdf = `contratto_${nomeIdentificativo}.pdf`;
                const finalPdfPath = path.join(folderPath, fileNamePdf);
                await fs.writeFile(finalPdfPath, pdfBytes);
                pdfPathsRaccolti.push(finalPdfPath);

                let corpoTesto = configEmail.testo || '';
                let oggettoTesto = configEmail.oggetto || '';
                let firmaTesto = configEmail.includiFirma && configEmail.firma ? `\n\n--\n${configEmail.firma}` : '';
                corpoTesto += firmaTesto;

                for (const key of Object.keys(cliente)) {
                    if(key.startsWith('_')) continue;
                    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                    const val = String(cliente[key] || '');
                    corpoTesto = corpoTesto.replace(regex, val);
                    oggettoTesto = oggettoTesto.replace(regex, val);
                }

                const sep80Equals = '='.repeat(80);
                const sep80Dash = '-'.repeat(80);
                
                let headerDati = '';
                for (const key of Object.keys(cliente)) {
                    if(key.startsWith('_')) continue;
                    const formattedKey = key.padEnd(20, ' ').substring(0, 20);
                    headerDati += `${formattedKey} : ${cliente[key] || ''}\n`;
                }

                const now = new Date();
                const dataGen = now.toLocaleDateString('it-IT') + ' ' + now.toLocaleTimeString('it-IT');
                const dataGenRow = `Data generazione     : ${dataGen}\n`;

                const testoFinale = `${sep80Equals}\nDATI DESTINATARIO\n${sep80Equals}\n${headerDati}${dataGenRow}${sep80Equals}\n\nOGGETTO: ${oggettoTesto}\n\n${sep80Dash}\nCORPO EMAIL\n${sep80Dash}\n\n${corpoTesto}\n\n${sep80Equals}`;

                const fileNameTxt = `email_${nomeIdentificativo}.txt`;
                await fs.writeFile(path.join(folderPath, fileNameTxt), testoFinale, 'utf8');

                logEvent(folderName, 'SUCCESSO', folderPath);
                
            } catch (err: any) {
                logEvent(folderName, 'ERRORE', undefined, err.message);
                jobOutputCorrente.errori++;
            }

            jobOutputCorrente.processati++;
            jobOutputCorrente.percentuale = Math.round((jobOutputCorrente.processati) / jobOutputCorrente.totale * 100);
            if (jobOutputCorrente.agenteCorrente) jobOutputCorrente.agenteCorrente.processati++;
        }

        if (opzioniOutput.creaRiepilogoAgente && codAgente !== 'TUTTI' && pdfPathsRaccolti.length > 0) {
            try {
                const nomeRiep = `${codAgSanitized}_${nomeAgSanitized}_${pdfPathsRaccolti.length}lettere.pdf`;
                const pdfOutPath = path.join(esecuzioneDir, 'per_agente', nomeRiep);
                await generaPdfAgente(clienti, pdfPathsRaccolti, pdfOutPath);
                jobOutputCorrente.pdfAgentiGenerati.push({ codice: codAgente, nomeFile: nomeRiep, count: pdfPathsRaccolti.length });
                logEvent(`AGENTE ${nomeAgenteRaw}`, 'SUCCESSO', pdfOutPath, `PDF Unificato Creato`);
            } catch(e: any) {
                logEvent(`AGENTE ${nomeAgenteRaw}`, 'ERRORE', undefined, `Errore in merge PDF Agente: ${e.message}`);
            }
        }
    }

    // Cleanup di tmp se usato
    if (opzioniOutput.includiSingoli === false) {
       await fs.rm(path.join(esecuzioneDir, '.tmp'), { recursive: true, force: true }).catch(()=>null);
    }

    if (jobOutputCorrente.stato === 'in_corso') {
        jobOutputCorrente.stato = 'completato';
        
        if (opzioniOutput.comprimi && jobOutputCorrente.processati > 0) {
            try {
                await createZip(esecuzioneDir, timestampStr);
                jobOutputCorrente.zipDisponibile = true;
                logEvent('SISTEMA', 'SUCCESSO', undefined, `Archivio ZIP creato: ${timestampStr}.zip`);
            } catch (err: any) {
                logEvent('SISTEMA', 'ERRORE', undefined, `Errore creazione ZIP: ${err.message}`);
            }
        }
    }
}

function logEvent(cliente: string, stato: 'SUCCESSO' | 'ERRORE', cartella?: string, errore?: string) {
    if (!jobOutputCorrente) return;
    const riga = {
        ts: new Date().toISOString(),
        cliente,
        stato,
        cartella,
        errore
    };
    jobOutputCorrente.ultimiLog.unshift(riga);
    if (jobOutputCorrente.ultimiLog.length > 50) jobOutputCorrente.ultimiLog.pop();
}

function createZip(sourceDir: string, timestampStr: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const zipFile = path.resolve(sourceDir, `../${timestampStr}.zip`);
        const output = createWriteStream(zipFile);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => resolve());
        archive.on('warning', (err) => { if (err.code !== 'ENOENT') reject(err); });
        archive.on('error', (err) => reject(err));

        archive.pipe(output);
        archive.directory(sourceDir, timestampStr);
        archive.finalize();
    });
}
