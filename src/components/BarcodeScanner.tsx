import { useEffect, useRef, useState, type FormEvent } from 'react'
import { normalizeBarcode } from '@/lib/barcode'

type Props = {
  onDetected: (barcode: string) => void
  onClose: () => void
}

type Status = 'starting' | 'scanning' | 'error'

const SCAN_INTERVAL_MS = 150

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Brak dostępu do aparatu. Zezwól na aparat (Ustawienia iPhone’a → Safari → Aparat) albo wpisz kod ręcznie.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Nie znaleziono aparatu. Wpisz kod ręcznie.'
  return 'Nie udało się uruchomić aparatu. Wpisz kod ręcznie.'
}

/** Full-screen camera view that reads EAN/UPC codes; also allows typing the code by hand. */
export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>('starting')
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)
  // Latest callback without restarting the camera when the parent re-renders.
  const onDetectedRef = useRef(onDetected)
  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    let stopped = false
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | undefined

    function stop() {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera API')
        const [media, { createDetector }] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          }),
          import('@/services/barcodeDetector'),
        ])
        stream = media
        if (stopped) return stop()
        const video = videoRef.current
        if (!video) return stop()
        video.srcObject = media
        await video.play()
        const detector = await createDetector()
        if (stopped) return
        setStatus('scanning')

        const tick = async () => {
          if (stopped) return
          try {
            if (video.readyState >= 2) {
              const codes = await detector.detect(video)
              for (const c of codes) {
                const code = normalizeBarcode(c.rawValue)
                if (code && !stopped) {
                  stop()
                  onDetectedRef.current(code)
                  return
                }
              }
            }
          } catch {
            // A single failed frame is not fatal; try the next one.
          }
          timer = setTimeout(tick, SCAN_INTERVAL_MS)
        }
        void tick()
      } catch (err) {
        if (stopped) return
        stop()
        setStatus('error')
        setError(cameraErrorMessage(err))
      }
    }

    void start()
    return stop
  }, [])

  function submitManual(e: FormEvent) {
    e.preventDefault()
    const code = normalizeBarcode(manual)
    if (!code) {
      setManualError('Kod kreskowy to 8–14 cyfr.')
      return
    }
    onDetectedRef.current(code)
  }

  return (
    <div className="scanner" role="dialog" aria-modal="true" aria-label="Skaner kodów kreskowych">
      <div className="scanner-view">
        <video ref={videoRef} className="scanner-video" playsInline muted />
        {status !== 'error' && <div className="scanner-frame" aria-hidden="true" />}
        <p className="scanner-hint" role="status">
          {status === 'starting' ? 'Uruchamianie aparatu…' : status === 'scanning' ? 'Skieruj aparat na kod kreskowy' : error}
        </p>
        <button type="button" className="scanner-close" onClick={onClose} aria-label="Zamknij skaner">
          ✕
        </button>
      </div>

      <form className="scanner-manual" onSubmit={submitManual} noValidate>
        <label className="field">
          <span className="field-label">Albo wpisz kod ręcznie</span>
          <div className="scanner-manual-row">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="np. 5900512300108"
              value={manual}
              aria-invalid={Boolean(manualError)}
              onChange={(e) => {
                setManual(e.target.value)
                setManualError(null)
              }}
            />
            <button type="submit" className="button button-primary">
              OK
            </button>
          </div>
          {manualError && <span className="field-error">{manualError}</span>}
        </label>
      </form>
    </div>
  )
}
