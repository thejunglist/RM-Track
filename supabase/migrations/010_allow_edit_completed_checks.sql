-- Allow techs to edit completed checks
-- Removes status != 'COMPLETED' guard so techs can re-open and update answers

-- monthly_checks: allow tech to update their own check regardless of status
drop policy if exists "checks_update_tech" on public.monthly_checks;
create policy "checks_update_tech" on public.monthly_checks
  for update to authenticated
  using (
    public.get_my_role() = 'TECH'
    and tech_id = auth.uid()
  )
  with check (
    public.get_my_role() = 'TECH'
    and tech_id = auth.uid()
  );

-- check_answers: allow insert/update for own check regardless of status
drop policy if exists "answers_insert" on public.check_answers;
create policy "answers_insert" on public.check_answers
  for insert to authenticated
  with check (
    exists (
      select 1 from public.monthly_checks mc
      where mc.id = check_answers.check_id
        and mc.tech_id = auth.uid()
    )
  );

drop policy if exists "answers_update" on public.check_answers;
create policy "answers_update" on public.check_answers
  for update to authenticated
  using (
    exists (
      select 1 from public.monthly_checks mc
      where mc.id = check_answers.check_id
        and mc.tech_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.monthly_checks mc
      where mc.id = check_answers.check_id
        and mc.tech_id = auth.uid()
    )
  );
