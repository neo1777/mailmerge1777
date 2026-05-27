export type OsType = 'windows' | 'mac' | 'linux' | 'unknown';

export interface ScriptInfo {
  os: OsType;
  label: string;
  instructions: string[];
}

export function detectOs(): OsType {
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();

  if (ua.includes('win') || platform.includes('win')) return 'windows';
  if (ua.includes('mac') || platform.includes('mac')) return 'mac';
  if (ua.includes('linux') && !ua.includes('android')) return 'linux';
  return 'unknown';
}

export function getScriptInfo(os: OsType): ScriptInfo {
  const scripts: Record<OsType, ScriptInfo> = {
    windows: {
      os: 'windows',
      label: 'Windows',
      instructions: [
        'Scarica il Server ZIP cliccando il pulsante qui sopra',
        'Estrai la cartella zip (tasto destro -> Estrai tutto) in una directory a piacere',
        'Entra nella cartella estratta e fai doppio clic su start.bat',
        "Lascia aperta la finestra nera durante l'utilizzo dell'app",
        'Torna su questa pagina e aggiornala — lo stato diventerà verde',
      ],
    },
    mac: {
      os: 'mac',
      label: 'Mac',
      instructions: [
        'Scarica il Server ZIP cliccando il pulsante qui sopra',
        'Estrai la cartella zip in una directory',
        'Apri il Terminale e vai in quella cartella',
        'Rendi lo script eseguibile: chmod +x start-mac.sh',
        'Avvia lo script: ./start-mac.sh',
        "Lascia aperto il Terminale durante l'utilizzo",
      ],
    },
    linux: {
      os: 'linux',
      label: 'Linux',
      instructions: [
        'Scarica il Server ZIP cliccando il pulsante qui sopra',
        'Estrai la cartella zip in una directory',
        'Apri il terminale in quella cartella',
        'Rendi lo script eseguibile: chmod +x start-linux.sh',
        'Avvialo: ./start-linux.sh',
        "Lascia aperto il terminale",
      ],
    },
    unknown: {
      os: 'unknown',
      label: 'Sistema',
      instructions: [
        'Scarica il Server ZIP ed estrailo',
        'Se usi Windows: usa start.bat',
        'Se usi Mac/Linux: usa start-mac.sh o start-linux.sh',
      ],
    },
  };

  return scripts[os];
}

export function downloadServerPackage(): void {
  // Punta al file statico generato durante il build e servito da GitHub Pages
  const base = import.meta.env.BASE_URL || '/mailmerge1777/';
  const url = `${window.location.origin}${base}mailmerge-server.zip`;
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mailmerge-server.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
