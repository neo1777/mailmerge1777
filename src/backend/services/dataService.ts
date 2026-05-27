import exceljs from 'exceljs';
import { parse as parseCsv } from 'csv-parse';
import fs from 'fs/promises';

const COLONNA_ALIASES: Record<string, string[]> = {
  email:          ['e-mail', 'email', 'mail', 'posta', 'posta elettronica', 'indirizzo mail', 'indirizzo email'],
  ragioneSociale: ['ragione sociale', 'ragione so', 'ragionesociale', 'nome', 'denominazione', 'cliente', 'desc cliente', 'descrizione cliente'],
  indirizzo:      ['indirizzo', 'via', 'strada', 'address', 'ind'],
  cap:            ['cap', 'c.a.p.', 'codice avviamento', 'codice postale'],
  localita:       ['localita', 'località', 'citta', 'città', 'comune', 'loc'],
  provincia:      ['provincia', 'prov', 'pr', 'sigla'],
  punti:          ['punti', 'point', 'points', 'obiettivo', 'target'],
  codice:         ['codice', 'codice cliente', 'cod', 'cod. cliente', 'cod cliente', 'id', 'id cliente'],
  codiceAgente:   ['cod. ag.', 'cod ag', 'codice agente', 'cod. agente', 'agente cod', 'codice ag.'],
  nomeAgente:     ['desc.ag.', 'desc ag', 'nome agente', 'agente', 'commerciale', 'nome ag.', 'descr. agente'],
};

function normalizzaHeader(h: string): string {
  return (h || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function trovaColonna(headers: string[], campo: string): number | null {
  const aliases = COLONNA_ALIASES[campo] || [];
  const headersNorm = headers.map(normalizzaHeader);
  for (const alias of aliases) {
    const idx = headersNorm.indexOf(alias);
    if (idx !== -1) return idx;
  }
  for (const alias of aliases) {
    const idx = headersNorm.findIndex(h => h.includes(alias));
    if (idx !== -1) return idx;
  }
  return null;
}

function pulisciStringa(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/_x000D_/g, '')
    .replace(/\r\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function parseDataFile(filePath: string, originalName: string, customMapping?: Record<string, number | null>): Promise<any> {
  const isExcel = originalName.endsWith('.xlsx') || originalName.endsWith('.xls');
  
  if (isExcel) {
    return await parseExcel(filePath, customMapping);
  } else {
    return await parseCsvFile(filePath, customMapping);
  }
}

async function parseExcel(filePath: string, customMapping?: Record<string, number | null>) {
  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0]; 
  
  if (!worksheet) throw new Error("Il file Excel è vuoto o senza fogli.");

  const rows: any[] = [];
  worksheet.eachRow((row, rowNumber) => {
    const rowValues = row.values as any[];
    const normalizedRow = rowValues.slice(1).map(cell => {
      if (cell && typeof cell === 'object' && cell.result !== undefined) {
        return cell.result;
      }
      return cell;
    });
    rows.push(normalizedRow);
  });

  return processGrid(rows, customMapping);
}

async function parseCsvFile(filePath: string, customMapping?: Record<string, number | null>) {
  const content = await fs.readFile(filePath);
  
  return new Promise((resolve, reject) => {
    parseCsv(content, {
      relax_column_count: true,
      skip_empty_lines: true,
      bom: true,
    }, (err, records) => {
      if (err) {
        parseCsv(content, { delimiter: ';', relax_column_count: true, skip_empty_lines: true }, (err2, records2) => {
             if(err2) {
                 reject(new Error("Formato testo non riconosciuto. Usa virgola, punto e virgola o tab."));
             } else {
                 resolve(processGrid(records2, customMapping));
             }
        });
      } else {
        if (records.length > 0 && records[0].length === 1 && String(records[0][0]).includes(';')) {
            parseCsv(content, { delimiter: ';', relax_column_count: true, skip_empty_lines: true }, (err2, records2) => {
                 resolve(processGrid(records2, customMapping));
            });
        }
        else if (records.length > 0 && records[0].length === 1 && String(records[0][0]).includes('\t')) {
             parseCsv(content, { delimiter: '\t', relax_column_count: true, skip_empty_lines: true }, (err3, records3) => {
                 resolve(processGrid(records3, customMapping));
            });
        } else {
            resolve(processGrid(records, customMapping));
        }
      }
    });
  });
}

function processGrid(rows: any[][], customMapping?: Record<string, number | null>) {
  if (rows.length < 2) throw new Error("Il file deve contenere almeno una riga di intestazione e una riga di dati.");
  
  const headerRow = rows[0].map(h => String(h || '').trim());
  const dataRows = rows.slice(1);
  
  const destinatari: any[] = [];
  const righeScartate: Array<{ riga: number; motivo: string; valore?: string }> = [];
  const correzioni: Record<string, { count: number; descrizione: string }> = {};
  
  const addCorrezione = (tipo: string, descrizione: string) => {
      if (!correzioni[tipo]) correzioni[tipo] = { count: 0, descrizione };
      correzioni[tipo].count++;
  };

  const colNamesRes: Record<string, { nomeOriginale: string; indice: number } | null> = {};
  for (const k of Object.keys(COLONNA_ALIASES)) {
      if (customMapping && customMapping[k] !== undefined) {
          const idx = customMapping[k];
          colNamesRes[k] = idx !== null ? { nomeOriginale: headerRow[idx], indice: idx } : null;
      } else {
          const idx = trovaColonna(headerRow, k);
          colNamesRes[k] = idx !== null ? { nomeOriginale: headerRow[idx], indice: idx } : null;
      }
  }
  
  const campiMancanti: string[] = [];
  if (!colNamesRes.ragioneSociale) campiMancanti.push('Ragione Sociale');
  
  dataRows.forEach((row, rowIndex) => {
    const realRowIndex = rowIndex + 2; 
    const rowObj: any = { id: realRowIndex };

    headerRow.forEach((colName, colIndex) => {
      let val = row[colIndex];
      // Applica la pulizia base a tutte le stringhe
      if (typeof val === 'string' || val == null) {
          const pulito = pulisciStringa(val);
          if (val !== pulito && typeof val === 'string' && val.includes('_x000D_')) {
              addCorrezione('pulizia_x000D', 'Pulizia artefatti _x000D_ da Excel');
          }
          val = pulito;
      }
      rowObj[colName] = val;
    });

    let rigaValida = true;

    // Ragione Sociale (obbligatoria)
    let ragSoc = '';
    if (colNamesRes.ragioneSociale) {
        ragSoc = String(rowObj[headerRow[colNamesRes.ragioneSociale.indice]] || '').trim();
    }
    if (!ragSoc) {
        righeScartate.push({ riga: realRowIndex, motivo: "Ragione sociale mancante o vuota" });
        rigaValida = false;
    } else {
        rowObj._ragioneSociale = ragSoc;
    }

    // Email (opzionale)
    let emailNorm = '';
    if (colNamesRes.email) {
        const val = String(rowObj[headerRow[colNamesRes.email.indice]] || '').trim().toLowerCase();
        const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (val && !emailRegex.test(val)) {
            righeScartate.push({ riga: realRowIndex, motivo: `"${val}" non è un indirizzo email valido.`, valore: val });
            rigaValida = false;
        } else {
            emailNorm = val;
        }
    }

    // CAP (zero padding)
    if (colNamesRes.cap) {
        let val = String(rowObj[headerRow[colNamesRes.cap.indice]] || '').trim();
        if (val && val.length < 5 && !isNaN(Number(val))) {
            const oldVal = val;
            val = val.padStart(5, '0');
            rowObj[headerRow[colNamesRes.cap.indice]] = val;
            addCorrezione('cap_zero_padding', 'Completamento CAP a 5 cifre con zeri iniziali');
        } else if (val && isNaN(Number(val))) {
            addCorrezione('cap_not_number', 'CAP non numerico mantenuto come stringa pura');
        }
    }

    // Punti
    if (colNamesRes.punti) {
        let val = rowObj[headerRow[colNamesRes.punti.indice]];
        if (val !== undefined && val !== '') {
            const parsed = parseInt(val, 10);
            if (isNaN(parsed)) {
                addCorrezione('punti_nan', 'Campo Punti non numerico, forzato a 0');
                rowObj[headerRow[colNamesRes.punti.indice]] = 0;
            }
        }
    }

    if (rigaValida) {
        rowObj._email = emailNorm;
        
        // Agente check
        if (colNamesRes.codiceAgente) {
             rowObj._codiceAgente = pulisciStringa(rowObj[headerRow[colNamesRes.codiceAgente.indice]]);
        }
        if (colNamesRes.nomeAgente) {
             rowObj._nomeAgente = pulisciStringa(rowObj[headerRow[colNamesRes.nomeAgente.indice]]);
        }

        rowObj._statoInvio = 'in_attesa';
        destinatari.push(rowObj);
    }
  });

  const agentiMap = new Map<string, { nome: string; count: number }>();
  if (colNamesRes.codiceAgente || colNamesRes.nomeAgente) {
      for (const dest of destinatari) {
          const cod = dest._codiceAgente as string || 'NESSUNO';
          const nome = dest._nomeAgente as string || 'Senza agente';
          if (!agentiMap.has(cod)) agentiMap.set(cod, { nome, count: 0 });
          agentiMap.get(cod)!.count++;
      }
  }
  const agentiList = Array.from(agentiMap.entries())
    .map(([codice, { nome, count }]) => ({ codice, nome, count }))
    .sort((a, b) => b.count - a.count);

  const correzioniArr = Object.entries(correzioni).map(([tipo, val]) => ({
      tipo, count: val.count, descrizione: val.descrizione
  }));

  const report = {
    colonneRilevate: colNamesRes,
    campiMancanti,
    emailDisponibile: colNamesRes.email !== null,
    agenteDisponibile: (colNamesRes.codiceAgente !== null || colNamesRes.nomeAgente !== null),
    correzioniAutomatiche: correzioniArr,
    righeScartate,
    agenti: agentiList,
    totaleRighe: dataRows.length,
    righeValide: destinatari.length
  };

  return {
    report,
    destinatari,
    headers: headerRow,
    formato: rows[0].includes(';') ? 'CSV (Punto e virgola)' : 'Excel/Strutturato'
  };
}

