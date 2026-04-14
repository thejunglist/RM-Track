-- ============================================================
-- 001_initial_schema.sql
-- ============================================================

-- profiles: linked to auth.users (id is UUID from Supabase Auth)
create table public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  name       text        not null,
  email      text        not null,
  role       text        not null default 'TECH' check (role in ('TECH', 'ADMIN')),
  created_at timestamptz not null default now()
);

create table public.buildings (
  id         bigint      generated always as identity primary key,
  name       text        not null,
  location   text,
  created_at timestamptz not null default now()
);

create table public.rooms (
  id          bigint      generated always as identity primary key,
  building_id bigint      not null references public.buildings(id) on delete cascade,
  number      text        not null,
  floor       text,
  name        text,
  created_at  timestamptz not null default now(),
  unique (building_id, number)
);

create table public.equipment (
  id         bigint      generated always as identity primary key,
  room_id    bigint      not null references public.rooms(id) on delete cascade,
  name       text        not null,
  category   text,
  asset_tag  text        unique,
  created_at timestamptz not null default now()
);

create table public.questions (
  id           bigint      generated always as identity primary key,
  equipment_id bigint      not null references public.equipment(id) on delete cascade,
  text         text        not null,
  answer_type  text        not null check (answer_type in ('YES_NO', 'TEXT', 'NUMERIC')),
  "order"      int         not null default 0,
  created_at   timestamptz not null default now()
);

create table public.monthly_checks (
  id           bigint      generated always as identity primary key,
  room_id      bigint      not null references public.rooms(id),
  tech_id      uuid        not null references public.profiles(id),
  month        int         not null,
  year         int         not null,
  status       text        not null default 'PENDING' check (status in ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (room_id, month, year)
);

create table public.check_answers (
  id          bigint      generated always as identity primary key,
  check_id    bigint      not null references public.monthly_checks(id) on delete cascade,
  question_id bigint      not null references public.questions(id),
  value       text        not null,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (check_id, question_id)
);

create table public.room_assignments (
  id         bigint      generated always as identity primary key,
  tech_id    uuid        not null references public.profiles(id) on delete cascade,
  room_id    bigint      not null references public.rooms(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tech_id, room_id)
);
