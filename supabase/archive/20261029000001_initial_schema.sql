-- ============================================================================
-- CAMPUS LOST & FOUND - SUPABASE SCHEMA (RUN IN SUPABASE SQL EDITOR)
-- IMPORTANT: Do NOT highlight any text. Just paste this and click 'RUN'.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (User public info, NO passwords)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Auth Credentials Table (Separate password hash storage)
CREATE TABLE IF NOT EXISTS public.auth_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Items Table
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  category TEXT NOT NULL CHECK (category IN ('electronics', 'id_cards', 'keys_wallets', 'bags_backpacks', 'books_notes', 'clothing', 'accessories', 'sports', 'other')),
  location TEXT NOT NULL,
  date_lost_or_found TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  image_url TEXT,
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'claimed', 'returned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Claims Table
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  claimed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  proof_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('claim_status', 'item_status', 'system')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_email ON public.auth_credentials (email);
CREATE INDEX IF NOT EXISTS idx_items_type_category ON public.items (type, category, status);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON public.items (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_item_claimant ON public.claims (item_id, claimed_by);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, is_read, created_at DESC);

-- 7. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 8. Policies
DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;
DROP POLICY IF EXISTS "Service role full profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role full auth" ON public.auth_credentials;
DROP POLICY IF EXISTS "Public items access" ON public.items;
DROP POLICY IF EXISTS "Service role full items" ON public.items;
DROP POLICY IF EXISTS "Service role full claims" ON public.claims;
DROP POLICY IF EXISTS "Service role full notifications" ON public.notifications;

CREATE POLICY "Public profiles access" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Service role full profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Service role full auth" ON public.auth_credentials FOR ALL USING (true);
CREATE POLICY "Public items access" ON public.items FOR SELECT USING (true);
CREATE POLICY "Service role full items" ON public.items FOR ALL USING (true);
CREATE POLICY "Service role full claims" ON public.claims FOR ALL USING (true);
CREATE POLICY "Service role full notifications" ON public.notifications FOR ALL USING (true);

-- 9. Storage Bucket for item photos
INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public Access to Item Images" ON storage.objects;
DROP POLICY IF EXISTS "Backend Upload Item Images" ON storage.objects;
CREATE POLICY "Public Access to Item Images" ON storage.objects FOR SELECT USING (bucket_id = 'item-images');
CREATE POLICY "Backend Upload Item Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'item-images');

-- 10. Initial Demo Accounts (Passwords: student123 / admin123)
INSERT INTO public.profiles (id, name, email, role) VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Alex Chen', 'alex.chen@university.edu', 'student'),
  ('a0000000-0000-0000-0000-000000000002', 'Sarah Jenkins', 'sarah.j@university.edu', 'student'),
  ('a0000000-0000-0000-0000-000000000003', 'Officer Marcus Vance', 'admin@university.edu', 'admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.auth_credentials (user_id, email, password_hash) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'alex.chen@university.edu', '$2a$10$8g4uN3r9y3a2F9J1P5sJ6.H8/lM1U8D9A8b7V6c5X4Z3W2V1U0T.e'),
  ('a0000000-0000-0000-0000-000000000002', 'sarah.j@university.edu', '$2a$10$8g4uN3r9y3a2F9J1P5sJ6.H8/lM1U8D9A8b7V6c5X4Z3W2V1U0T.e'),
  ('a0000000-0000-0000-0000-000000000003', 'admin@university.edu', '$2a$10$8g4uN3r9y3a2F9J1P5sJ6.H8/lM1U8D9A8b7V6c5X4Z3W2V1U0T.e')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.items (id, title, description, type, category, location, date_lost_or_found, image_url, reported_by, status) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Apple AirPods Pro (2nd Gen) with White Case', 'Found on 2nd floor silent study area near desk 14.', 'found', 'electronics', 'Main Library', NOW() - INTERVAL '2 days', 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80', 'a0000000-0000-0000-0000-000000000002', 'open'),
  ('b0000000-0000-0000-0000-000000000002', 'Casio FX-991EX ClassWiz Calculator', 'Left in Engineering Lecture Hall B after 11 AM calculus midterm.', 'lost', 'electronics', 'Engineering Quad', NOW() - INTERVAL '1 day', 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80', 'a0000000-0000-0000-0000-000000000001', 'open'),
  ('b0000000-0000-0000-0000-000000000003', 'Brown Leather Fossil Bifold Wallet', 'Found under a booth table in cafeteria dining hall.', 'found', 'keys_wallets', 'Central Cafeteria', NOW() - INTERVAL '1 day', 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80', 'a0000000-0000-0000-0000-000000000003', 'under_review'),
  ('b0000000-0000-0000-0000-000000000004', 'North Face Recon Backpack (Navy / Charcoal)', 'Found beside vending machines on ground floor of Science Block.', 'found', 'bags_backpacks', 'Science Block', NOW() - INTERVAL '5 days', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80', 'a0000000-0000-0000-0000-000000000003', 'claimed')
ON CONFLICT (id) DO NOTHING;
