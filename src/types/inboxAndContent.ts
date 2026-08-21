export type InboxCategory = 
  | 'content_idea' 
  | 'client_observation' 
  | 'business_task' 
  | 'personal_reflection' 
  | 'system_improvement';

export type InboxPriority = 'low' | 'medium' | 'high' | 'urgent';

export type InboxStatus = 
  | 'raw' 
  | 'processing' 
  | 'processed' 
  | 'converted_task' 
  | 'converted_content' 
  | 'linked_athlete' 
  | 'archived';

export interface AIContentOpportunity {
  hasOpportunity: boolean;
  suggestedType: ContentType;
  pillar: ContentPillar;
  hook: string;
  scriptOutline: string;
  callToAction: string;
}

export interface InboxEntry {
  id: string;
  coach_id: string;
  raw_content: string;
  audio_url?: string | null;
  ai_title?: string | null;
  ai_summary?: string | null;
  ai_category?: InboxCategory | null;
  ai_priority?: InboxPriority;
  ai_suggested_tasks?: string[];
  ai_content_opportunity?: AIContentOpportunity | null;
  ai_next_step?: string | null;
  related_athlete_id?: string | null;
  status: InboxStatus;
  converted_content_id?: string | null;
  converted_task_id?: string | null;
  processed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type ContentType = 'reel' | 'story' | 'carousel' | 'post';

export type ContentPillar = 
  | 'technique_execution' 
  | 'common_mistakes' 
  | 'mindset_discipline' 
  | 'nutrition_science' 
  | 'client_transformation' 
  | 'coaching_faq' 
  | 'authority_lifestyle' 
  | 'promotion_launch';

export type ContentStatus = 
  | 'idea' 
  | 'script_draft' 
  | 'ready_to_record' 
  | 'recorded' 
  | 'editing' 
  | 'ready_to_publish' 
  | 'published' 
  | 'repurpose';

export interface InstagramContent {
  id: string;
  coach_id: string;
  origin_inbox_id?: string | null;
  title: string;
  type: ContentType;
  pillar: ContentPillar;
  status: ContentStatus;
  hook?: string | null;
  script_body?: string | null;
  caption?: string | null;
  call_to_action?: string | null;
  scheduled_for?: string | null;
  published_at?: string | null;
  internal_notes?: string | null;
  performance_metrics?: {
    views?: number;
    likes?: number;
    saves?: number;
    shares?: number;
    leads?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface CoachTask {
  id: string;
  coach_id: string;
  origin_inbox_id?: string | null;
  related_athlete_id?: string | null;
  title: string;
  description?: string | null;
  priority: InboxPriority;
  due_date?: string | null;
  is_completed: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}
