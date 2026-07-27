// Barcode scanning UI. Camera when supported, manual entry always available.
// On successful lookup the sheet dispatches an "initial values" bundle to the
// parent, which then opens PantryItemSheet prefilled with the scanned product.
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Keyboard, AlertTriangle, Package } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  detectCapability,
  startScan,
  type ScanController,
  type ScannerErrorCode,
} from "@/lib/scanner";
import { barcodeRepository } from "@/repositories/barcode";
import {
  isValidBarcodeFormat,
  mapCategory,
  productDisplayName,
  type NormalizedProduct,
} from "@/lib/openFoodFacts";
import { UNITS, type UnitType } from "@/lib/pantry";
import type { PantryItem } from "@/repositories/pantry";

export type ScannedInitialValues = {
  name?: string;
  brand?: string;
  category?: string;
  unit?: UnitType | "";
  package_quantity?: string;
  package_unit?: UnitType | "";
  barcode?: string;
  product_image_url?: string;
  product_source?: string;
  product_source_id?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  onPrefill: (values: ScannedInitialValues) => void;
  onDuplicate?: (existing: PantryItem, product: NormalizedProduct | null) => void;
};

const errorMessage: Record<ScannerErrorCode, string> = {
  permission_denied: "Camera access is blocked. You can still enter the barcode manually.",
  permission_dismissed: "Camera couldn't start. Try again or enter the barcode manually.",
  no_camera: "No camera was detected on this device.",
  unsupported: "This browser can't scan barcodes yet — enter the code below.",
  cancelled: "",
  timeout: "Scanning took too long.",
  unknown: "Camera failed. Enter the barcode manually.",
};

// iOS Safari (and installed PWAs) don't ship BarcodeDetector in the web view.
// We detect it so we can show honest, iPhone-specific wording instead of a
// generic "unsupported" error.
const isIosLike = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac; detect touch-enabled Macs as iPad.
  const iPadOs = ua.includes("Macintosh") && (navigator as { maxTouchPoints?: number }).maxTouchPoints! > 1;
  return iOS || iPadOs;
};

const productToPrefill = (p: NormalizedProduct): ScannedInitialValues => {
  const category = mapCategory(p.categories);
  // Prefer the recognized retail unit; fall back to piece so quantity has meaning.
  const packageUnit =
    p.packageUnit && (UNITS as readonly string[]).includes(p.packageUnit)
      ? (p.packageUnit as UnitType)
      : "";
  return {
    name: productDisplayName(p),
    brand: p.brand ?? "",
    category: category || "",
    unit: packageUnit || "piece",
    package_quantity: p.packageQuantity != null ? String(p.packageQuantity) : "",
    package_unit: packageUnit,
    barcode: p.barcode,
    product_image_url: p.imageUrl ?? "",
    product_source: p.source,
    product_source_id: p.barcode,
  };
};

const BarcodeScanSheet = ({ open, onOpenChange, userId, onPrefill, onDuplicate }: Props) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controllerRef = useRef<ScanController | null>(null);
  const [capability] = useState(() => detectCapability());
  const [mode, setMode] = useState<"camera" | "manual">(
    detectCapability() === "available" ? "camera" : "manual",
  );
  const [manual, setManual] = useState("");
  const [manualErr, setManualErr] = useState<string | null>(null);
  const [scannerErr, setScannerErr] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [foundBarcode, setFoundBarcode] = useState<string | null>(null);

  // Reset local state whenever the sheet closes or re-opens.
  useEffect(() => {
    if (!open) {
      controllerRef.current?.stop();
      controllerRef.current = null;
      setManual("");
      setManualErr(null);
      setScannerErr(null);
      setLooking(false);
      setFoundBarcode(null);
      setMode(capability === "available" ? "camera" : "manual");
      return;
    }
  }, [open, capability]);

  // Manage camera lifecycle when in camera mode.
  useEffect(() => {
    if (!open || mode !== "camera" || capability !== "available") return;
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    (async () => {
      const ctrl = await startScan({
        video,
        onResult: (code) => {
          if (disposed) return;
          void handleBarcode(code);
        },
        onError: (err) => {
          if (disposed) return;
          setScannerErr(errorMessage[err.code] ?? "Camera error.");
        },
      });
      if (disposed) {
        ctrl.stop();
        return;
      }
      controllerRef.current = ctrl;
    })();
    return () => {
      disposed = true;
      controllerRef.current?.stop();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, capability]);

  const handleBarcode = async (code: string) => {
    if (looking || foundBarcode) return;
    if (!isValidBarcodeFormat(code)) {
      toast({
        title: "Unrecognized barcode",
        description: "That doesn't look like a retail food barcode.",
        variant: "destructive",
      });
      return;
    }
    setFoundBarcode(code);
    setLooking(true);
    // Stop the camera as soon as we have a candidate to save battery/CPU.
    controllerRef.current?.stop();
    controllerRef.current = null;

    try {
      // Duplicate check by barcode first — cheapest and most precise.
      const existingByBarcode = userId
        ? await barcodeRepository.findLikelyDuplicate(userId, code, null)
        : null;

      const lookup = await barcodeRepository.lookup(code);
      if (lookup.status === "error") {
        toast({
          title: "Lookup failed",
          description: lookup.message,
          variant: "destructive",
        });
        setLooking(false);
        setFoundBarcode(null);
        return;
      }

      if (lookup.status === "not_found") {
        toast({
          title: "Product not in database",
          description: "You can still add it manually with the barcode saved.",
        });
        if (existingByBarcode) {
          onDuplicate?.(existingByBarcode, null);
          onOpenChange(false);
          return;
        }
        onPrefill({ barcode: code });
        onOpenChange(false);
        return;
      }

      const product = lookup.product;
      // Name-based duplicate check if barcode didn't match anything.
      const existing =
        existingByBarcode ??
        (userId
          ? await barcodeRepository.findLikelyDuplicate(userId, null, productDisplayName(product))
          : null);

      if (existing) {
        onDuplicate?.(existing, product);
        onOpenChange(false);
        return;
      }

      onPrefill(productToPrefill(product));
      onOpenChange(false);
    } finally {
      setLooking(false);
    }
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manual.trim();
    if (!isValidBarcodeFormat(trimmed)) {
      setManualErr("Enter 6–14 digits.");
      return;
    }
    setManualErr(null);
    void handleBarcode(trimmed);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[92dvh] overflow-y-auto p-0 border-t border-[hsl(var(--app-border))]"
      >
        <div className="flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-2 text-left">
            <SheetTitle className="text-xl font-bold text-[hsl(var(--app-foreground))]">
              {capability === "available" ? "Scan product" : "Enter barcode"}
            </SheetTitle>
            <SheetDescription className="text-[hsl(var(--app-muted))]">
              {capability === "available"
                ? "Point the camera at the barcode on the package."
                : "Type the number under the barcode to fetch product details."}
            </SheetDescription>
          </SheetHeader>

          {mode === "camera" && capability === "available" ? (
            <div className="px-5 pt-3 space-y-3">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/70" />
                {looking && (
                  <div className="absolute inset-0 grid place-items-center bg-black/40 text-white text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Looking up product…
                    </div>
                  </div>
                )}
              </div>
              {scannerErr && (
                <div className="flex items-start gap-2 rounded-xl bg-[hsl(var(--app-accent-warm-soft))] p-3 text-sm text-[hsl(var(--app-accent-warm))]">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <p>{scannerErr}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setMode("manual")}
                className="w-full h-11 rounded-xl border border-[hsl(var(--app-border))] bg-white text-sm font-medium text-[hsl(var(--app-foreground))] flex items-center justify-center gap-2 no-tap-highlight"
              >
                <Keyboard className="h-4 w-4" /> Enter barcode manually
              </button>
            </div>
          ) : (
            <form onSubmit={submitManual} className="px-5 pt-3 space-y-4">
              {capability !== "available" && (
                isIosLike() ? (
                  <div className="rounded-2xl bg-[hsl(var(--app-primary-soft))] p-4 space-y-1.5">
                    <p className="text-sm font-semibold text-[hsl(var(--app-foreground))]">
                      Live camera scanning isn't available on iPhone yet
                    </p>
                    <p className="text-xs text-[hsl(var(--app-muted))] leading-relaxed">
                      Apple's web view doesn't support in-browser barcode scanning today. Enter the number below to look up the product — native scanning is coming with the iPhone app.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-xl bg-[hsl(var(--app-subtle))] p-3 text-xs text-[hsl(var(--app-muted))]">
                    <Package className="h-4 w-4 mt-0.5" />
                    <p>Barcode camera scanning isn't available on this device or browser. Enter the number printed under the barcode.</p>
                  </div>
                )
              )}
              <div className="space-y-1.5">
                <Label htmlFor="barcode">Barcode number</Label>
                <Input
                  id="barcode"
                  inputMode="numeric"
                  autoFocus
                  value={manual}
                  onChange={(e) => setManual(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 4740098012345"
                  maxLength={14}
                  className="h-12 rounded-xl"
                />
                {manualErr && (
                  <p className="text-xs text-[hsl(var(--app-danger))]">{manualErr}</p>
                )}
              </div>
              {capability === "available" && (
                <button
                  type="button"
                  onClick={() => setMode("camera")}
                  className="w-full h-11 rounded-xl border border-[hsl(var(--app-border))] bg-white text-sm font-medium text-[hsl(var(--app-foreground))] flex items-center justify-center gap-2 no-tap-highlight"
                >
                  <Camera className="h-4 w-4" /> Use camera instead
                </button>
              )}
              <Button
                type="submit"
                disabled={looking || manual.length < 6}
                className="w-full h-12 rounded-xl bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white"
              >
                {looking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Look up product
              </Button>
            </form>
          )}

          <SheetFooter className="px-5 pb-6 pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BarcodeScanSheet;
