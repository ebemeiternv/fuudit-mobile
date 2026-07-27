// Fuudit-owned scanner abstraction so the UI does not depend directly on a
// specific scanning library. The current implementation uses the browser
// BarcodeDetector API (Chromium, Safari 16.4+). When it is not available we
// report `capability: "unsupported"` and the UI falls back to manual entry.
//
// A native Capacitor plugin adapter can be added later without touching the
// screens that consume this module — expose the same `startScan` interface.

export type ScannerCapability = "available" | "unsupported";
export type ScannerErrorCode =
  | "permission_denied"
  | "permission_dismissed"
  | "no_camera"
  | "unsupported"
  | "cancelled"
  | "timeout"
  | "unknown";

export class ScannerError extends Error {
  code: ScannerErrorCode;
  constructor(code: ScannerErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

type BarcodeDetectorFormat =
  | "ean_13"
  | "ean_8"
  | "upc_a"
  | "upc_e"
  | "code_128"
  | "itf";

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string; format?: string }>>;
}

interface BarcodeDetectorCtor {
  new (options?: { formats?: BarcodeDetectorFormat[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

const RETAIL_FORMATS: BarcodeDetectorFormat[] = ["ean_13", "ean_8", "upc_a", "upc_e"];

export const detectCapability = (): ScannerCapability => {
  if (typeof window === "undefined") return "unsupported";
  const w = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor };
  if (!w.BarcodeDetector) return "unsupported";
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  return "available";
};

export type ScanController = {
  stop: () => void;
};

export type StartScanOptions = {
  video: HTMLVideoElement;
  onResult: (code: string) => void;
  onError: (err: ScannerError) => void;
};

/**
 * Attaches the camera stream to `video`, then polls BarcodeDetector for
 * retail-food formats. Emits a single `onResult` per successful detection and
 * relies on the caller to stop scanning.
 */
export async function startScan({ video, onResult, onError }: StartScanOptions): Promise<ScanController> {
  const w = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor };
  if (!w.BarcodeDetector) {
    onError(new ScannerError("unsupported", "This browser does not support barcode scanning."));
    return { stop: () => {} };
  }

  let stream: MediaStream | null = null;
  let cancelled = false;
  let rafId: number | null = null;
  let intervalId: number | null = null;
  let alreadyEmitted = false;

  const stop = () => {
    cancelled = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    if (intervalId !== null) clearInterval(intervalId);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
  } catch (e) {
    const name = (e as { name?: string })?.name ?? "";
    if (name === "NotAllowedError" || name === "SecurityError") {
      onError(new ScannerError("permission_denied", "Camera permission is required to scan."));
    } else if (name === "NotFoundError" || name === "OverconstrainedError") {
      onError(new ScannerError("no_camera", "No camera was found on this device."));
    } else if (name === "AbortError" || name === "NotReadableError") {
      onError(new ScannerError("permission_dismissed", "Camera couldn't start. Please try again."));
    } else {
      onError(new ScannerError("unknown", "Camera failed to start."));
    }
    return { stop };
  }

  if (cancelled) {
    stop();
    return { stop };
  }

  video.srcObject = stream;
  video.setAttribute("playsinline", "true");
  try {
    await video.play();
  } catch {
    /* autoplay policies; the caller may show a Retry button */
  }

  const detector = new w.BarcodeDetector({ formats: RETAIL_FORMATS });

  const tick = async () => {
    if (cancelled || alreadyEmitted) return;
    if (video.readyState < 2 || video.videoWidth === 0) return;
    try {
      const results = await detector.detect(video);
      if (cancelled || alreadyEmitted) return;
      const hit = results.find((r) => /^[0-9]{6,14}$/.test(r.rawValue));
      if (hit) {
        alreadyEmitted = true;
        onResult(hit.rawValue);
      }
    } catch {
      /* transient detection errors are safe to ignore */
    }
  };

  // Poll every 300ms — cheap enough on mobile and generous enough for detection.
  intervalId = window.setInterval(tick, 300);

  return { stop };
}
