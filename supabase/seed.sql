-- ============================================================
-- seed.sql — run after migrations in Supabase SQL Editor
-- ============================================================
-- NOTE: Do NOT create the first ADMIN user here.
-- Use the Supabase Dashboard → Authentication → Users → "Add user"
-- to create the admin account, then run the insert below with the
-- UUID shown in the dashboard.
--
-- After creating the auth user in the dashboard, run:
--
--   insert into public.profiles (id, name, email, role)
--   values ('<paste-uuid-here>', 'Admin', 'admin@example.com', 'ADMIN');
--
-- Then in the Supabase dashboard SQL editor also set app_metadata so
-- the JWT carries the role claim (required for RLS policies):
--
--   update auth.users
--   set raw_app_meta_data = raw_app_meta_data || '{"role": "ADMIN"}'::jsonb
--   where id = '<paste-uuid-here>';
--
-- ============================================================

-- Example seed buildings (optional — edit as needed)
insert into public.buildings (name, location) values
  ('Livingstone Tower', 'Richmond Street'),
  ('Graham Hills', 'Richmond Street'),
  ('Royal College', 'George Street')
on conflict do nothing;
