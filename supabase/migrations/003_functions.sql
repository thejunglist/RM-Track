-- ============================================================
-- 003_functions.sql
-- ============================================================

-- monthly_report: returns a JSON tree of buildings → rooms → checks for
-- the given month and year. ADMIN access only; enforced inside the function.
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
      'year', p_year,
      'buildings', coalesce(
        (
          select json_agg(
            json_build_object(
              'id', b.id,
              'name', b.name,
              'location', b.location,
              'rooms', coalesce(
                (
                  select json_agg(
                    json_build_object(
                      'id', r.id,
                      'number', r.number,
                      'floor', r.floor,
                      'name', r.name,
                      'checks', coalesce(
                        (
                          select json_agg(
                            json_build_object(
                              'id', mc.id,
                              'status', mc.status,
                              'completedAt', mc.completed_at,
                              'tech', json_build_object('name', p.name)
                            )
                          )
                          from public.monthly_checks mc
                          join public.profiles p on p.id = mc.tech_id
                          where mc.room_id = r.id
                            and mc.month = p_month
                            and mc.year = p_year
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
