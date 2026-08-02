# Regole Operative del Progetto - Builder Athlete Manager

## 1. Natura del Progetto
- Il progetto è esclusivamente una **demo didattica locale**.
- Non dichiarare mai come reale una funzione che è solo simulata.

## 2. Standard di Codice e TypeScript
- Utilizzare **React** e **TypeScript** senza disabilitare i controlli del compilatore.
- **Vietato usare `any`** per nascondere o bypassare errori di tipo.
- **Vietato usare `@ts-ignore` o `@ts-expect-error`**.

## 3. Gestione Dati e Persistenza
- Non aggiungere Supabase, Firebase o altri database esterni senza richiesta esplicita dell'utente.
- Usare `localStorage` esclusivamente tramite **chiavi centralizzate**.
- **Vietato usare `localStorage.clear()`**.
- **Vietato inserire dati reali**: nessun dato personale, medico, finanziario o credenziale reale deve essere presente nel codice o nei dati dimostrativi.

## 4. Design e Interfaccia Utente
- Mantenere la palette visiva stabilita: **tema nero/antracite** con accenti **giallo oro** e avvisi/errori in **rosso**.
- **Non modificare la linea o il design generale** dell'interfaccia durante le fasi di correzione di bug o refactoring.

## 5. Processo di Verifica e Trasparenza
- Eseguire `npm run check` dopo ogni blocco di modifiche importante.
- Al termine di ogni intervento, indicare sempre con chiarezza:
  1. I file modificati o creati;
  2. I controlli eseguiti;
  3. Gli eventuali problemi residui.
