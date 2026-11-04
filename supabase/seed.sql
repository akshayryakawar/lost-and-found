-- ============================================================================
-- CAMPUS LOST & FOUND - SEED DATA (10+ REALISTIC CAMPUS BELONGINGS)
-- Run this in your Supabase Dashboard -> SQL Editor to populate items.
-- ============================================================================

-- 1. Ensure Demo Profiles exist
INSERT INTO public.profiles (id, name, email, role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Alex Chen', 'alex.chen@university.edu', 'student'),
  ('00000000-0000-0000-0000-000000000002', 'Sarah Jenkins', 'sarah.j@university.edu', 'student'),
  ('00000000-0000-0000-0000-000000000003', 'Officer Marcus Vance', 'admin@university.edu', 'admin'),
  ('00000000-0000-0000-0000-000000000004', 'Student Demo', 'student@university.edu', 'student')
ON CONFLICT (email) DO NOTHING;

-- 2. Ensure Auth Credentials exist for Demo Profiles (password: student123 / admin123)
INSERT INTO public.auth_credentials (user_id, email, password_hash)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'alex.chen@university.edu', '$2b$10$0LeQpy0RxYFKvKHz/4s6Ju.lcCr8j.wseCMyDknRloRBqbqoSSDqS'),
  ('00000000-0000-0000-0000-000000000002', 'sarah.j@university.edu', '$2b$10$0LeQpy0RxYFKvKHz/4s6Ju.lcCr8j.wseCMyDknRloRBqbqoSSDqS'),
  ('00000000-0000-0000-0000-000000000003', 'admin@university.edu', '$2b$10$joUVxHYFJ/Wpcx5N7rAZ4uBbibsSc/Jrwym9bp7todNs.4g6FLgRu'),
  ('00000000-0000-0000-0000-000000000004', 'student@university.edu', '$2b$10$0LeQpy0RxYFKvKHz/4s6Ju.lcCr8j.wseCMyDknRloRBqbqoSSDqS')
ON CONFLICT (email) DO NOTHING;

-- 3. Insert 10+ Permanent Campus Items
INSERT INTO public.items (title, description, type, category, location, date_lost_or_found, image_url, reported_by, status)
VALUES
  (
    'Apple AirPods Pro (2nd Gen) with White Case',
    'Found on the 2nd floor silent study area near desk 14. White charging case with a small scratch near the hinge and a tiny navy blue lanyard loop attached.',
    'found',
    'electronics',
    'Main Library (2nd Floor Study Desk 14)',
    NOW() - INTERVAL '1 day',
    'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80',
    '00000000-0000-0000-0000-000000000002',
    'open'
  ),
  (
    'Casio FX-991EX ClassWiz Calculator',
    'Left in Engineering Lecture Hall B after the 11 AM calculus midterm. Calculator has a matte black sliding cover with a small yellow periodic table sticker on the back.',
    'lost',
    'electronics',
    'Engineering Quad (Lecture Hall B)',
    NOW() - INTERVAL '2 days',
    'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80',
    '00000000-0000-0000-0000-000000000001',
    'open'
  ),
  (
    'Brown Leather Fossil Bifold Wallet',
    'Found under a booth table in the cafeteria dining hall during lunch rush. Contains student ID card and bus pass. Safely stored at security desk.',
    'found',
    'keys_wallets',
    'Central Cafeteria (Table 8)',
    NOW() - INTERVAL '2 days',
    'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    '00000000-0000-0000-0000-000000000003',
    'under_review'
  ),
  (
    'Student ID Card & Dorm Key Lanyard',
    'University blue lanyard with student ID card and Dorm A room key attached. Found on the concrete steps near Student Union Building.',
    'found',
    'id_cards',
    'Student Center (Front Steps)',
    NOW() - INTERVAL '3 days',
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
    '00000000-0000-0000-0000-000000000002',
    'open'
  ),
  (
    'Hydro Flask 32oz Water Bottle (Cobalt Blue)',
    'Lost during basketball practice on Court 2. Cobalt blue with a black flex sip lid and several national park stickers around the base.',
    'lost',
    'accessories',
    'Sports Complex (Basketball Court 2)',
    NOW() - INTERVAL '3 days',
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
    '00000000-0000-0000-0000-000000000001',
    'open'
  ),
  (
    'North Face Recon Backpack (Navy / Charcoal)',
    'Found placed beside the vending machines on the ground floor of Science Block. Checked by security for hazardous items and safely cataloged.',
    'found',
    'bags_backpacks',
    'Science Block (Vending Area)',
    NOW() - INTERVAL '4 days',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    '00000000-0000-0000-0000-000000000003',
    'claimed'
  ),
  (
    'TI-84 Plus CE Color Graphing Calculator',
    'Rose gold casing with protective pink cover. Found in Math Lab 108. Safe at dispatch desk for pickup.',
    'found',
    'electronics',
    'Science Block (Math Lab 108)',
    NOW() - INTERVAL '5 days',
    'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=800&q=80',
    '00000000-0000-0000-0000-000000000003',
    'open'
  ),
  (
    'Silver Keychain with Car & Dorm Keys',
    'Lost around the main campus shuttle turnaround shelter. Has a miniature silver carabiner and a Subaru remote key fob.',
    'lost',
    'keys_wallets',
    'Campus Shuttle Stop (Shelter B)',
    NOW() - INTERVAL '5 days',
    'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=800&q=80',
    '00000000-0000-0000-0000-000000000002',
    'open'
  ),
  (
    'Sony WH-1000XM4 Noise Canceling Headphones',
    'Matte black over-ear headphones in an oval protective zip case. Left on a sofa in the graduate study lounge.',
    'lost',
    'electronics',
    'Main Library (Graduate Lounge)',
    NOW() - INTERVAL '6 days',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    '00000000-0000-0000-0000-000000000001',
    'open'
  ),
  (
    'Patagonia Torrentshell Rain Jacket (Black, M)',
    'Black waterproof hooded shell jacket left on the coat hook in Room 204 after evening seminar.',
    'found',
    'clothing',
    'Humanities Hall (Seminar Room 204)',
    NOW() - INTERVAL '6 days',
    'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=800&q=80',
    '00000000-0000-0000-0000-000000000002',
    'open'
  ),
  (
    'MacBook Pro 96W USB-C Charger & Cable',
    'White Apple power brick with braided USB-C MagSafe 3 cable. Found plugged into power strip under station 12.',
    'found',
    'electronics',
    'Engineering Quad (Computer Lab 3)',
    NOW() - INTERVAL '7 days',
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
    '00000000-0000-0000-0000-000000000003',
    'open'
  ),
  (
    'Black Ray-Ban Clubmaster Sunglasses',
    'Black and gold frame sunglasses with green lenses in a brown leather case. Found on the outdoor picnic lawn.',
    'found',
    'accessories',
    'Student Center (Courtyard Lawn)',
    NOW() - INTERVAL '7 days',
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
    '00000000-0000-0000-0000-000000000001',
    'open'
  );
