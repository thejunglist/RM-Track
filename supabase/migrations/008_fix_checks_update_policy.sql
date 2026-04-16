-- Fix: checks_update_tech policy blocked setting status=COMPLETED because
-- using() without with check() applied the same condition to the new row state,
-- meaning status != 'COMPLETED' was enforced on the new values too.

drop policy "checks_update_tech" on public.monthly_checks;

create policy "checks_update_tech" on public.monthly_checks
  for update to authenticated
  using (
    -- Current row: must be owned by this tech and not already completed
    public.get_my_role() = 'TECH'
    and tech_id = auth.uid()
    and status != 'COMPLETED'
  )
  with check (
    -- New row: just needs to stay owned by this tech
    public.get_my_role() = 'TECH'
    and tech_id = auth.uid()
  );
