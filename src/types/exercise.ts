// ─── Tipi primitivi per i valori fissi degli esercizi ─────────────────────────

export type ExerciseCategory =
  | 'Petto'
  | 'Dorso'
  | 'Gambe'
  | 'Spalle'
  | 'Bicipiti'
  | 'Tricipiti'
  | 'Addominali'
  | 'Full Body'
  | 'Cardio'
  | 'Altro';

export type ExerciseEquipment =
  | 'Bilanciere'
  | 'Manubri'
  | 'Macchina'
  | 'Cavi'
  | 'Corpo Libero'
  | 'Kettlebell'
  | 'Elastici'
  | 'Altro';

/** Tipo di stimolo allenante principale */
export type ExerciseType =
  | 'Forza'
  | 'Ipertrofia'
  | 'Resistenza'
  | 'Potenza'
  | 'Mobilità';

/** Modalità di esecuzione rispetto alla simmetria corporea */
export type Bilaterality =
  | 'Bilaterale'
  | 'Unilaterale';

/** Piano anatomico di esecuzione del gesto motorio */
export type MovementPlane =
  | 'Sagittale'
  | 'Frontale (scapolare)'
  | 'Frontale'
  | 'Trasverso'
  | 'Multi-piano';

/** Tipo di catena cinetica nel pattern di movimento */
export type KineticChain =
  | 'Aperta'
  | 'Chiusa'
  | 'Mista';

/** Ruolo del muscolo nell'esercizio */
export type MuscleRole =
  | 'Target'
  | 'Sinergico'
  | 'Stabilizzatore'
  | 'Motore dinamico';

/** Profilo della curva di resistenza */
export type ResistanceCurve =
  | 'Gravità (costante)'
  | 'Ascendente'
  | 'Discendente'
  | 'Parabolica'
  | 'Variabile (cam)'
  | 'Costante (cavi)';

// ─── Sub-interfaces strutturate ────────────────────────────────────────────────

/** Singola voce della mappa dei muscoli coinvolti nell'esercizio */
export interface MuscleInvolvement {
  /** Nome del muscolo in italiano (es. "Deltoide medio") */
  muscolo: string;
  /** Ruolo funzionale nel gesto motorio */
  ruolo: MuscleRole;
  /** Percentuale di coinvolgimento stimata (0–100) */
  percentuale: number;
}

/** Descrizione strutturata di una singola fase del gesto motorio */
export interface ExecutionPhase {
  /** Descrizione sintetica della fase (es. "Sollevamento controllato") */
  descrizione: string;
  /** Vettore di movimento del segmento corporeo */
  vettore_movimento?: string;
  /** Vettore della resistenza esterna */
  vettore_resistenza?: string;
  /** Traiettoria dell'arto nel piano di movimento */
  traiettoria?: string;
  /** Cue verbali per il coach e l'atleta */
  cues: string[];
}

/** Schema completo di esecuzione dell'esercizio */
export interface ExerciseExecution {
  /** Lista dei punti chiave per il posizionamento iniziale */
  setup: string[];
  /** Dettaglio della fase concentrica (sollevamento) */
  concentrica: ExecutionPhase;
  /** Dettaglio della fase eccentrica (discesa) */
  eccentrica: ExecutionPhase;
}

/** Parametri biomeccanici e di programmazione chiave */
export interface ExerciseKeyParams {
  /** Range of motion descrittivo (es. "0°–90° abduzione spalla") */
  rom: string;
  /** Profilo della curva di resistenza */
  curva_resistenza: ResistanceCurve;
  /** Punto di picco tensione nel ROM (es. "Metà ROM ~45–60°") */
  punto_picco: string;
  /** Tipo di stimolo allenante principale */
  tipo_stimolo: ExerciseType;
  /** Range Time Under Tension in secondi */
  tut: { min: number; max: number };
  /** Range di recupero in secondi */
  recupero: { min: number; max: number };
}

/** Dati di sicurezza, controindicazioni e criteri di arresto */
export interface ExerciseSafety {
  /** Lista dei pattern motori errati da evitare */
  compensi_da_evitare: string[];
  /** Condizioni che richiedono l'interruzione immediata dell'esercizio */
  criteri_arresto: string[];
  /** Patologie o condizioni per cui l'esercizio è controindicato o va modificato */
  controindicazioni: string[];
  /** Note sulle tolleranze e adattamenti per pazienti con limitazioni */
  tolleranze: string;
}

// ─── Interfaccia principale ExerciseItem ──────────────────────────────────────

/**
 * Rappresenta un esercizio nella libreria del coach.
 * I campi strutturati (a partire da `tipo`) sono opzionali per retrocompatibilità
 * con gli esercizi già presenti nel database prima della v2 dello schema.
 */
export interface ExerciseItem {
  id: string;
  coach_id?: string | null;
  name: string;
  category: ExerciseCategory;
  equipment: ExerciseEquipment;
  video_url?: string | null;
  instructions?: string | null;

  // ── Informazioni Chiave (opzionali, v2 schema) ──────────────────────────
  tipo?: ExerciseType | null;
  bilateralita?: Bilaterality | null;
  piano_movimento?: MovementPlane | null;
  catena_cinetica?: KineticChain | null;
  gradi_liberta?: number | null;

  // ── Blocchi JSONB Strutturati (opzionali, v2 schema) ────────────────────
  parametri_chiave?: ExerciseKeyParams | null;
  muscoli_coinvolti?: MuscleInvolvement[] | null;
  esecuzione?: ExerciseExecution | null;
  sicurezza?: ExerciseSafety | null;

  created_at?: string;
  updated_at?: string;
}
