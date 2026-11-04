-- Forja · base de datos en Supabase
-- Pegá todo esto en Supabase → SQL Editor → New query → Run.
-- Crea una sola tabla donde cada fila pertenece a un usuario y nadie más puede leerla ni cambiarla.

create table if not exists public.forja_docs (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  path       text        not null,
  parent     text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, path)
);

create index if not exists forja_docs_parent_idx on public.forja_docs (user_id, parent);

alter table public.forja_docs enable row level security;

drop policy if exists "forja: cada uno lo suyo" on public.forja_docs;
create policy "forja: cada uno lo suyo" on public.forja_docs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
