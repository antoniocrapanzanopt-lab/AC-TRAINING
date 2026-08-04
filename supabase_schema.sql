-- ==============================================================================
-- SCRIPT SQL SCHEMA PRODUCTION-READY PER SUPABASE / POSTGRESQL
-- BUILDER ATHLETE MANAGER — GESTIONALE PALESTRA & AREA ATLETA
-- ==============================================================================

-- 1. EXTENSIONS & SETUP INIZIALE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELLA PROFILI COACH / PROPRIETARI (Estensione di auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  organization_name TEXT,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELLA ATLETI (CLIENTI PALESTRA)
CREATE TABLE IF NOT EXISTS public.athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Se l'atleta ha un account di login
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  fiscal_code TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  status TEXT DEFAULT 'active', -- active, inactive, suspended, archived
  payment_status TEXT DEFAULT 'none', -- regular, expiring, overdue, none
  assigned_coach_id TEXT,
  assigned_coach_name TEXT,
  contact_channel TEXT DEFAULT 'whatsapp',
  acquisition_source TEXT DEFAULT 'direct',
  medical_certificate_expiry_date DATE,
  goals TEXT,
  notes TEXT,
  tags TEXT[],
  anthropometrics JSONB, -- { weightKg, heightCm, bodyFatPercentage, bmrKcal, tdeeKcal, updatedAt }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELLA SCHEDE DI ALLENAMENTO (WORKOUT PLANS)
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  duration_weeks INT DEFAULT 4,
  start_date DATE,
  end_date DATE,
  days JSONB NOT NULL, -- Array delle giornate ed esercizi
  notes TEXT,
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELLA DIARIO ALLENAMENTI (WORKOUT LOGS)
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
  athlete_name TEXT NOT NULL,
  plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  day_id TEXT NOT NULL,
  day_label TEXT NOT NULL,
  date DATE NOT NULL,
  exercises JSONB NOT NULL, -- Array di log serie ed esercizi effettuati
  notes TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELLA MESSAGGI CHAT REALTIME (COACH ↔ ATLETA)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL, -- 'coach' | 'athlete'
  sender_name TEXT NOT NULL,
  type TEXT DEFAULT 'text', -- 'text' | 'image' | 'video' | 'link'
  content TEXT NOT NULL,
  media_url TEXT,
  media_name TEXT,
  read_by_coach BOOLEAN DEFAULT FALSE,
  read_by_athlete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELLA ABBONAMENTI (SUBSCRIPTIONS)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
  package_id TEXT,
  package_name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  list_price NUMERIC(10,2) NOT NULL,
  final_price NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELLA PAGAMENTI & INCASSI (PAYMENTS)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  expected_amount NUMERIC(10,2) NOT NULL,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  due_date DATE NOT NULL,
  payment_date DATE,
  payment_method TEXT,
  status TEXT DEFAULT 'pending', -- pending, paid, partial, overdue
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ABILITAZIONE ROW LEVEL SECURITY (RLS) & POLITICHE DI SICUREZZA
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Politiche Profiles
CREATE POLICY "Gli utenti autenticati possono leggere/modificare il proprio profilo"
  ON public.profiles FOR ALL USING (auth.uid() = id);

-- Politiche Athletes (Coach vede i propri atleti, Atleta vede se stesso)
CREATE POLICY "Coach access to own athletes"
  ON public.athletes FOR ALL USING (auth.uid() = owner_id OR auth.uid() = user_id);

-- Politiche Workout Plans
CREATE POLICY "Coach and Athlete access to plans"
  ON public.workout_plans FOR ALL USING (
    auth.uid() = owner_id OR 
    client_id IN (SELECT id FROM public.athletes WHERE user_id = auth.uid())
  );

-- Politiche Workout Logs
CREATE POLICY "Athlete and Coach access to logs"
  ON public.workout_logs FOR ALL USING (
    athlete_id IN (SELECT id FROM public.athletes WHERE user_id = auth.uid() OR owner_id = auth.uid())
  );

-- Politiche Chat Messages
CREATE POLICY "Chat access for Coach and Athlete"
  ON public.chat_messages FOR ALL USING (
    athlete_id IN (SELECT id FROM public.athletes WHERE user_id = auth.uid() OR owner_id = auth.uid())
  );

-- Politiche Subscriptions & Payments (Solo Coach)
CREATE POLICY "Coach access to subscriptions"
  ON public.subscriptions FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Coach access to payments"
  ON public.payments FOR ALL USING (auth.uid() = owner_id);

-- REALTIME REPLICATION (Abilita sottoscrizione realtime sui messaggi di chat)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
