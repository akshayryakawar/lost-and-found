-- STEP 1: Run this query first in Supabase SQL Editor to create tables & policies

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  category TEXT NOT NULL CHECK (category IN (
    'electronics',
    'id_cards',
    'keys_wallets',
    'bags_backpacks',
    'books_notes',
    'clothing',
    'accessories',
    'sports',
    'other'
  )),
  location TEXT NOT NULL,
  date_lost_or_found TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  image_url TEXT,
  reported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'claimed', 'returned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  claimed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT,
  proof_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('claim_status', 'item_status', 'system')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_type_category ON public.items (type, category, status);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON public.items (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_item_claimant ON public.claims (item_id, claimed_by);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public items access" ON public.items;
DROP POLICY IF EXISTS "Service role full access on items" ON public.items;
DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
DROP POLICY IF EXISTS "Service role full access on claims" ON public.claims;
DROP POLICY IF EXISTS "Service role full access on notifications" ON public.notifications;

CREATE POLICY "Public items access" ON public.items FOR SELECT USING (true);
CREATE POLICY "Service role full access on items" ON public.items FOR ALL USING (true);
CREATE POLICY "Service role full access on users" ON public.users FOR ALL USING (true);
CREATE POLICY "Service role full access on claims" ON public.claims FOR ALL USING (true);
CREATE POLICY "Service role full access on notifications" ON public.notifications FOR ALL USING (true);
