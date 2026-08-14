import { z } from 'zod';

// Definizione dello schema Zod per AIWorkoutExercise
export const aiWorkoutExerciseSchema = z.object({
  week_number: z.number().int().min(1),
  day_name: z.string().min(1),
  name: z.string().min(1),
  sets: z.number().int().min(1),
  reps_target: z.string().min(1),
  rest_seconds: z.number().int().min(0),
  target_weight: z.string().optional(),
  rir_target: z.string().optional(),
  tut: z.string().optional(),
  notes: z.string().optional()
});

// Definizione dello schema Zod per GeneratedWorkoutResponse
export const generatedWorkoutResponseSchema = z.object({
  classificazione_soggetto: z.string(),
  obiettivo_blocco: z.string(),
  durata_blocco: z.string(),
  frequenza_settimanale: z.string(),
  split_scelta: z.string(),
  tempo_massimo_seduta: z.string(),
  logica_progressione: z.string(),
  programma_giorno_per_giorno: z.array(aiWorkoutExerciseSchema).default([]),
  note_tecniche_essenziali: z.string(),
  regole_adattamento: z.string(),
  domanda_mirata: z.string().optional(),
  blocco_sicurezza: z.string().optional()
});
