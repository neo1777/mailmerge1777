# mailmerge1777 — Documentazione Tecnica

Questa documentazione è rivolta agli sviluppatori e ai manutentori dell'applicazione **mailmerge1777**. Descrive a fondo l'architettura, le decisioni tecniche prese alla base del progetto, le dinamiche di flusso dei dati e le operazioni indispensabili alla sua progressione.

## 1. Panoramica architetturale

mailmerge1777 segue un'organizzazione **ibrida mediante monorepo** composta dallo strettissimo legame tra un frontend generato in React v19+ Vite ed un Backend che opera mediante Express v4, vivendo per la quasi totalità sul medesimo processo process.env Node.js nel bel mezzo dello sviluppo, ma che poi disaccoppiano le proprie mansioni durante un dispiegamento in ambienti produttivi (una porzione su web statico, l'altra apposta per un desktop di calcolo isolato).

```text
[Browser utente]
     |
     | HTTPS
     v
[GitHub Pages]                    [PC locale — server Node.js]
neo1777.github.io/mailmerge1777   localhost:3001
     |                                 |
     | HTTP/REST                       |
     | VITE_API_BASE_URL               |
     +-------------------------------->+
                                       |
                              +--------+--------+
                              |        |        |
                           [pdf-lib] [nodemailer] [exceljs/csv-parse]
                              |        |        |
                           [PDF]    [SMTP]   [File system locale]
                           generati  Aruba   Excel, log CSV, config
```

## 2. Perché questa architettura — decisioni motivate

**Perché monorepo Express+Vite (non frontend e backend separati)**
Il server Node/Express serve staticamente il frontend compilato all'interno di scenari aziendali su rete privata (lo Scenario B), ma parallelamente funge già da proxy API trasparente durante lo sviluppo. Il risultato è la cessazione istantanea dei problemi legati alla configurazione CORS di rete, e la praticità imbattibile di condividere repository (inclusi tipi/TS). Dividerli in repository indipendenti richiederebbe uno spezzatino asettico di codebase disunito.

**Perché GitHub Pages per il frontend**
L'opzione di delocalizzare interfacce in modo statico garantisce una piattaforma sempre online. Nessun costo di server. Un'Action compila tutto in un unico istante senza l'obbligo di ri-tampinare gli utenti. La controindicazione (o trade-off) di un sito interamente statico che richiama dati da `localhost` sta tutto in una richiesta URL `localhost:3001` per bypassare i certificati di protezione. Funziona appieno solamente in loopback se il server gira sulla macchina locale medesima.

**Perché backend locale e non un servizio cloud**
L'azienda manipola dati inerenti al business assoluto. Mail aziendali sensibili, accessi SMTP, nomi ed indirizzi, contratti fiscali con cifrature. Caricare server cloud gratuiti esproprirebbe file intimi ai dipendenti verso la rete. Per giunta non si avvertiva la necessità o il senso economico di noleggiare infrastrutture serverless robuste per flussi circoscritti, avendo le workstation aziendali.

**Perché pdf-lib e non PyMuPDF o altri**
`pdf-lib` sbriga in completa autonomia (senza dipendenze C/C++) un parser intero dedicato per gli standard PDF (Acropdf e FormFields). È nativo per l'ambiente npm di TypeScript e Javascript. Librerie affini come PyMuPDF ci avrebbero scaraventato in buchi neri di configurazioni, necessitando python3-dev installati. Con `pdf-lib` la compilazione sul campo per "Name" funziona in pure-TS in modo chirurgico.

**Perché Nodemailer e non un servizio transazionale (SendGrid, Mailgun)**
Avendo volumi stagionali limitati o ben districati a 10k email massimo divisi in turnazioni settimanali, lo standard SMTP aziendale Aruba preassegnato risulta ideale, evitando di impiegare tempo e abbonamenti superflui, e permettendo alle email partenti di usufruire dei record DNS e mail in uscita già sdoganati da Aruba del proprio domino senza interfacciarsi a SPF di server terzi.

**Perché TypeScript strict su tutto il progetto (frontend e backend)**
Adottando un unico linguaggio tra i front-end web e il backend di smistamento non vi esistono incongruenze da marshalling o parse tra l'invio web in `Step` e l'estrazione dati sul backend. Inoltre `tsx` sorregge un rapido hot-reload privo d'inceppamenti per Express e tutto in TS previene bachi fatali ed aiuta al refactoring costante.

**Perché csv-parse per il log in Resume invece di split(',')**
Nel tracking dei CSV d'invio passati, un banale e debole `myVal.split(',')` sarebbe risultato deleterio ogniqualvolta che in un record ci s'intrufolava all'interno una virgola non codificata per doppi apici (es. la classificazione formale *"Rossi, Mario SPA"* sfalzerebbe di una colonna l'indirizzo email). La suite `csv-parse` decostruisce il quoting di protezione sui tracciati e isola meticolosamente ogni colonna usando veri e propri indici nominali per chiavi. Lavorando sempre senza errori e recuperando lo stream di memoria senza corruttele. 

## 3. Flusso dati completo

Il ciclo di vita che abbraccia lo start up fin al postino SMTP segue quest'ordine sequenziale minuzioso per tutti:

1. Import del file Excel/CSV dall'Utente Web in UI → inoltro su `POST /api/data/parse`. Il backend smista la chiamata al modulo `dataService.ts`. In questa sala avvengono parse con zero-padding automatici in CAP e normalizzazione del body email e rigonfiamento. Viene quindi emesso in Output un Array strutturato e castato di `Destinatario[]`.
2. L'Utente immette e decodifica in preview il master Template → L'AcroForm sviscerato nel buffer finisce nel `POST /api/pdf/fields`. pdf-lib scansiona tutti gli handle dei bottoni/text input in esso racchiusi. Identifica automaticamente le zone marchiate con attributo nativo `readOnly`.
3. L'utente mappa le caselle visualizzando un array in React con `MapObject`. Ogni transizione o refresh si propaga solo sull'ecosistema VITE.
4. Partenza sincrona del Job a seconda della modalità scelta in *Step 5*:
   - Modalità Email (`POST /api/email/send`) che avoca al worker `emailService`.
   - Modalità File (`POST /api/output/generate`) che avoca al worker `outputService`.
5. I due branch operano similmente su un loop.
   - **Modalità Email**: Appiattisce colonna per colonna, genera PDF in `pdf_generati` e trasmette a Nodemailer, per poi mettersi a riposo temporaneo (`Rate Limiting`). Aggiorna il tracker CSV log.
   - **Modalità File**: Disegna una complessa ramificazione di DIR nel folder `/output`, per ogni utente esporta la nota PDF e compila la lettera in formato testuale puro (`.txt`). Ignora del tutto l'overhead di rete SMTP. Al termine comprime in `.zip` mediante il pacchetto performante `archiver`.
6. Attraverso lo Status del Fetch-Rate Web il frontend continua il polling periodico ad ogni 1000m/s a `/api/email/status/current` o `/api/output/status/current`.
7. Segnale d'End/Interruzione in GUI. Esportazione ed end point per download al csv log o al pacchetto ZIP finale.

## 4. Struttura del progetto — annotata

```text
/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions per deploy automatico del frontend
├── docs/
│   └── TECHNICAL.md            # Questo documento, guida architetturale completa
├── src/
│   ├── api/                    # Strato d'accesso Web e API Helper (Axios client)
│   ├── backend/
│   │   ├── routes/             # Controller delle rotte API Express isolate per argomento (es. system.ts, email.ts)
│   │   ├── services/           # Logica di business heavy: emailService (SMTP), pdfService (pdf-lib, acrocompilation)
│   │   └── server.ts           # Boot del processo Node.js e setup base Express (cors, static file serving res.sendFile)
│   ├── components/             # Organizzazione file-based React per Elementi (Barre di completamento, modali)
│   ├── hooks/                  # Hook di riutilizzo per interazioni in Real Time e check os
│   ├── pages/                  # Route view principali che determinano i moduli operativi Step1 => Step...
│   ├── types/
│   │   └── index.ts            # Il nucleo rigido dei Tipi condiviso indiscriminatamente fra NodeJS e Browser
│   ├── utils/                  # Wrapper string o format date per general purpose
│   ├── App.tsx                 # Master Routing Point per gli Step in Browser. Layout
│   └── index.css               # Setup per Tailwind @styles
├── .env.example                # Blueprint base per la gestione Environment secret portati in backend locale
├── package.json                # Definizione start scripts, TS runned configuration in backend Vite plugin array
├── vite.config.ts              # Configurazione build e dev mode per compilare l'app
├── start.bat                   # Avvio user-friendly su Windows 
├── start-network.bat           # Avvio locale visibile all'intera LAN/DHCP (Scenario B)
├── start-mac.sh                # Avvio user-friendly su ambienti macOS
└── start-linux.sh              # Avvio user-friendly su ambienti Ubuntu/Arch
```

## 5. API Reference completa

### GET `/api/system/health`
**Descrizione**: Sonda elementare atta alla rilevazione e polling per definire lo status Online od Offline.  
**Input**: Nessuno   
**Output**: `{"status": "ok", "timestamp": "2023-XX-XXT12:00:Z... "}`   
**Errori**: `503 | Timeout (Se non online)`

### GET `/api/system/disk`
**Descrizione**: Ricava ed espone un resoconto limitato alle path correnti sulla macchina Node locale ove sta girando il server, calcolando i byte in disco.   
**Input**: Nessuno  
**Output**: JSON Object delle path ed info os string

### POST `/api/data/parse`
**Descrizione**: Estrapola tutto il succo testuale/numerico partendo da File System Stream form CSV, xlsx di Microsoft convertendolo.   
**Input**: FormData HTML nativo contenente file Excel/CSV   
**Output**: `Array<Destinatario>` convertito in tipi noti, contenente le `invalidRows` (se presenti).  
**Errori**: `400 File Assente o Formato illeggibile`

### POST `/api/pdf/fields`
**Descrizione**: Espone allo Step del frontend l'Array completo dei box AcroField ricavato dal PDF in entrata.  
**Input**: Un pdf template  
**Output**: `Array<Field> formata su {name: String, readOnly: boolean}`  
**Errori**: `400 Errore Parsing file, Buffer null`  

### POST `/api/pdf/preview`
**Descrizione**: Produce e renderizza a video al volo una precompilatura isolata nel browser basata su array finto/passato al momento.  
**Input**: JSON payload per dati mappamento  
**Output**: BLOB stream Buffer Base64 `application/pdf` da incastonare via window.url  
**Errori**: `500 Eccezioni PDF-Lib se un campo viene chiamato incorrettamente`

### POST `/api/pdf/generate-all`
**Descrizione**: Salta a piè pari i rate limiti inviando tutto il tracciato PDF in stampa bulk. Utile e necessario per un dryrun isolato senza smtp.  
**Input**: Payload configurazione job  
**Output**: Status JSON d'inizio operazioni limitato.  
**Errori**: `4xx Permessi disco negati`

### POST `/api/email/test-smtp`
**Descrizione**: Istanzia una singola chiamata asincrona con `verify()` Nodemailer.   
**Input**: JSON di `smtp:{ host, port, user, pass }`  
**Output**: `{success: boolean}` (o stringa failure specifica)  
**Errori**: Tutte le Exception certificate nodemail in string `TLS Auth Reject` ecc. 

### POST `/api/email/send`
**Descrizione**: Rileva un mapping, stanzia nel Pool un nuovo JobWorker fittizio per riempire la lista della coda email e PDF, e da inizio.  
**Input**: `{destinatari, mapping, ...} Configuration completa`  
**Output**: `{ jobId: "uuid" }`  
**Errori**: `400 Credenziali non fornite, 500 eccezione d'avvio`

### GET `/api/email/status/current`
**Descrizione**: Il router emette di rimando la scansione e posizione temporale della RAM alloggiata all'ID del backend per dar i valori d'avanzamento d'invio.  
**Input**: Nessuno   
**Output**: Formato `StatoJobDettaglio` TypeScript completa oppure `{stato: 'nessun_job'}`    
**Errori**: `Nessuno`

### POST `/api/email/stop`
**Descrizione**: Comunica l'urgenza di set in killswitch per il thread.  
**Input**: Nessuno  
**Output**: `{ ok: true }`  
**Errori**: `Nessuno`

### POST `/api/output/generate`
**Descrizione**: Simile a /api/email/send, ma stanzia un job per la creazione di file locali su HD (Modalità File) generando cartelle e ZIP.
**Input**: `{destinatari, mapping, pdfTemplatePath, configEmail, opzioniOutput, ...}`
**Output**: `{ jobId: "uuid" }`
**Errori**: `500 eccezione d'avvio o problemi permessi disco`

### GET `/api/output/status/current`
**Descrizione**: Equivalente a email/status/current, ma restitusce l'andamento del job sulla creazione delle cartelle file e dello ZIP.
**Input**: Nessuno
**Output**: `StatoJobOutput` oppure `{stato: 'nessun_job'}`
**Errori**: `Nessuno`

### POST `/api/output/status/current/stop`
**Descrizione**: Ferma il job di generazione file locale.
**Input**: Nessuno
**Output**: `{ ok: true }`
**Errori**: `Nessuno`

### GET `/api/output/download/zip`
**Descrizione**: Fornisce in download diretto l'archivio ZIP se quest'ultimo è stato prodotto dalla Modalità File.
**Input**: Query string `folder` indicante il set di destinazione.
**Output**: File ZIP.
**Errori**: `404 se ZIP inesistente`

### GET `/api/log`
**Descrizione**: Legge dal File ed estrude l'history tabellata CSV riordinabile in formato per tabella Web.  
**Input**: Nessuno  
**Output**: Array di Logs   
**Errori**: `N/a`   

### GET `/api/log/download`
**Descrizione**: Force-triggering al parametro Header Attachment originando cosi il file "Log.csv" dritto negli handler browser dell'Utente.  
**Input**: Nessuno    
**Output**: Un file Stream .csv     
**Errori**: `404 log non reperibile`     

### GET `/api/config`
**Descrizione**: Legge la configurazione da `config.json` per riempire i form di avvio salvati in locale.
**Input**: Nessuno  
**Output**: Config Object in testo in chiaro (seppur non comprendente pw in log)  
**Errori**: `404 Config mancante o illegibile`   

### POST `/api/config`
**Descrizione**: Sostituisce su override parziale o intero l'albero di impostazioni in JSON locale per l'app.
**Input**: Payload json configurazione    
**Output**: Success / Boolean     
**Errori**: `403 Permessi negati Write, 500 parse`     

## 6. Interfacce TypeScript condivise

Tutte le interfacce essenziali in `src/types/index.ts` sono usate rigorosamente in simmetria:

```typescript
// Singolo destinatario processato, colonna base per il flusso d'email.
export interface Destinatario {
  _email: string;              // Destinazione principale estratta per Nodemailer 
  CODICE?: string;             // Codice primario gestionale Univoco in Excel per referenza
  [key: string]: any;          // Chiavi dinamiche estratte per compilazione testo o PDF variabili
}

// Stato istantaneo del processo d'inoltro (Polling)
export interface JobStatus {
  id: string;                  // Hash/Uuid assegnato al job in creazione
  stato: 'idle' | 'in_corso' | 'completato' | 'interrotto' | 'errore'; 
  totale: number;              // Quantita' di indirizzi email individuati da elaborare
  inviati: number;             // Count delle spunte OK restituite da smtp
  errori: number;              // Sommathori di eccezioni lanciate
  percentuale: number;         // Calcolo 0-100 per UI front-side
  corrente?: {                 // Il target in canna della pipe server
    email: string;             
    ragioneSociale: string;    
  };
  ultimiLog: Array<{           // Array storico ritardato per la mini UI console
    tipo: 'info' | 'success' | 'error'; 
    messaggio: string; 
    timestamp: string 
  }>;
  stopRichiesto: boolean;      // Booleano interno per arrestare for-loop e Nodemailer
  dryRun?: boolean;            // Flag visivo di prevenzione email "Simulazione"
}
```

## 7. Sicurezza

- **Password SMTP**: L'interscambio HTTP è protetto da un costrutto in shallow copy che espella il campo `pass` prima di un Response verso il browser, bloccando una lettura indesiderata. La manipolazione del config file bypassa questo strato solamente in salvataggio.
- **CORS**: Lasciato completamente aperto (`*`). Essendo una base applicativa rivolta all'utente singolo o ad una fiduciaria Intranet/LAN, l'ingente blocco CORS servirebbe unicamente da potenziale noia a chi naviga dal proprio cellulare al portatile in rete.
- **Dati clienti**: Tutto il payload del CSV e i Byte PDF viaggiano unicamente in RAM (memoria effimera). Una volta concluso il batch o a server spento, non vi è nessuna persistenza. Non si fa uso di IndexedDb o database relazionali su file.
- **PDF generati**: Vengono trascritti direttamente dal backend sul Filesystem al sicuro, privi d'ogni endpoint pubblico. Il frontend sfiora l'accesso solo ricevendo Base64 blindati, senza link statici scaricabili da esterni.
- **config.json**: Mantenuto nascosto con cautela su `.gitignore` per escludere qualsiasi git push non intenzionale che sveli agli annali l'indirizzo delle credenziali SMTP personali.

## 8. Rate limiting — strategia e parametri

Lo spezzettamento asincrono d'inoltro poggia su un banalissimo loop per Batch ciclico.
Il razionale per l'esclusione di Code/Workers in librerie dedicate (es. BullMQ + Redis) attiene ai requisiti stringenti di "zero dipendenze installabili", portando in trionfo una serie sincrona ritardata con `SetTimeout()`.

A favore dello standard nominale per provider nostrani quali Aruba/Register, la formula s'assesta a:
- Elementi per blocco (Batch-size): 30
- Attesa tra singolo catch email (Slow-pace Ms): 3 sec `(3000ms pauseTraEmailMs)`
- Tappo post blocco (Cooldown): 10 min.

Così facendo il regime viaggia ben sotto l'avviso SMTP di limite burst (`~100 mail/h`).
L'UI frontend non avverte latenza ma stima fin dall'inizio il calcolo `(N * pauseTraEmail) + ((N / batch) * cooldown)` proiettando una deadline confortevole che mitiga l'attesa per l'operatore.

## 9. Deploy e CI/CD

Il progetto vive d'un workflow Action `.github/workflows/deploy.yml` molto peculiare ed elegante per lo strato Web:
- Il trigger è limitato su branch logica (push su `main`) e fallback per inneschi manuali disposti con o senza webhooks da repository.
- **Job Build**: Paga dazio ad un esecuzione nativa `Node-20`, istallazioni pulite `npm ci` da lockfile blindato, un overriding palese delle var d'ambiente come `VITE_API_BASE_URL` per dirottare con astuzia il sito Web statico all'interrogazione automatica sul porto `localhost:3001` d'default qualora non rincari l'ambiente `env` locale.
- **Job Deploy**: Dissezionato ed agganciato con i pass `pages: write` e gli upload di certificato `id-token` per bypassare protezioni standard. Termina prelevando dall'Artifact la sub-dir `/dist` infarcendola brutalmente e con grazia in Github Pages.

## 10. Estensioni future consigliate

- **Servizio Windows (nssm)**: Creare uno snippet `.bat` secondario tramite l'uso dell'ottimo tool free "NSSM" per far iscrivere al demone windows l'app come servente all'accensione PC senza tener perennemente aperte GUI o prompt terminal. *(Bassa complessità)*
- **Supporto OAuth2 per SMTP Gmail/Microsoft 365**: La decantazione dei Token Exchange Microsoft M365 (o Oauth Google Workspace) eviterebbe l'abuso in "Application Password" fornendo garanzia a pieno campo ma portando in serbo complessità d'approvazione redirect per client in loopback. *(Media complessità)*
- **Preview PDF inline nel browser (PDF.js)**: Impiegare la suite Mozilla PDF.js anziché i `<iframe>` o emb tag per un render canvas nativo che sfugge dai fastidiosi layout proprietari forzati dai Browser Chrome ed affini. *(Media/Alta complessità)*
- **Supporto template email HTML con editor visuale**: Innesto d'editor Wysiwyg (react-email) visivo durante lo step formativo email. *(Media complessità)*
- **Firma digitale dei PDF generati**: Incastro e vidimazione dei PDF esportati in PADES e firma cifrata post-render pre-spremitura SMTP. *(Alta complessità)*
- **Notifica webhook al completamento invio**: Imbustazione asincrona via fetch ad MS Teams o Slack per le esecuzioni notturne massive e il recap in tempo reale verso lo shutdown. *(Bassa complessità)*

## 11. Troubleshooting tecnico

Di seguito gli ostacoli d'ambiente Node/Rete più noti e prassi risolutive:

- **Porta 3001 occupata**: Se `localhost:3001` va in bind e crasha in EADDRINUSE bisogna setacciare il pid incriminato da resource manager e terminarlo manu militari oppure manipolare l'header env PORT per Nodejs all'interno degli `start.bat`.
- **Script Windows \`start.bat\` si chiude o non rileva l'installazione npm**: Il tool è stato ristrutturato usando l'architettura `goto` basica per sfuggire all'espansione differita dei `%errorlevel%` nei blocchi `if` sintattici in DOS. In caso di fallimento per la rintracciabilità dei PATH, l'algoritmo include il download unattended di Node.js via `winget`. Se anche questo subisce un block amministrativo, proietterà sul browser la pagina `https://nodejs.org/it/download` mettendo in blocco d'attesa l'esecuzione.
- **Esecuzione dall'interno dello ZIP in Windows**: Lo script `start.bat` avverte esplicitamente chi avvia erroneamente lo script dall'editor compresso controllando la presenza fisica di `package.json` nella radice estratta (`if not exist package.json goto NO_PACKAGE`).
- **Firewall Windows per accesso in rete (Scenario B)**: Qualora post `start-network` null'altro in LAN accenni aperture, la problematica è alacremente Defender:
  Avete bisogno d'un CMD Administator `netsh advfirewall firewall add rule name="MailMerge3001" dir=in action=allow protocol=TCP localport=3001` per fare un varco esplicito.
- **npm install fallisce su Windows per permessi**: Se l'eseguibile cade in `ERR! ENOGIT` o i diritti di Folder mancano, forzare il fallback all'installazione locale. Nelle recenti versioni del batch è stato impostato `npm install --silent` per ridurre l'invocazione di warning non critici a terminale.
- **pdf-lib non trova i campi**: Verifichiamo se il file generante o il master acro è difettivo ispezionando dritto dritto nel back con `console.log(form.getFields().map(f => f.getName()))`. Qualora ritornasse array [] a 0, il pdflib non sta in palese modo fiutando gli standard "Form Field" o questi sono stati rasterizzati male dal visualizzatore PDF sorgente (forse "print-to-pdf" anziché un salvataggio master?).
- **SMTP Aruba TLS errors**: Su server in hosting economici è categorico tenere il setting node TLS a `rejectUnauthorized: false` a meno di imbattersi in "Error Secure cert invalid" stroncando la fetch. Nodemailer ci prova di default ma si rassegna in carenza di certificato per root autoritativo noto.
- **GitHub Actions fallisce su npm ci**: Spesso dopo commit non verificati, un albero obsoleto `package.json` scampa il re-hash a discapito del `package-lock.json`. Un mis-match disintegra l'Action in fase build (che deve esser cieca per security reason e rigorosamente un-mutable). Rimuovere da PC `package-lock`, rilanciare NPM I e fare commit nuovamente ricostruisce solidificando la build.

## 12. Fix SPA routing su GitHub Pages

Le applicazioni Single Page Application (come React con React Router in modalità BrowserRouter) richiedono che il server reindirizzi tutte le path a `index.html`. Poiché GitHub Pages serve solo file statici e non supporta rewrite a livello server, un ricaricamento della pagina in percorsi deep (es. /step2) provocherebbe un errore 404.
Per risolvere questo limite, abbiamo adottato una strategia a doppio step:
**1. `public/404.html`**: Quando GitHub Pages non trova la risorsa, serve questo file speciale che usa uno script JS (definito come `SPA redirect trick`). Lo script converte la path mancante in una stringa di query params e reindirizza immediatamente a `index.html` passandola nella root (con l'accortezza di preservare i sub-path grazie a `pathSegmentsToKeep = 1`).
**2. `index.html`**: Nella `<head>` principale dell'app, prima ancora di avviare il bundle Vite di React, uno script gemello intercetta ed estrae i query params del punto 1, ripristinando in modo invisibile la History API locale del browser sulla path corretta come nulla fosse successo. A quel punto, React e il suo Router si occupano di renderizzare la corretta View.

## 13. Pacchetto server statico

Dovendo scaricare un archivio .ZIP contenente il Backend (Server Express o Batch) indipendente dal Server Frontend ospitato remotamente ed isolato, ed occorrendo parimenti che questo zip fosse fruibile a Server ancora *inattivo* da una macchina client ignara, operiamo con l'astuzia.
Il pacchetto non è generato al volo dal backend locale se è spento, ma **staticamente a build time** sfruttando le Actions. 
- Durante `npm run build` su GitHub Actions, prima che venga attivato il dist di Vite JS, un custom script lanciato con `node scripts/build-server-package.js` scansiona il backend, ne astrae i minimi requisiti (codice server, un package.json epurato, start-scripts cross-OS) e lo assemblita in `mailmerge-server.zip` posizionato dentro `/public/`.
- Perciò diviene un file statico normalissimo allegato al Frontend compilato, costantemente ospitato da GitHub Pages e disponibile via link `<a>` immediato tramite interfaccia da tutto il mondo in assenza totale di Express Server attivo.

## 14. Parsing flessibile e pulizia dati

La solidità dell'import massivo dipende enormemente dalle variazioni linguistiche aziendali per gli Header (colonne).
Il sistema di **alias** configurato per le colonne standard (come `COLONNA_ALIASES` in `dataService`) sconfigge l'entropia normalizzando decine di suffissi, spazi spuri e casi accidentali in denominazioni uniformi.
Questo sub-service agisce al calcolo di pulizia totale attraverso la funzione `pulisciStringa()`, che non incappa mai nel solo campo *Agente* ma opera iterativamente su **tutti** i valori in stringa in transito della raw-row di un CSV o XLSX in via di parse, curando persino la neutralizzazione e la soppressione radicale del famigerato carriage return corrotto `_x000D_` nativo Excel. In questo modo è impossibile che le stringhe ereditino line-break fantasma dentro ad un PDF AcroForm. La flessibilità risiede anche nell'implementare regole di validazione uniche in base al campo (es: auto pad-start d'uno `0` per i vari CAP, trimming preventivo).
Come caso degno di nota, nel *Data Parsing* la casella "email" possiede regole selettive d'assolutezza condizionata: benché consigliata, è definita "opzionale" nell'algoritmo; lasciarla vacante causerà avviso di preclusio solo verso un espletamento in Modalità Email, ma perdonerà e avancerà spedito per i set dedicati ad operare unicamente per la Modalità Generazione File dove la validità non concerne una spedizione ma una transcodifica a FS cartella.
