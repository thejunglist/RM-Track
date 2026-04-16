alter table public.check_items
  add column is_required boolean not null default false;
