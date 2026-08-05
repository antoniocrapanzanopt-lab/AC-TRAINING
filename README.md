# Builder Athlete Manager — Demo Didattica Locale

Application web locale sviluppata in **React**, **TypeScript** e **Vite** per la gestione di atleti, abbonamenti, rateizzazioni pagamenti, comunicazioni multi-canale e reportistica finanziaria per palestre, centri sportivi e coach.

---

## ⚠️ AVVISO FONDAMENTALE — MODALITÀ DEMO LOCALE & PRIVACY

> [!CAUTION]
> **IL PROGETTO È ESCLUSIVAMENTE UNA DEMO DIDATTICA LOCALE**
>
> 1. **Nessun Database & Nessuna Autenticazione Reale**: il sistema non fa uso di Supabase, Firebase, database remoti o servizi cloud.
> 2. **Persistenza in `localStorage`**: tutti i dati generati o caricati risiedono unicamente all'interno della memoria locale del browser web in uso.
> 3. **DIVIETO DI INSERIRE DATI REALI**: non inserire **mai** dati personali reali, dati medici, finanziari, password o token reali. Utilizzare esclusivamente dati dimostrativi e di fantasia.
> 4. **Nessuna Falsa Sicurezza**: i ruoli utente, la matrice dei permessi, le configurazioni API ed i banner privacy/GDPR sono simulazioni locali dimostrative e non sostituiscono un sistema di autorizzazione server-side o la conformità legale reale.

---

## 🌟 Funzioni Principali dell'Applicazione

- **Dashboard Gestionale Reattiva**: 10 card metriche top-level (atleti attivi, scadenze, incassi, insoluti, MRR, ARR, churn) ed azioni rapide con tooltip esplicativi.
- **Gestione Anagrafica Atleti**: registrazione atleti, situazione pagamenti, certificati medici con avvisi di scadenza, timeline eventi e note riservate.
- **Pacchetti & Servizi**: listino dei piani commercializzati con rateizzazioni, sconti in valore/percentuale e durata personalizzata.
- **Gestione Abbonamenti**: attivazione, sospensione (pausa con slittamento automatico delle rate) e rinnovo degli abbonamenti.
- **Storico Pagamenti & Scadenzario**: gestione acconti, saldi, rimborsi motivati e tracciamento dell'audit log finanziario.
- **Registro Attività & Calendario**: gestione task con completamento ed agenda appuntamenti mensili/giornalieri ordinati per data ed ora.
- **Gestione Documenti & Consensi**: caricamento sicuro locale (PDF/JPG/PNG max 1 MB) con codifica Data URL e tracciamento consensi privacy.
- **Centro Comunicazioni**: registro comunicazioni multi-canale (WhatsApp, Telegram, Email, Telefono, SMS, Incontro, App) con modelli a variabili e deep-link precompilati.
- **Report & Statistiche**: 6 grafici Recharts (Incassi mensili, Previsto vs Incassato, Nuovi atleti, Rinnovi, Distribuzione stati, Pacchetti), esportazione CSV e stampa report.
- **Gestione Collaboratori & Matrice Permessi**: supporto a 5 ruoli (`Proprietario`, `Amministratore`, `Coach`, `Segreteria`, `Atleta`), cambio ruolo temporaneo in tempo reale per provare l'interfaccia e trasferimento proprietà dimostrativo.
- **Impostazioni di Sistema**: profilo proprietario con aggiornamento reattivo senza riavvio, cambio tema colore CSS live (`--color-primary`), backup JSON transazionale con rollback, ripristino dati demo a 2 conferme e rimozione proprietario a 2 conferme.
- **Portale Riservato Atleta**: anteprima del portale per gli atleti con selettore dedicato, scheda allenamento demo e documenti personali.

---

## 🛠️ Tecnologie Utilizzate

- **Core**: React 18, TypeScript, Vite
- **Styling**: Vanilla CSS, TailwindCSS, Variabili cromatiche CSS live
- **Grafici**: Recharts
- **Iconografia**: Lucide React
- **Persistenza Dati**: `localStorage` browser con gestione centralizzata delle chiavi in `src/config/storageKeys.ts`

---

## 💻 Requisiti di Sistema

- **Node.js**: versione `18.x` o superiore
- **npm**: versione `9.x` o superiore
- **Browser**: un browser web moderno con supporto a JavaScript ES6 e `localStorage`

---

## 🚀 Guida all'Installazione ed Esecuzione

```bash
# 1. Clona il repository o posizionati nella cartella del progetto
cd "BUILDER ATHLETE"

# 2. Installa le dipendenze
npm install

# 3. Avvia il server di sviluppo locale
npm run dev

# 4. Esegui la verifica dei tipi TypeScript e la build per validare il codice
npm run check
```

---

## 💾 Backup, Importazione e Reset Dati

1. **Esportazione Backup**:
   Genera un file JSON con data nel nome (`builder_athlete_backup_YYYY-MM-DD.json`) contenente unicamente le chiavi registrate dall'applicazione.
2. **Importazione JSON Transazionale**:
   Valida la struttura del file, mostra un'anteprima delle categorie riconosciute e delle chiavi ignorate, ed esegue la scrittura con rollback automatico in caso d'errore o saturazione dello memoria (`QuotaExceededError`).
3. **Ripristino Dati Demo (2 Conferme)**:
   Azione protetta che ripristina i dati dimostrativi dei moduli **conservando il profilo del proprietario**.
4. **Rimozione Configurazione Proprietario (2 Conferme)**:
   Azione protetta che rimuove sia il profilo che tutti i dati locali, eseguendo il logout e ripristinando la schermata di prima configurazione.

---

## 🎓 Scopo Educativo

Questo progetto è stato creato a scopo didattico e dimostrativo per mostrare le migliori pratiche di sviluppo in **React e TypeScript**, la gestione reattiva dello stato locale e la progettazione di un'interfaccia utente moderna ed accessibile.
# AC-TRAINING
