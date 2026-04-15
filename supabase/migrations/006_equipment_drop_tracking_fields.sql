alter table public.equipment
  drop column if exists asset_tag,
  drop column if exists make,
  drop column if exists model,
  drop column if exists serial,
  drop column if exists description;
