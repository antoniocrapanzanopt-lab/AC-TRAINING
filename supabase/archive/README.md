# Archivio Script SQL Legacy (NON ESEGUIRE)

Tutti i file in questa cartella sono script storici o patch parziali create durante le varie iterazioni di sviluppo.

⚠️ **NON ESEGUIRE QUESTI FILE IN PRODUZIONE O STAGING.**

`supabase/full_schema.sql` è il riferimento di lettura dello schema attuale. Non eseguire `supabase/schema.sql` né gli script presenti in `supabase/archive` come migration autonome. Ogni nuova modifica al database deve essere creata come migration SQL versionata e idempotente.
