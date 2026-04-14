-- ============================================================
-- 002_rls_policies.sql
-- ============================================================

-- Helper: read role from JWT app_metadata (set by Edge Functions)
create or replace function public.get_my_role()
returns text
language sql stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), 'TECH')
$$;

-- ── Enable RLS on all tables ──────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.buildings         enable row level security;
alter table public.rooms             enable row level security;
alter table public.equipment         enable row level security;
alter table public.questions         enable row level security;
alter table public.monthly_checks    enable row level security;
alter table public.check_answers     enable row level security;
alter table public.room_assignments  enable row level security;

-- ── profiles ─────────────────────────────────────────────────
-- TECH sees only own profile; ADMIN sees all.
-- Writes are handled exclusively by Edge Functions using service role.

create policy "profiles_select" on public.profiles
  for select to authenticated
  using (public.get_my_role() = 'ADMIN' or id = auth.uid());

-- ── buildings ─────────────────────────────────────────────────

create policy "buildings_select" on public.buildings
  for select to authenticated
  using (true);

create policy "buildings_insert" on public.buildings
  for insert to authenticated
  with check (public.get_my_role() = 'ADMIN');

create policy "buildings_update" on public.buildings
  for update to authenticated
  using (public.get_my_role() = 'ADMIN');

create policy "buildings_delete" on public.buildings
  for delete to authenticated
  using (public.get_my_role() = 'ADMIN');

-- ── rooms ─────────────────────────────────────────────────────

create policy "rooms_select" on public.rooms
  for select to authenticated
  using (true);

create policy "rooms_insert" on public.rooms
  for insert to authenticated
  with check (public.get_my_role() = 'ADMIN');

create policy "rooms_update" on public.rooms
  for update to authenticated
  using (public.get_my_role() = 'ADMIN');

create policy "rooms_delete" on public.rooms
  for delete to authenticated
  using (public.get_my_role() = 'ADMIN');

-- ── equipment ─────────────────────────────────────────────────

create policy "equipment_select" on public.equipment
  for select to authenticated
  using (true);

create policy "equipment_insert" on public.equipment
  for insert to authenticated
  with check (public.get_my_role() = 'ADMIN');

create policy "equipment_update" on public.equipment
  for update to authenticated
  using (public.get_my_role() = 'ADMIN');

create policy "equipment_delete" on public.equipment
  for delete to authenticated
  using (public.get_my_role() = 'ADMIN');

-- ── questions ─────────────────────────────────────────────────

create policy "questions_select" on public.questions
  for select to authenticated
  using (true);

create policy "questions_insert" on public.questions
  for insert to authenticated
  with check (public.get_my_role() = 'ADMIN');

create policy "questions_update" on public.questions
  for update to authenticated
  using (public.get_my_role() = 'ADMIN');

create policy "questions_delete" on public.questions
  for delete to authenticated
  using (public.get_my_role() = 'ADMIN');

-- ── room_assignments ──────────────────────────────────────────
-- TECH sees only their own; ADMIN sees all.

create policy "assignments_select" on public.room_assignments
  for select to authenticated
  using (public.get_my_role() = 'ADMIN' or tech_id = auth.uid());

create policy "assignments_insert" on public.room_assignments
  for insert to authenticated
  with check (public.get_my_role() = 'ADMIN');

create policy "assignments_delete" on public.room_assignments
  for delete to authenticated
  using (public.get_my_role() = 'ADMIN');

-- ── monthly_checks ────────────────────────────────────────────
-- TECH sees only their own; ADMIN sees all.
-- TECH can insert only for rooms they are assigned to (and must set tech_id = their own id).
-- TECH can update only their own non-completed checks; ADMIN can update any.

create policy "checks_select" on public.monthly_checks
  for select to authenticated
  using (public.get_my_role() = 'ADMIN' or tech_id = auth.uid());

create policy "checks_insert_tech" on public.monthly_checks
  for insert to authenticated
  with check (
    public.get_my_role() = 'TECH'
    and tech_id = auth.uid()
    and exists (
      select 1 from public.room_assignments
      where tech_id = auth.uid()
        and room_id = monthly_checks.room_id
    )
  );

create policy "checks_insert_admin" on public.monthly_checks
  for insert to authenticated
  with check (public.get_my_role() = 'ADMIN');

create policy "checks_update_tech" on public.monthly_checks
  for update to authenticated
  using (
    public.get_my_role() = 'TECH'
    and tech_id = auth.uid()
    and status != 'COMPLETED'
  );

create policy "checks_update_admin" on public.monthly_checks
  for update to authenticated
  using (public.get_my_role() = 'ADMIN');

-- ── check_answers ─────────────────────────────────────────────
-- Readable if the associated check is readable.
-- Writable (insert/update) only for own non-completed checks.

create policy "answers_select" on public.check_answers
  for select to authenticated
  using (
    exists (
      select 1 from public.monthly_checks mc
      where mc.id = check_answers.check_id
        and (mc.tech_id = auth.uid() or public.get_my_role() = 'ADMIN')
    )
  );

create policy "answers_insert" on public.check_answers
  for insert to authenticated
  with check (
    exists (
      select 1 from public.monthly_checks mc
      where mc.id = check_answers.check_id
        and mc.tech_id = auth.uid()
        and mc.status != 'COMPLETED'
    )
  );

create policy "answers_update" on public.check_answers
  for update to authenticated
  using (
    exists (
      select 1 from public.monthly_checks mc
      where mc.id = check_answers.check_id
        and mc.tech_id = auth.uid()
        and mc.status != 'COMPLETED'
    )
  );
