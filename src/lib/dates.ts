// Day keys are 'YYYY-MM-DD' strings in the user's local time zone (Europe/Warsaw).
// Arithmetic is done on UTC dates built from the key, so DST changes never shift the day.

const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isDayKey(value: string): boolean {
  const m = DAY_KEY_RE.exec(value)
  if (!m) return false
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3])
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local calendar day of the given moment (device time zone). */
export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayKey(now: Date = new Date()): string {
  return toDayKey(now)
}

function parseUtc(key: string): Date {
  const m = DAY_KEY_RE.exec(key)
  if (!m || !isDayKey(key)) throw new Error(`Invalid day key: ${key}`)
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

function fromUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function addDays(key: string, days: number): string {
  const d = parseUtc(key)
  d.setUTCDate(d.getUTCDate() + days)
  return fromUtc(d)
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(key: string): number {
  return (parseUtc(key).getUTCDay() + 6) % 7
}

/** Monday of the week containing the given day. */
export function startOfWeek(key: string): string {
  return addDays(key, -weekdayIndex(key))
}

/** All 7 day keys (Mon–Sun) of the week containing the given day. */
export function weekDays(key: string): string[] {
  const monday = startOfWeek(key)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** Signed number of days from a to b. */
export function diffDays(a: string, b: string): number {
  return Math.round((parseUtc(b).getTime() - parseUtc(a).getTime()) / 86_400_000)
}

const WEEKDAYS_SHORT = ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd']
const WEEKDAYS_LONG = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela']
const MONTHS_GENITIVE = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
]

export function weekdayShort(key: string): string {
  return WEEKDAYS_SHORT[weekdayIndex(key)] ?? ''
}

/** e.g. "25 listopada" */
export function formatDayMonth(key: string): string {
  const d = parseUtc(key)
  return `${d.getUTCDate()} ${MONTHS_GENITIVE[d.getUTCMonth()] ?? ''}`
}

/** Human label relative to today: "Dziś", "Wczoraj", "Jutro" or "środa, 25 listopada". */
export function formatDayLabel(key: string, today: string = todayKey()): string {
  const diff = diffDays(today, key)
  if (diff === 0) return 'Dziś'
  if (diff === -1) return 'Wczoraj'
  if (diff === 1) return 'Jutro'
  return `${WEEKDAYS_LONG[weekdayIndex(key)] ?? ''}, ${formatDayMonth(key)}`
}
