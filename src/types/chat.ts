export interface Message {
  id: string;
  conversation_id?: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface Conversation {
  athlete_id: string; // The user ID of the athlete from auth.users (if coach) or the coach's ID
  athlete_name: string;
  athlete_initials: string;
  athlete_avatar?: string;
  tags: string[]; // For category tags like TRAINING, COACHING
  last_message: Message | null;
  unread_count: number;
}
