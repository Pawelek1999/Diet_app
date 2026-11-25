-- Migration 1: core schema for Kalorie.
-- Every table is owned per user (user_id), protected by RLS, and granted explicitly
-- (the project does NOT auto-grant new tables to the Data API).

-- ---------------------------------------------------------------------------
-- Products: nutrition values per 100 g
-- ---------------------------------------------------------------------------
create table public.products (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  kcal_100g     numeric not null check (kcal_100g >= 0),
  protein_100g  numeric not null default 0 check (protein_100g >= 0),
  fat_100g      numeric not null default 0 check (fat_100g >= 0),
  carbs_100g    numeric not null default 0 check (carbs_100g >= 0),
  serving_name  text,
  serving_grams numeric check (serving_grams > 0),
  is_favorite   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index products_user_idx on public.products (user_id);

-- ---------------------------------------------------------------------------
-- Dishes (recipes)
-- ---------------------------------------------------------------------------
create table public.dishes (
  id                  bigint generated always as identity primary key,
  user_id             uuid not null default auth.uid() references auth.users on delete cascade,
  name                text not null check (length(trim(name)) > 0),
  servings            numeric not null default 1 check (servings > 0),
  cooked_weight_grams numeric check (cooked_weight_grams > 0),
  is_favorite         boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
create index dishes_user_idx on public.dishes (user_id);

create table public.dish_ingredients (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  dish_id    bigint not null references public.dishes on delete cascade,
  product_id bigint not null references public.products,
  grams      numeric not null check (grams > 0),
  position   int not null default 0
);
create index dish_ingredients_dish_idx on public.dish_ingredients (dish_id);
create index dish_ingredients_product_idx on public.dish_ingredients (product_id);

-- ---------------------------------------------------------------------------
-- Diary entries — kcal/macros are a SNAPSHOT for the logged amount
-- ---------------------------------------------------------------------------
create table public.entries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  date        date not null,
  meal        text not null check (meal in ('breakfast','second_breakfast','lunch','snack_pm','dinner','snack')),
  source_type text not null check (source_type in ('product','dish','quick')),
  product_id  bigint references public.products,
  dish_id     bigint references public.dishes,
  name        text not null,
  amount      numeric not null check (amount > 0),
  unit        text not null check (unit in ('g','serving')),
  kcal        numeric not null check (kcal >= 0),
  protein     numeric not null default 0 check (protein >= 0),
  fat         numeric not null default 0 check (fat >= 0),
  carbs       numeric not null default 0 check (carbs >= 0),
  created_at  timestamptz not null default now(),
  constraint entries_source_check check (
    (source_type = 'product' and product_id is not null and dish_id is null) or
    (source_type = 'dish'    and dish_id is not null and product_id is null) or
    (source_type = 'quick'   and product_id is null and dish_id is null)
  )
);
create index entries_user_date_idx on public.entries (user_id, date);
create index entries_product_idx on public.entries (product_id);
create index entries_dish_idx on public.entries (dish_id);

-- ---------------------------------------------------------------------------
-- Key–value settings (JSON values)
-- ---------------------------------------------------------------------------
create table public.settings (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key     text not null,
  value   jsonb not null,
  primary key (user_id, key)
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger dishes_set_updated_at before update on public.dishes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: each user sees and edits only their own rows
-- ---------------------------------------------------------------------------
alter table public.products         enable row level security;
alter table public.dishes           enable row level security;
alter table public.dish_ingredients enable row level security;
alter table public.entries          enable row level security;
alter table public.settings         enable row level security;

create policy "own rows" on public.products for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.dishes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.dish_ingredients for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- save_dish: insert/update a dish and replace its ingredients atomically.
-- SECURITY INVOKER — runs with the caller's RLS.
-- p_ingredients: [{"product_id": 1, "grams": 60}, ...] (order = position)
-- ---------------------------------------------------------------------------
create function public.save_dish(
  p_id bigint,
  p_name text,
  p_servings numeric,
  p_cooked_weight_grams numeric,
  p_is_favorite boolean,
  p_ingredients jsonb
) returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if p_ingredients is null or jsonb_typeof(p_ingredients) <> 'array' then
    raise exception 'p_ingredients must be a JSON array';
  end if;

  if p_id is null then
    insert into public.dishes (name, servings, cooked_weight_grams, is_favorite)
    values (p_name, p_servings, p_cooked_weight_grams, coalesce(p_is_favorite, false))
    returning id into v_id;
  else
    update public.dishes
       set name = p_name,
           servings = p_servings,
           cooked_weight_grams = p_cooked_weight_grams,
           is_favorite = coalesce(p_is_favorite, false)
     where id = p_id and deleted_at is null
    returning id into v_id;

    if v_id is null then
      raise exception 'Dish % not found', p_id;
    end if;

    delete from public.dish_ingredients where dish_id = v_id;
  end if;

  insert into public.dish_ingredients (dish_id, product_id, grams, position)
  select v_id,
         (item.value ->> 'product_id')::bigint,
         (item.value ->> 'grams')::numeric,
         (item.ordinality - 1)::int
    from jsonb_array_elements(p_ingredients) with ordinality as item(value, ordinality);

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Explicit grants (anon gets nothing here)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.products         to authenticated;
grant select, insert, update, delete on public.dishes           to authenticated;
grant select, insert, update, delete on public.dish_ingredients to authenticated;
grant select, insert, update, delete on public.entries          to authenticated;
grant select, insert, update, delete on public.settings         to authenticated;

revoke execute on function public.save_dish(bigint, text, numeric, numeric, boolean, jsonb) from public, anon;
grant  execute on function public.save_dish(bigint, text, numeric, numeric, boolean, jsonb) to authenticated;
