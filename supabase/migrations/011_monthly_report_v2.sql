-- Update monthly_report to include:
--   • overdue flag per room (no completed check in current or previous 2 months)
--   • notes array per check (answers where notes is not null/empty)

create or replace function public.monthly_report(p_month int, p_year int)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.get_my_role() != 'ADMIN' then
    raise exception 'forbidden';
  end if;

  return (
    select json_build_object(
      'month', p_month,
      'year',  p_year,
      'buildings', coalesce(
        (
          select json_agg(
            json_build_object(
              'id',       b.id,
              'name',     b.name,
              'location', b.location,
              'rooms', coalesce(
                (
                  select json_agg(
                    json_build_object(
                      'id',     r.id,
                      'number', r.number,
                      'floor',  r.floor,
                      'name',   r.name,
                      -- Overdue: no completed check in the 3-month window ending at p_month/p_year
                      'overdue', not exists (
                        select 1
                        from public.monthly_checks mc2
                        where mc2.room_id = r.id
                          and mc2.status = 'COMPLETED'
                          and make_date(mc2.year, mc2.month, 1)
                                >= (make_date(p_year, p_month, 1) - interval '2 months')
                          and make_date(mc2.year, mc2.month, 1)
                                <= make_date(p_year, p_month, 1)
                      ),
                      'checks', coalesce(
                        (
                          select json_agg(
                            json_build_object(
                              'id',          mc.id,
                              'status',      mc.status,
                              'completedAt', mc.completed_at,
                              'tech',        json_build_object('name', p.name),
                              -- Notes: answers with a non-empty notes field
                              'notes', coalesce(
                                (
                                  select json_agg(
                                    json_build_object(
                                      'item', ci.name,
                                      'note', ca.notes
                                    )
                                  )
                                  from public.check_answers ca
                                  join public.check_items ci on ci.id = ca.check_item_id
                                  where ca.check_id = mc.id
                                    and ca.notes is not null
                                    and ca.notes <> ''
                                ),
                                '[]'::json
                              )
                            )
                          )
                          from public.monthly_checks mc
                          join public.profiles p on p.id = mc.tech_id
                          where mc.room_id = r.id
                            and mc.month = p_month
                            and mc.year  = p_year
                        ),
                        '[]'::json
                      )
                    )
                    order by r.number
                  )
                  from public.rooms r
                  where r.building_id = b.id
                ),
                '[]'::json
              )
            )
            order by b.name
          )
          from public.buildings b
        ),
        '[]'::json
      )
    )
  );
end;
$$;
