-- ==========================================
-- SCRIPT DI PULIZIA DUPLICATI ESERCIZI
-- ==========================================

-- 1. Elimina i duplicati nella tabella exercises mantenendo solo la riga creata per prima
DELETE FROM public.exercises a
USING public.exercises b
WHERE a.id < b.id 
  AND LOWER(TRIM(a.name)) = LOWER(TRIM(b.name))
  AND (a.coach_id IS NULL AND b.coach_id IS NULL OR a.coach_id = b.coach_id);

-- 2. Aggiunge un indice di univocità per evitare duplicati in futuro
CREATE UNIQUE INDEX IF NOT EXISTS unique_exercise_name_per_coach 
ON public.exercises (LOWER(TRIM(name)), (COALESCE(coach_id, '00000000-0000-0000-0000-000000000000'::uuid)));

NOTIFY pgrst, 'reload schema';
