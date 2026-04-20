-- Add flexible team pairing: optional partner_id on assignments and checks.
-- Either the primary tech or partner has full read/write access via updated RLS.

-- Schema changes
alter table public.room_assignments
  add column partner_id uuid references public.profiles(id) on delete set null;

alter table public.monthly_checks
  add column partner_id uuid references public.profiles(id) on delete set null;

-- room_assignments SELECT: primary tech OR partner can see their assignments
drop policy "assignments_select" on public.room_assignments;
create policy "assignments_select" on public.room_assignments
  for select to authenticated
  using (
    public.get_my_role() = 'ADMIN'
    or tech_id   = auth.uid()
    or partner_id = auth.uid()
  );

-- monthly_checks SELECT: primary tech OR partner can see the check
drop policy "checks_select" on public.monthly_checks;
create policy "checks_select" on public.monthly_checks
  for select to authenticated
  using (
    public.get_my_role() = 'ADMIN'
    or tech_id    = auth.uid()
    or partner_id = auth.uid()
  );

-- monthly_checks INSERT: either partner can create a check for an assigned room
drop policy "checks_insert_tech" on public.monthly_checks;
create policy "checks_insert_tech" on public.monthly_checks
  for insert to authenticated
  with check (
    public.get_my_role() = 'TECH'
    and tech_id = auth.uid()
    and exists (
      select 1 from public.room_assignments
      where (tech_id = auth.uid() or partner_id = auth.uid())
        and room_id = monthly_checks.room_id
    )
  );

-- monthly_checks UPDATE: primary tech OR partner can update (save answers, complete)
drop policy "checks_update_tech" on public.monthly_checks;
create policy "checks_update_tech" on public.monthly_checks
  for update to authenticated
  using (
    public.get_my_role() = 'TECH'
    and (tech_id = auth.uid() or partner_id = auth.uid())
  )
  with check (
    public.get_my_role() = 'TECH'
    and (tech_id = auth.uid() or partner_id = auth.uid())
  );

-- check_answers SELECT: visible if associated check is visible to the user
drop policy "answers_select" on public.check_answers;
create policy "answers_select" on public.check_answers
  for select to authenticated
  using (
    exists (
      select 1 from public.monthly_checks mc
      where mc.id = check_answers.check_id
        and (
          mc.tech_id    = auth.uid()
          or mc.partner_id = auth.uid()
          or public.get_my_role() = 'ADMIN'
        )
    )
  );

-- check_answers INSERT: either partner can add answers
drop policy "answers_insert" on public.check_answers;
create policy "answers_insert" on public.check_answers
  for insert to authenticated
  with check (
    exists (
      select 1 from public.monthly_checks mc
      where mc.id = check_answers.check_id
        and (mc.tech_id = auth.uid() or mc.partner_id = auth.uid())
    )
  );

-- check_answers UPDATE: either partner can update answers
drop policy "answers_update" on public.check_answers;
create policy "answers_update" on public.check_answers
  for update to authenticated
  using (
    exists (
      select 1 from public.monthly_checks mc
      where mc.id = check_answers.check_id
        and (mc.tech_id = auth.uid() or mc.partner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.monthly_checks mc
      where mc.id = check_answers.check_id
        and (mc.tech_id = auth.uid() or mc.partner_id = auth.uid())
    )
  );
