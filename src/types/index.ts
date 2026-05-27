export type TipoCampo = 'dato' | 'cliente';
export type StatoInvio = 'in_attesa' | 'in_corso' | 'successo' | 'errore' | 'saltato';
export type StatoJob = 'in_corso' | 'completato' | 'interrotto' | 'errore';
export type FormatoInput = 'xlsx' | 'csv' | 'tsv' | 'txt';

export interface Destinatario {
  id: number;
  [colonna: string]: string | number | null; // struttura dinamica
  _email: string;       // email normalizzata
  _statoInvio: StatoInvio;
}

export interface CampoPdf {
  nome: string;
  tipo: TipoCampo;
  pagina: number;
}

export interface MappingCampo {
  nomeCampoPdf: string;
  colonnaInput: string | null;
  isDerivato: boolean;
  descrizioneDerivato?: string;
}

export interface ConfigSmtp {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  mittente: string;
  passwordConfigurata: boolean;
  rejectUnauthorized: boolean;
}

export interface ConfigRateLimiting {
  emailsPerBatch: number;
  pausaTraEmailMs: number;
  pausaTraBatchMs: number;
  maxEmailPerOra: number;
}

export interface OpzioniPdf {
  appiattisciCampiDato: boolean;
  appiattisciCampiCliente: boolean;
}

export interface ConfigEmail {
  oggetto: string;
  html: string;
  testo: string;
  firma: string;
  includiFirma: boolean;
}

export interface AllegatoStatico {
  nome: string;
  dimensioneMB: number;
  percorsoTemporaneo: string;
}

export interface RigaLog {
  timestamp: string;
  codice: string;
  ragioneSociale: string;
  email: string;
  pdfGenerato: boolean;
  pdfPath: string;
  stato: 'SUCCESSO' | 'ERRORE' | 'DRY_RUN_OK' | 'SALTATO';
  errore: string;
  dryRun: boolean;
}

export interface StatoJobDettaglio {
  id: string;
  stato: StatoJob;
  totale: number;
  inviati: number;
  errori: number;
  percentuale: number;
  stimaRimanente: string;
  corrente: Pick<Destinatario, '_email'> & { ragioneSociale: string } | null;
  ultimiLog: RigaLog[];
  dryRun: boolean;
}

export interface InfoAgente {
  codice: string;
  nome: string;
  count: number;
}

export interface ColonnaRilevata {
  nomeOriginale: string;
  indice: number;
}

export interface ReportParsing {
  colonneRilevate: Record<string, ColonnaRilevata | null>;
  campiMancanti: string[];
  emailDisponibile: boolean;
  agenteDisponibile: boolean;
  correzioniAutomatiche: Array<{ tipo: string; count: number; descrizione: string }>;
  righeScartate: Array<{ riga: number; motivo: string; valore?: string }>;
  agenti: InfoAgente[];
  totaleRighe: number;
  righeValide: number;
}

export interface OpzioniOutput {
  comprimi: boolean;        // crea ZIP scaricabile
  cartellaBase: string;     // percorso output, default './output'
  raggruppaPerAgente: boolean;
  creaRiepilogoAgente: boolean;
  includiSingoli: boolean;
}

export type ModalitaOperativa = 'email' | 'file';

export interface StatoJobOutput {
  id: string;
  stato: 'in_corso' | 'completato' | 'interrotto' | 'errore';
  totale: number;
  processati: number;
  errori: number;
  percentuale: number;
  cartellaEsecuzione: string;
  zipDisponibile: boolean;
  ultimiLog: Array<{
    ts: string;
    cliente: string;
    stato: 'SUCCESSO' | 'ERRORE';
    cartella?: string;
    errore?: string;
  }>;
}
