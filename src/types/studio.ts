export type StudioTab =
  | 'dashboard'
  | 'inbox'
  | 'pipeline'
  | 'calendar'
  | 'library'
  | 'reel_studio'
  | 'carousel_studio'
  | 'story_studio'
  | 'cover_studio'
  | 'brand_kit'
  | 'analytics';

export type StudioFormatFilter = 'all' | 'reel' | 'story' | 'carousel' | 'post';

export type StudioPipelineStatus =
  | 'idea'
  | 'script_draft'
  | 'ready_to_record'
  | 'editing'
  | 'ready_to_publish'
  | 'published';

export interface StudioPipelineColumn {
  id: StudioPipelineStatus;
  label: string;
  badgeColor: string;
  accentBorder: string;
  bgGradient: string;
  description: string;
}

export const STUDIO_PIPELINE_COLUMNS: StudioPipelineColumn[] = [
  {
    id: 'idea',
    label: 'Idee',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    accentBorder: 'border-amber-500/40',
    bgGradient: 'from-amber-500/10 to-transparent',
    description: 'Spunti, note e angoli da esplorare',
  },
  {
    id: 'script_draft',
    label: 'Script',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    accentBorder: 'border-sky-500/40',
    bgGradient: 'from-sky-500/10 to-transparent',
    description: 'Hook, scalette e stesura testi in lavorazione',
  },
  {
    id: 'ready_to_record',
    label: 'Da registrare',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    accentBorder: 'border-rose-500/40',
    bgGradient: 'from-rose-500/10 to-transparent',
    description: 'Script approvati pronti per riprese e set',
  },
  {
    id: 'editing',
    label: 'Montaggio',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    accentBorder: 'border-purple-500/40',
    bgGradient: 'from-purple-500/10 to-transparent',
    description: 'Tagli, sottotitoli, copertine e sound design',
  },
  {
    id: 'ready_to_publish',
    label: 'Pronti',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    accentBorder: 'border-emerald-500/40',
    bgGradient: 'from-emerald-500/10 to-transparent',
    description: 'Asset finalizzati pronti per programmazione',
  },
  {
    id: 'published',
    label: 'Pubblicati',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    accentBorder: 'border-slate-500/40',
    bgGradient: 'from-slate-500/10 to-transparent',
    description: 'Contenuti live con metriche di engagement',
  },
];

export interface ReelBrollItem {
  id: string;
  label: string;
  location?: string;
  angle?: string;
  isRecorded: boolean;
}

export interface ReelScriptData {
  hook: string;
  hookImpactScore: number;
  problem: string;
  solution: string;
  practicalExample: string;
  cta: string;
  bRollChecklist: ReelBrollItem[];
  caption: string;
  hashtags: string[];
  editorNotes: string;
}

export interface StudioAnalyticsOverview {
  totalViews: number;
  totalReach: number;
  avgEngagementRate: number;
  totalSaves: number;
  totalShares: number;
  newFollowers: number;
  avgCtr: number;
}
