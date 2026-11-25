import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { exportBackup, importBackup, setLastBackupAt } from '@/db/repositories/backup'
import { useLastBackupAt } from '@/hooks/useSettings'
import { backupFileName, parseBackupFile, summarizeBackup } from '@/lib/backup'
import { formatDayMonth, todayKey, toDayKey } from '@/lib/dates'

type Status = { kind: 'idle' } | { kind: 'busy'; text: string } | { kind: 'ok'; text: string } | { kind: 'error'; text: string }

/** Shares the file (iOS: "Zapisz w Plikach") or falls back to a download. Returns false if cancelled. */
async function shareOrDownload(file: File): Promise<boolean> {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name })
      return true
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return false
      // Share failed for another reason — fall back to download below.
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return true
}

export function BackupSection() {
  const queryClient = useQueryClient()
  const lastBackup = useLastBackupAt()
  const fileInput = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [prepared, setPrepared] = useState<File | null>(null)

  // Step 1: fetch data and build the file (network).
  async function handlePrepare() {
    setStatus({ kind: 'busy', text: 'Przygotowuję kopię…' })
    try {
      const backup = await exportBackup()
      const file = new File([JSON.stringify(backup, null, 1)], backupFileName(todayKey()), { type: 'application/json' })
      setPrepared(file)
      const s = summarizeBackup(backup)
      setStatus({ kind: 'ok', text: `Kopia gotowa: ${s.products} produktów, ${s.dishes} dań, ${s.entries} wpisów. Zapisz plik.` })
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Nie udało się utworzyć kopii.' })
    }
  }

  // Step 2: share/save directly from the tap (iOS requires a user gesture for the share sheet).
  async function handleSave() {
    if (!prepared) return
    const done = await shareOrDownload(prepared)
    if (!done) return
    setPrepared(null)
    setStatus({ kind: 'ok', text: 'Plik kopii zapisany.' })
    try {
      await setLastBackupAt(new Date().toISOString())
      void lastBackup.refetch()
    } catch {
      // Not critical — only the "last backup" date is not updated.
    }
  }

  async function handleFile(file: File) {
    setStatus({ kind: 'busy', text: 'Sprawdzam plik…' })
    const parsed = parseBackupFile(await file.text())
    if (!parsed.ok) {
      setStatus({ kind: 'error', text: parsed.error })
      return
    }
    const s = summarizeBackup(parsed.backup)
    const range = s.firstDate && s.lastDate ? ` (dni ${s.firstDate} – ${s.lastDate})` : ''
    const confirmed = window.confirm(
      `Przywrócić kopię z pliku „${file.name}”?\n\n` +
        `${s.products} produktów, ${s.dishes} dań, ${s.entries} wpisów${range}.\n\n` +
        'UWAGA: wszystkie obecne dane w aplikacji zostaną zastąpione danymi z kopii.',
    )
    if (!confirmed) {
      setStatus({ kind: 'idle' })
      return
    }
    setStatus({ kind: 'busy', text: 'Przywracam dane…' })
    try {
      const counts = await importBackup(parsed.backup)
      await queryClient.invalidateQueries()
      setStatus({ kind: 'ok', text: `Przywrócono: ${counts.products} produktów, ${counts.dishes} dań, ${counts.entries} wpisów.` })
    } catch (err) {
      setStatus({ kind: 'error', text: `Nie udało się przywrócić (dane bez zmian): ${err instanceof Error ? err.message : ''}` })
    }
  }

  const busy = status.kind === 'busy'
  const last = lastBackup.data ? toDayKey(new Date(lastBackup.data)) : null

  return (
    <section className="card section">
      <h2 className="section-title">Kopia zapasowa</h2>
      <p className="muted small">
        Dane są w chmurze (Supabase). Dodatkowa kopia w pliku chroni przed przypadkowym usunięciem — rób ją raz w miesiącu.
        {last ? ` Ostatnia kopia: ${formatDayMonth(last)} ${last.slice(0, 4)}.` : ' Nie zrobiono jeszcze kopii.'}
      </p>
      <div className="actions">
        {prepared ? (
          <button type="button" className="button button-primary" onClick={handleSave}>
            Zapisz plik
          </button>
        ) : (
          <button type="button" className="button button-primary" onClick={handlePrepare} disabled={busy}>
            Przygotuj kopię
          </button>
        )}
        <button type="button" className="button button-secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
          Importuj…
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void handleFile(f)
        }}
      />
      {status.kind !== 'idle' && (
        <p className={status.kind === 'error' ? 'form-error' : 'muted small'} role={status.kind === 'error' ? 'alert' : 'status'}>
          {status.text}
        </p>
      )}
    </section>
  )
}
