import { BarcodeDetector, prepareZXingModule } from 'barcode-detector/ponyfill'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'
import { SCAN_FORMATS } from '@/lib/barcode'

// Loaded on demand (dynamic import) only when the scanner opens: keeps ZXing out of the main bundle.
// The WASM file is served from our own origin (not the default jsDelivr CDN).
prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
  },
})

export type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> }

type NativeDetectorCtor = new (options: { formats: string[] }) => Detector

/** Native BarcodeDetector when the browser has one (and supports EAN), otherwise ZXing (WebAssembly). */
export async function createDetector(): Promise<Detector> {
  const native = (globalThis as { BarcodeDetector?: NativeDetectorCtor & { getSupportedFormats?: () => Promise<string[]> } })
    .BarcodeDetector
  if (native?.getSupportedFormats) {
    try {
      const supported = await native.getSupportedFormats()
      if (supported.includes('ean_13')) return new native({ formats: [...SCAN_FORMATS] })
    } catch {
      // fall through to ZXing
    }
  }
  return new BarcodeDetector({ formats: [...SCAN_FORMATS] })
}
