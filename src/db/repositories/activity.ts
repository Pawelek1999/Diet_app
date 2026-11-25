import { SETTINGS_KEYS } from '@/constants'
import { check, maybe, must, supabase } from '@/db/supabase'
import { parseActivitySettings } from '@/lib/activity'
import type { Activity, ActivitySettings, ActivitySource } from '@/types'

const COLUMNS = 'date, active_kcal, source, updated_at'

type ActivityRow = { date: string; active_kcal: number; source: string; updated_at: string }

function mapActivity(row: ActivityRow): Activity {
  return {
    date: row.date,
    activeKcal: Number(row.active_kcal),
    source: (row.source === 'shortcut' ? 'shortcut' : 'manual') as ActivitySource,
    updatedAt: row.updated_at,
  }
}

export async function getActivity(date: string): Promise<Activity | null> {
  const row = maybe(await supabase.from('activity').select(COLUMNS).eq('date', date).maybeSingle())
  return row ? mapActivity(row) : null
}

export async function listActivityInRange(from: string, to: string): Promise<Activity[]> {
  const rows = must(await supabase.from('activity').select(COLUMNS).gte('date', from).lte('date', to).order('date'))
  return rows.map(mapActivity)
}

/** Manual value for a day (overwrites a value from the shortcut). */
export async function saveManualActivity(date: string, activeKcal: number): Promise<void> {
  check(
    await supabase
      .from('activity')
      .upsert(
        { date, active_kcal: activeKcal, source: 'manual', updated_at: new Date().toISOString() },
        { onConflict: 'user_id,date' },
      ),
  )
}

export async function deleteActivity(date: string): Promise<void> {
  check(await supabase.from('activity').delete().eq('date', date))
}

/** Generates a new token for the iOS shortcut (the previous one stops working). Shown only once. */
export async function createImportToken(): Promise<string> {
  return must(await supabase.rpc('create_import_token'))
}

export async function getImportTokenCreatedAt(): Promise<string | null> {
  return maybe(await supabase.rpc('import_token_created_at'))
}

export async function getActivitySettings(): Promise<ActivitySettings> {
  const row = maybe(await supabase.from('settings').select('value').eq('key', SETTINGS_KEYS.activity).maybeSingle())
  return parseActivitySettings(row?.value ?? null)
}

export async function saveActivitySettings(s: ActivitySettings): Promise<void> {
  check(
    await supabase
      .from('settings')
      .upsert({ key: SETTINGS_KEYS.activity, value: s }, { onConflict: 'user_id,key' }),
  )
}
