-- Migration 3: burned calories from Garmin (Apple Health → iOS Shortcut → Supabase).
--
-- * activity:       one value per user and day (active kcal), from the shortcut or entered manually
-- * import_tokens:  per-user secret for the shortcut; only a SHA-256 hash is stored
-- * create_import_token():  (logged in) generates a new token, returns it ONCE, invalidates the old one
-- * import_activity(...):   (anon + token) upserts a day's value — called by the iOS shortcut
-- * import_backup:  now also restores `activity` (wraps the previous function, same transaction)

-- ---------------------------------------------------------------------------
-- Activity
-- ---------------------------------------------------------------------------
create table public.activity (
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  date        date not null,
  active_kcal numeric not null check (active_kcal >= 0 and active_kcal <= 20000),
  source      text not null check (source in ('shortcut', 'manual')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.activity enable row level security;
create policy "own rows" on public.activity for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.activity to authenticated;

-- ---------------------------------------------------------------------------
-- Import tokens (no policies and no grants: unreachable through the API)
-- ---------------------------------------------------------------------------
create table public.import_tokens (
  user_id    uuid primary key references auth.users on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
alter table public.import_tokens enable row level security;

create function public.create_import_token() returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_token text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');  -- 192 bits
  insert into public.import_tokens (user_id, token_hash)
  values (v_uid, encode(extensions.digest(v_token, 'sha256'), 'hex'))
  on conflict (user_id) do update set token_hash = excluded.token_hash, created_at = now();
  return v_token;
end;
$$;

create function public.import_token_created_at() returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select created_at from public.import_tokens where user_id = auth.uid();
$$;

-- Called by the iOS shortcut without a session. p_kcal is text because Shortcuts may format
-- numbers the Polish way ("1 234,5").
create function public.import_activity(p_token text, p_date date, p_kcal text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_clean text;
  v_kcal numeric;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'Invalid token' using errcode = '28000';
  end if;
  select user_id into v_uid
    from public.import_tokens
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if v_uid is null then
    raise exception 'Invalid token' using errcode = '28000';
  end if;

  if p_date is null or p_date > current_date + 1 or p_date < current_date - 400 then
    raise exception 'Invalid date';
  end if;

  v_clean := replace(regexp_replace(coalesce(p_kcal, ''), '[\s  ]', '', 'g'), ',', '.');
  if v_clean !~ '^\d+(\.\d+)?$' then
    raise exception 'Invalid kcal';
  end if;
  v_kcal := v_clean::numeric;
  if v_kcal > 20000 then
    raise exception 'Invalid kcal';
  end if;

  insert into public.activity (user_id, date, active_kcal, source, updated_at)
  values (v_uid, p_date, v_kcal, 'shortcut', now())
  on conflict (user_id, date) do update
    set active_kcal = excluded.active_kcal, source = 'shortcut', updated_at = now();

  return jsonb_build_object('date', p_date, 'active_kcal', v_kcal);
end;
$$;

revoke execute on function public.create_import_token() from public, anon;
grant  execute on function public.create_import_token() to authenticated;
revoke execute on function public.import_token_created_at() from public, anon;
grant  execute on function public.import_token_created_at() to authenticated;
revoke execute on function public.import_activity(text, date, text) from public;
grant  execute on function public.import_activity(text, date, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Backup import: also restore activity (optional array in the same backup version)
-- ---------------------------------------------------------------------------
alter function public.import_backup(jsonb) rename to import_backup_core;

create function public.import_backup(p_data jsonb) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_counts jsonb;
begin
  v_counts := public.import_backup_core(p_data);  -- validates, wipes and restores core tables

  delete from public.activity where user_id = v_uid;
  insert into public.activity (date, active_kcal, source, updated_at)
  select (item ->> 'date')::date,
         (item ->> 'active_kcal')::numeric,
         coalesce(item ->> 'source', 'manual'),
         coalesce((item ->> 'updated_at')::timestamptz, now())
    from jsonb_array_elements(coalesce(p_data -> 'activity', '[]'::jsonb)) as item;

  return v_counts || jsonb_build_object(
    'activity', (select count(*) from public.activity where user_id = v_uid)
  );
end;
$$;

revoke execute on function public.import_backup(jsonb) from public, anon;
grant  execute on function public.import_backup(jsonb) to authenticated;
