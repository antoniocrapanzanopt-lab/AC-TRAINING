-- =====================================================================================
-- COACH NOTIFICATIONS TABLE
-- Esegui questo script nel SQL Editor di Supabase per abilitare le notifiche in-app.
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.coach_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE SET NULL,
    athlete_name TEXT,
    metadata JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_notifications_coach_id ON public.coach_notifications(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_notifications_created_at ON public.coach_notifications(created_at DESC);

ALTER TABLE public.coach_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach_read_own_notifications" ON public.coach_notifications;
CREATE POLICY "coach_read_own_notifications"
    ON public.coach_notifications FOR SELECT TO authenticated
    USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "coach_update_own_notifications" ON public.coach_notifications;
CREATE POLICY "coach_update_own_notifications"
    ON public.coach_notifications FOR UPDATE TO authenticated
    USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "insert_notifications" ON public.coach_notifications;
CREATE POLICY "insert_notifications"
    ON public.coach_notifications FOR INSERT TO authenticated
    WITH CHECK (
        coach_id = get_coach_uid() AND (
            auth.uid() = get_coach_uid() OR
            EXISTS (SELECT 1 FROM public.athletes WHERE id = athlete_id AND auth_user_id = auth.uid())
        )
    );

ALTER TABLE public.coach_notifications REPLICA IDENTITY FULL;
