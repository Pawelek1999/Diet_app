import { SETTINGS_KEYS } from '@/constants'
import type { Json } from '@/db/database.types'
import { check, maybe, supabase } from '@/db/supabase'
import { parseGoals, parseMeals } from '@/lib/settings'
import type { Goals, MealSetting } from '@/types'

async function getValue(key: string): Promise<unknown> {
  const row = maybe(await supabase.from('settings').select('value').eq('key', key).maybeSingle())
  return row?.value ?? null
}

async function setValue(key: string, value: Json): Promise<void> {
  check(await supabase.from('settings').upsert({ key, value }, { onConflict: 'user_id,key' }))
}

export async function getGoals(): Promise<Goals> {
  return parseGoals(await getValue(SETTINGS_KEYS.goals))
}

export async function saveGoals(goals: Goals): Promise<void> {
  await setValue(SETTINGS_KEYS.goals, goals)
}

export async function getMeals(): Promise<MealSetting[]> {
  return parseMeals(await getValue(SETTINGS_KEYS.meals))
}

export async function saveMeals(meals: readonly MealSetting[]): Promise<void> {
  await setValue(
    SETTINGS_KEYS.meals,
    meals.map((m) => ({ id: m.id, label: m.label, visible: m.visible })),
  )
}
