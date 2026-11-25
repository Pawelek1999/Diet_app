-- Migration 2: restore from a JSON backup (Settings → Import).
-- Replaces ALL data of the calling user in one transaction. IDs are re-generated; references
-- (dish_ingredients → products/dishes, entries → products/dishes) are remapped from backup ids.
-- SECURITY INVOKER: runs with the caller's RLS, so it can only touch the caller's rows.

create function public.import_backup(p_data jsonb) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_product_map jsonb := '{}'::jsonb;
  v_dish_map jsonb := '{}'::jsonb;
  v_row jsonb;
  v_new_id bigint;
  v_counts jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or (p_data ->> 'version') is distinct from '1' then
    raise exception 'Unsupported backup format';
  end if;

  -- Wipe current data (children first).
  delete from public.entries where user_id = v_uid;
  delete from public.dish_ingredients where user_id = v_uid;
  delete from public.dishes where user_id = v_uid;
  delete from public.products where user_id = v_uid;
  delete from public.settings where user_id = v_uid;

  -- Products
  for v_row in select value from jsonb_array_elements(coalesce(p_data -> 'products', '[]'::jsonb)) loop
    insert into public.products (
      name, kcal_100g, protein_100g, fat_100g, carbs_100g, serving_name, serving_grams,
      is_favorite, created_at, updated_at, deleted_at
    ) values (
      v_row ->> 'name',
      (v_row ->> 'kcal_100g')::numeric,
      coalesce((v_row ->> 'protein_100g')::numeric, 0),
      coalesce((v_row ->> 'fat_100g')::numeric, 0),
      coalesce((v_row ->> 'carbs_100g')::numeric, 0),
      v_row ->> 'serving_name',
      (v_row ->> 'serving_grams')::numeric,
      coalesce((v_row ->> 'is_favorite')::boolean, false),
      coalesce((v_row ->> 'created_at')::timestamptz, now()),
      coalesce((v_row ->> 'updated_at')::timestamptz, now()),
      (v_row ->> 'deleted_at')::timestamptz
    ) returning id into v_new_id;
    v_product_map := v_product_map || jsonb_build_object(v_row ->> 'id', v_new_id);
  end loop;

  -- Dishes
  for v_row in select value from jsonb_array_elements(coalesce(p_data -> 'dishes', '[]'::jsonb)) loop
    insert into public.dishes (
      name, mode, servings, cooked_weight_grams, kcal, protein, fat, carbs,
      description, notes, recipe_url, is_favorite, created_at, updated_at, deleted_at
    ) values (
      v_row ->> 'name',
      coalesce(v_row ->> 'mode', 'ingredients'),
      coalesce((v_row ->> 'servings')::numeric, 1),
      (v_row ->> 'cooked_weight_grams')::numeric,
      (v_row ->> 'kcal')::numeric,
      (v_row ->> 'protein')::numeric,
      (v_row ->> 'fat')::numeric,
      (v_row ->> 'carbs')::numeric,
      v_row ->> 'description',
      v_row ->> 'notes',
      v_row ->> 'recipe_url',
      coalesce((v_row ->> 'is_favorite')::boolean, false),
      coalesce((v_row ->> 'created_at')::timestamptz, now()),
      coalesce((v_row ->> 'updated_at')::timestamptz, now()),
      (v_row ->> 'deleted_at')::timestamptz
    ) returning id into v_new_id;
    v_dish_map := v_dish_map || jsonb_build_object(v_row ->> 'id', v_new_id);
  end loop;

  -- Dish ingredients (references must exist in the backup)
  for v_row in select value from jsonb_array_elements(coalesce(p_data -> 'dish_ingredients', '[]'::jsonb)) loop
    if v_dish_map ->> (v_row ->> 'dish_id') is null or v_product_map ->> (v_row ->> 'product_id') is null then
      raise exception 'Backup references a missing dish or product';
    end if;
    insert into public.dish_ingredients (dish_id, product_id, grams, position)
    values (
      (v_dish_map ->> (v_row ->> 'dish_id'))::bigint,
      (v_product_map ->> (v_row ->> 'product_id'))::bigint,
      (v_row ->> 'grams')::numeric,
      coalesce((v_row ->> 'position')::int, 0)
    );
  end loop;

  -- Entries
  for v_row in select value from jsonb_array_elements(coalesce(p_data -> 'entries', '[]'::jsonb)) loop
    if (v_row ->> 'product_id') is not null and v_product_map ->> (v_row ->> 'product_id') is null then
      raise exception 'Backup references a missing product';
    end if;
    if (v_row ->> 'dish_id') is not null and v_dish_map ->> (v_row ->> 'dish_id') is null then
      raise exception 'Backup references a missing dish';
    end if;
    insert into public.entries (
      date, meal, source_type, product_id, dish_id, name, amount, unit,
      kcal, protein, fat, carbs, created_at
    ) values (
      (v_row ->> 'date')::date,
      v_row ->> 'meal',
      v_row ->> 'source_type',
      (v_product_map ->> (v_row ->> 'product_id'))::bigint,
      (v_dish_map ->> (v_row ->> 'dish_id'))::bigint,
      v_row ->> 'name',
      (v_row ->> 'amount')::numeric,
      v_row ->> 'unit',
      (v_row ->> 'kcal')::numeric,
      coalesce((v_row ->> 'protein')::numeric, 0),
      coalesce((v_row ->> 'fat')::numeric, 0),
      coalesce((v_row ->> 'carbs')::numeric, 0),
      coalesce((v_row ->> 'created_at')::timestamptz, now())
    );
  end loop;

  -- Settings
  insert into public.settings (key, value)
  select item ->> 'key', item -> 'value'
    from jsonb_array_elements(coalesce(p_data -> 'settings', '[]'::jsonb)) as item;

  select jsonb_build_object(
    'products', (select count(*) from public.products where user_id = v_uid),
    'dishes', (select count(*) from public.dishes where user_id = v_uid),
    'entries', (select count(*) from public.entries where user_id = v_uid)
  ) into v_counts;
  return v_counts;
end;
$$;

revoke execute on function public.import_backup(jsonb) from public, anon;
grant  execute on function public.import_backup(jsonb) to authenticated;
