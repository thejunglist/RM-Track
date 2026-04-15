-- ============================================================
-- 007_global_checklist.sql
-- Replace equipment + questions with global check_items
-- and per-room room_check_items junction table.
-- ============================================================

-- 1. Global check items list
create table public.check_items (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  answer_type text not null default 'YES_NO' check (answer_type in ('YES_NO','TEXT','NUMERIC')),
  "order"     int  not null default 0,
  created_at  timestamptz not null default now()
);

-- 2. Per-room checklist configuration
create table public.room_check_items (
  id            bigint generated always as identity primary key,
  room_id       bigint not null references public.rooms(id) on delete cascade,
  check_item_id bigint not null references public.check_items(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (room_id, check_item_id)
);

-- 3. Seed check items from existing spreadsheet columns
insert into public.check_items (name, answer_type, "order") values
  ('Projector Hours',   'NUMERIC', 1),
  ('Lectern Mic',       'YES_NO',  2),
  ('Radio Mic',         'YES_NO',  3),
  ('HDMI',              'YES_NO',  4),
  ('VGA',               'YES_NO',  5),
  ('USB-C',             'YES_NO',  6),
  ('Audio',             'YES_NO',  7),
  ('Screens',           'YES_NO',  8),
  ('Rack',              'YES_NO',  9),
  ('Whiteboard',        'YES_NO', 10),
  ('PC',                'YES_NO', 11),
  ('Hybrid',            'YES_NO', 12),
  ('Doc Camera',        'YES_NO', 13),
  ('Camera',            'YES_NO', 14),
  ('Writing Surface',   'YES_NO', 15),
  ('Induction Loop',    'YES_NO', 16),
  ('Room Instructions', 'YES_NO', 17),
  ('Layout',            'YES_NO', 18),
  ('Control System',    'YES_NO', 19),
  ('Notes',             'TEXT',   20);

-- 4. Rebuild check_answers to reference check_item_id instead of question_id
--    Safe to truncate — no real production data yet.
truncate public.check_answers;
alter table public.check_answers
  drop constraint check_answers_check_id_question_id_key,
  drop constraint check_answers_question_id_fkey,
  drop column question_id,
  add column check_item_id bigint not null references public.check_items(id),
  add constraint check_answers_check_id_check_item_id_key unique (check_id, check_item_id);

-- 5. Drop old tables (cascades any remaining FK references)
drop table if exists public.questions cascade;
drop table if exists public.equipment cascade;

-- 6. Enable RLS on new tables
alter table public.check_items enable row level security;
alter table public.room_check_items enable row level security;

-- 7. RLS policies — check_items (authenticated read, ADMIN write)
create policy "check_items_select" on public.check_items
  for select to authenticated using (true);
create policy "check_items_insert" on public.check_items
  for insert to authenticated with check (public.get_my_role() = 'ADMIN');
create policy "check_items_update" on public.check_items
  for update to authenticated using (public.get_my_role() = 'ADMIN');
create policy "check_items_delete" on public.check_items
  for delete to authenticated using (public.get_my_role() = 'ADMIN');

-- 8. RLS policies — room_check_items (authenticated read, ADMIN write)
create policy "room_check_items_select" on public.room_check_items
  for select to authenticated using (true);
create policy "room_check_items_insert" on public.room_check_items
  for insert to authenticated with check (public.get_my_role() = 'ADMIN');
create policy "room_check_items_delete" on public.room_check_items
  for delete to authenticated using (public.get_my_role() = 'ADMIN');
