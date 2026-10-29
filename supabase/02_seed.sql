-- STEP 2: Run this query after tables are created to insert sample student/admin accounts and items

INSERT INTO public.users (id, name, email, password_hash, role)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Alex Chen', 'alex.chen@university.edu', '$2a$10$8g4uN3r9y3a2F9J1P5sJ6.H8/lM1U8D9A8b7V6c5X4Z3W2V1U0T.e', 'student'),
  ('a0000000-0000-0000-0000-000000000002', 'Sarah Jenkins', 'sarah.j@university.edu', '$2a$10$8g4uN3r9y3a2F9J1P5sJ6.H8/lM1U8D9A8b7V6c5X4Z3W2V1U0T.e', 'student'),
  ('a0000000-0000-0000-0000-000000000003', 'Officer Marcus Vance', 'admin@university.edu', '$2a$10$8g4uN3r9y3a2F9J1P5sJ6.H8/lM1U8D9A8b7V6c5X4Z3W2V1U0T.e', 'admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.items (id, title, description, type, category, location, date_lost_or_found, image_url, reported_by, status)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'Apple AirPods Pro (2nd Gen) with White Case',
    'Found on the 2nd floor silent study area near desk 14. White charging case with a small scratch near the hinge and a tiny navy blue lanyard loop attached.',
    'found',
    'electronics',
    'Main Library',
    NOW() - INTERVAL '2 days',
    'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80',
    'a0000000-0000-0000-0000-000000000002',
    'open'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Casio FX-991EX ClassWiz Calculator',
    'Left in Engineering Lecture Hall B after the 11 AM calculus midterm. Calculator has a matte black sliding cover with a small yellow periodic table sticker on the back.',
    'lost',
    'electronics',
    'Engineering Quad',
    NOW() - INTERVAL '1 day',
    'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80',
    'a0000000-0000-0000-0000-000000000001',
    'open'
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'Brown Leather Fossil Bifold Wallet',
    'Found under a booth table in the cafeteria dining hall during lunch rush. Handed over to Campus Security Desk for safe custody.',
    'found',
    'keys_wallets',
    'Central Cafeteria',
    NOW() - INTERVAL '1 day',
    'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    'a0000000-0000-0000-0000-000000000003',
    'under_review'
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'North Face Recon Backpack (Navy / Charcoal)',
    'Found placed beside the vending machines on the ground floor of Science Block. Safely cataloged by campus dispatch.',
    'found',
    'bags_backpacks',
    'Science Block',
    NOW() - INTERVAL '5 days',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    'a0000000-0000-0000-0000-000000000003',
    'claimed'
  )
ON CONFLICT (id) DO NOTHING;
