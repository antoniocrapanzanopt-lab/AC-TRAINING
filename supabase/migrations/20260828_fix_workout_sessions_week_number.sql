-- Migration: 20260828_fix_workout_sessions_week_number.sql
-- Descrizione: Corregge retroattivamente i record di workout_sessions con week_number non valido (es. 20 o eccedente total_weeks della scheda).

-- 1. Allinea week_number delle sessioni collegate ad una scheda valida se supera il totale settimane o se era hardcoded/errato
UPDATE public.workout_sessions ws
SET week_number = LEAST(GREATEST(1, ws.week_number), COALESCE(w.total_weeks, 1))
FROM public.workouts w
WHERE ws.workout_id = w.id
  AND (ws.week_number > w.total_weeks OR ws.week_number = 20 OR ws.week_number IS NULL OR ws.week_number <= 0);

-- 2. Correzione di sicurezza per eventuali sessioni orfane o con week_number anomalo rimaste a 20
UPDATE public.workout_sessions
SET week_number = 1
WHERE week_number = 20 OR week_number IS NULL OR week_number <= 0;
