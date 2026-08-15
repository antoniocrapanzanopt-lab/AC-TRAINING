# Regole Operative del Progetto - Builder Athlete Manager

## 1. Natura del Progetto
- L'applicazione è una **piattaforma gestionale in cloud reale**.
- Le funzionalità sono operative e connesse a un database di produzione (Supabase).

## 2. Standard di Codice e TypeScript
- Utilizzare **React** e **TypeScript** senza disabilitare i controlli del compilatore.
- **Vietato usare `any`** per nascondere o bypassare errori di tipo.
- **Vietato usare `@ts-ignore` o `@ts-expect-error`**.

## 3. Gestione Dati e Persistenza
- Il backend ufficiale è **Supabase**. Qualsiasi operazione di lettura/scrittura va effettuata tramite le API di Supabase e le policy RLS.
- L'uso di `localStorage` è deprecato per i dati sensibili, ed è limitato unicamente a preferenze visive (es. stato della sidebar o tab attive).
- I dati inseriti ora sono **reali e sensibili**, va sempre garantita la massima sicurezza e riservatezza.

## 4. Design e Interfaccia Utente
- Mantenere la palette visiva stabilita: **tema nero/antracite** con accenti **giallo oro** e avvisi/errori in **rosso**.
- **Non modificare la linea o il design generale** dell'interfaccia durante le fasi di correzione di bug o refactoring.

## 5. Processo di Verifica e Trasparenza
- Eseguire `npm run check` dopo ogni blocco di modifiche importante.
- Al termine di ogni intervento, indicare sempre con chiarezza:
  1. I file modificati o creati;
  2. I controlli eseguiti;
  3. Gli eventuali problemi residui.

## 6. Regole di Sicurezza Backend, MFA & Migrazioni Database
- Non modificare dati di produzione durante gli audit o controlli.
- Non eseguire DROP TABLE, TRUNCATE o DELETE massivi.
- Non usare gli script legacy come nuove migration.
- Usare sempre migration SQL versionate e idempotenti (`CREATE OR REPLACE`, `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
- `supabase/full_schema.sql` è l'unico riferimento di lettura per lo schema attuale.
- Ogni policy RLS deve specificare chiaramente ruolo, operazione e requisito AAL (`is_coach_aal2()`, `(auth.jwt()->>'aal') = 'aal2'`).
- Le Edge Functions sensibili devono mantenere `verify_jwt = true` e verificare esplicitamente il claim `aal2` quando richiesto.
- I secret devono essere letti esclusivamente dalle variabili d'ambiente server-side (`Deno.env.get`).
- Non stampare token, secret o dati sensibili nei log.
- Le modifiche MFA/RLS devono avere test autorizzativi dedicati.
