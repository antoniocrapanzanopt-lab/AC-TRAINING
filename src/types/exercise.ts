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

export interface ExerciseItem {
  id: string;
  coach_id?: string | null;
  name: string;
  category: ExerciseCategory;
  equipment: ExerciseEquipment;
  video_url?: string | null;
  instructions?: string | null;
  created_at?: string;
  updated_at?: string;
}
