# mailmerge1777

[![App Live](https://img.shields.io/badge/App_Live-neo1777.github.io%2Fmailmerge1777-blue?style=for-the-badge&logo=github)](https://neo1777.github.io/mailmerge1777)
[![Deploy Frontend su GitHub Pages](https://github.com/neo1777/mailmerge1777/actions/workflows/deploy.yml/badge.svg)](https://github.com/neo1777/mailmerge1777/actions/workflows/deploy.yml)

**Stampa unione professionale con PDF AcroForm e invio email**
*by neo1777*

---

## Cos'è
**mailmerge1777** è un'applicazione web pensata per automatizzare l'invio massivo di contratti e comunicazioni aziendali. 
L'app carica un elenco di clienti da un file Excel o CSV, compila automaticamente un contratto PDF con i dati specifici di ogni cliente e invia un'email personalizzata a ciascuno con il proprio contratto in allegato. L'app lavora in perfetta sintonia con i PDF AcroForm prodotti dall'app companion [acroform1777](https://neo1777.github.io/acroform1777).

---

## Come funziona
L'applicazione è composta da due parti che comunicano tra loro:

```text
[ Browser Web ] ---- (Interfaccia visiva) ----> GitHub Pages (Sempre online)
       |
       | comunica con
       v
[ Il tuo PC ] -----> Server locale (Fa il lavoro pesante: legge file, crea PDF, invia email)
```

**Perché serve un server locale?**
Il browser da solo non può leggere i file dal tuo computer (se non quelli che selezioni esplicitamente) né può connettersi al volo all'account email aziendale in background senza bloccare la finestra. Il server locale, che gira sul tuo stesso PC, permette di comporre i PDF e spedire le email in sicurezza, garantendo privacy totale visto che i dati dei clienti e le credenziali non passano mai per servizi cloud di terze parti.

---

## Prerequisiti
Per utilizzare correttamente l'applicazione, assicurati di avere:
1. **Node.js 20 o superiore** installato (scarica la versione **LTS** da [nodejs.org](https://nodejs.org/)).
2. Un file **Excel o CSV** contenente i dati dei tuoi clienti, con una colonna dedicata per le email.
3. Un file **PDF con campi AcroForm** compilabili (creato tramite [acroform1777](https://neo1777.github.io/acroform1777)).
4. Le **Credenziali SMTP** del tuo account email aziendale (es. email e password Aruba. Puoi chiederle all'IT).

---

## Installazione server locale (una volta sola)

1. **Windows 10/11**: Non serve installare nulla, il file `start.bat` rileverà l'assenza di Node.js e tenterà l'installazione automatica tramite `winget`. (Per Mac/Linux, installare Node.js 20+ LTS da https://nodejs.org).
2. Aprire l'app nel browser: https://neo1777.github.io/mailmerge1777
3. La barra rossa in cima mostra il pulsante **"Scarica pacchetto server (.zip)"**
4. Scaricare e **estrarre completamente** lo ZIP in una cartella comoda (es. Documenti)
5. Aprire la cartella estratta e avviare lo script per il proprio sistema:
   - **Windows**: doppio clic su `start.bat`
   - **Mac**: terminale → `chmod +x start-mac.sh` poi `./start-mac.sh`
   - **Linux**: terminale → `chmod +x start-linux.sh` poi `./start-linux.sh`
6. La barra diventa verde: il server è attivo

> ⚠️ **FONDAMENTALE**: Il file ZIP **deve** essere estratto prima di aprire lo script.
> L'avvio di `start.bat` dall'interno del visualizzatore ZIP genererà un errore bloccante.

---

## Come si usa — guida passo per passo

### 1. Step 1 — Importa i dati
Trascina o seleziona il tuo file Excel o CSV. L'app verificherà il file e ti mostrerà subito il numero di contatti validi individuati. Verranno evidenziate le righe con anomalie (es. email mancanti, CAP non nel formato corretto, ecc.), elencandone i motivi esatti in modo che tu possa correggerli.

### 2. Step 2 — Carica il template
Trascina o seleziona il file PDF contenente i campi AcroForm. In opzione, puoi caricare anche ulteriori file o allegati "statici" (es. listini o brochure) che verranno spediti uguali per tutti i contatti. *(Attenzione: eventuali file Word non verranno compilati, ma solo spediti come allegato statico).*

### 3. Step 3 — Abbina i campi
L'app individuerà automaticamente i campi compilabili nel tuo PDF e proverà ad abbinarli alle colonne trovate nel file Excel. Controlla che l'abbinamento proposto sia corretto e modifica ciò che preferisci. Un'anteprima in tempo reale ti mostrerà esattamente l'aspetto che assumerà il primo PDF compilato.

### 4. Step 4 — Configura l'email
Scrivi l'oggetto e il testo dell'email. Puoi usare tag di riempimento come `{{NOME_COLONNA}}` per far sì che il software sostituisca il blocco con il valore personalizzato di ogni destinatario (ad es. `{{Ragione Sociale}}`). Puoi inserire anche la firma aziendale e, nota di fondamentale importanza, scegliere di "bloccare" (rendere non modificabili) i dati aziendali inseriti nel contratto PDF, mantenendo sbloccati solo i campi spettanti al cliente.

### 5. Step 5 — Scegli la Modalità e Avvia
Scegli tra due modalità operative esclusive:
- **Modalità Invio Email:** Inserisci le credenziali SMTP (o sfrutta quelle precaricate o storicizzate). Fai un test di connessione prima di procedere, poi definisci la velocità d'invio e accetta le tempistiche stimate. È caldamente suggerito di eseguire una **Simulazione (Dry Run)** per la tua prima volta (non manderà email, ma genererà e salverà i PDF sul tuo PC per farteli controllare).
- **Modalità Generazione File:** Crea in locale le cartelle con PDF e file di testo, ignorando l'invio SMTP reale. Opzionalmente le racchiude in un comodo pacchetto ZIP.

Infine, dai l'OK per procedere.

### 6. Step 6 — Monitora il progresso
Una finestra in tempo reale mostrerà il log dell'operazione. Vedrai il conteggio delle operazioni, qual è il cliente attualmente in lavorazione e, se ci fossero problemi, potrai mettere un attimo in pausa. Se disgraziatamente il server dovesse collassare, lo schermo mostrerà l'ultimo punto in cui il lavoro si è fermato, con un avviso e istruzioni chiare per riprendere. Al completamento, scarica il comodissimo registro scaricando il report CSV, oppure l'archivio ZIP se hai scelto la modalità *Generazione File*.

---

## Funzionalità speciali

**Parsing Excel intelligente**
Riconosce automaticamente i nomi delle colonne anche se diversi dallo standard.
Corregge automaticamente caratteri invisibili (_x000D_), CAP incompleti, spazi extra.
Mostra un rapporto dettagliato dopo il caricamento con mappa colonne, correzioni e avvisi.
L'email non è obbligatoria: se assente, la modalità Invia Email viene bloccata con avviso,
la modalità Genera File funziona normalmente.

**Raggruppamento per agente commerciale**
Se il file contiene le colonne agente, la modalità Genera File offre:
- Cartelle organizzate per agente
- PDF unico per agente con tutte le lettere in sequenza (ideale per la stampa)
Disponibile automaticamente quando le colonne agente vengono rilevate nel file.

- **Due modalità collaudate**: Scegli sempre l'approccio ideale: inoltro automatizzato via email o pacchettizzazione in cartelle strutturate per il rilascio manuale o condiviso.
- **Dry Run (Simulazione)**: genera tutti i PDF e simula l'invio via email senza spedire nulla. I PDF vengono salvati in `./pdf_generati/dry_run/`
- **Resume (Riprendi)**: se l'invio viene interrotto, alla ripresa vengono saltate automaticamente le email già inviate con successo.
- **Stato server in tempo reale**: barra colorata sempre visibile che mostra se il backend è online (verde) o offline (rosso con istruzioni).
- **Rilevamento OS automatico**: quando il server è offline, l'app rileva Windows/Mac/Linux e offre il download dello script di avvio corretto.

---

## Utilizzo in rete aziendale (più utenti)
Se altri colleghi in ufficio hanno bisogno di usare l'applicativo, non serve installarlo su ogni PC. 
Sul PC dedicato fai doppio clic su `start-network.bat`. Lo script mostrerà l'indirizzo IP locale (esempio: `http://192.168.1.50:3001`). 
Fornisci l'indirizzo mostrato ai colleghi: inserendolo nel loro browser vedranno l'applicazione usare la potenza di calcolo (e l'IP) di questa singola macchina. *(Ricorda di abilitare la porta del programma nel Windows Firewall se necessario).*

---

## Aggiornamenti
Ogni push su `main` aggiorna automaticamente il frontend su GitHub Pages (entro 2 minuti). 
Il backend sul tuo PC si aggiorna eseguendo `git pull` nella cartella del progetto e riavviando lo script di avvio.

---

## Risoluzione problemi

| Problema | Soluzione |
|---|---|
| La barra rimane rossa dopo aver avviato il server | Verificare che la finestra nera sia ancora aperta; attendere 10 secondi e aggiornare la pagina. |
| "node non riconosciuto come comando" | Su Windows 10/11 lo script `start.bat` tenta di installare Node.js tramite `winget`. Se fallisce o non è disponibile, lo script aprirà in automatico la pagina di download di Node.js per l'installazione manuale. |
| start.bat si apre e si chiude subito | Probabili problemi di permessi o di espansione variabili d'ambiente. Fai Clic destro sul file `start.bat` → *Esegui come amministratore*. Il nuovo script con struttura a `goto` riduce drasticamente questo rischio operativo rispetto ai parse-block. |
| ERRORE: file package.json non trovato | Stai cercando di eseguire lo script dentro l'archivio compresso ZIP. **Estrai** completamente la cartella prima di far doppio clic. |
| I colleghi non riescono a connettersi in rete | Aprire la porta 3001 nel firewall Windows (istruzioni dettagliate in TECHNICAL.md). |
| Il PDF compilato ha i campi vuoti | Verificare il mapping nello Step 3; controllare che i nomi dei campi AcroForm corrispondano. |
| Errore autenticazione SMTP | Verificare username e password; per Aruba usare la password dell'app se è attiva l'autenticazione a due fattori. |
| GitHub Actions fallisce (croce rossa) | Aprire l'area Actions nel repository su GitHub, cliccare sul workflow fallito, leggere il log dell'errore. |

---

## Struttura file del progetto
Una panoramica della cartella per saperti muovere:
- `.github/workflows/deploy.yml`: Workflow GitHub Actions per deploy automatico.
- `docs/`: Ospita la documentazione tecnica riservata agli sviluppatori e all'implementazione.
- `pdf_generati/`: Cartella in cui l'applicativo salva in locale i PDF creati.
- `src/`: Il sorgente React front-end unito alle rotte Express back-end.
- `package.json`: Organizza i pacchetti necessari per far viaggiare Node.js e React.
- `log_invii.csv`: Conserva un report indelebile sugli invii effettuati.
- `start.bat` / `start-mac.sh` / `start-linux.sh` / `start-network.bat`: Script da linea di comando per il lancio immediato del backend.

---

## Stack tecnologico
L'app è stata realizzata con le seguenti librerie:
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Express](https://expressjs.com/)
- [pdf-lib](https://pdf-lib.js.org/)
- [Nodemailer](https://nodemailer.com/)
- [exceljs](https://github.com/exceljs/exceljs)
- [csv-parse](https://csv.js.org/parse/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## Licenza e crediti
- Progetto sviluppato da neo1777
- App companion: [acroform1777](https://neo1777.github.io/acroform1777)
