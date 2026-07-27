import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/hooks/use-toast";
import {
  CATEGORIES,
  LOCATIONS,
  UNITS,
  parseLocalDate,
  toLocalDateString,
  type PantryLocation,
  type UnitType,
} from "@/lib/pantry";
import { Sparkles } from "lucide-react";
import { useSmartDefaults } from "@/hooks/queries/useProductIntelligence";
import { useAuth } from "@/hooks/useAuth";
import type { PantryItem } from "@/repositories/pantry";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  quantity: z
    .string()
    .optional()
    .refine((v) => !v || !isNaN(Number(v)), "Must be a number"),
  unit: z.string().optional(),
  category: z.string().optional(),
  location: z.enum(["fridge", "freezer", "pantry", "other"]),
  purchased_on: z.string().optional(),
  expires_on: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type FormState = {
  name: string;
  quantity: string;
  unit: UnitType | "";
  category: string;
  location: PantryLocation;
  purchased_on: string;
  expires_on: string;
  notes: string;
  // Optional product metadata (from barcode scans). Not user-editable in the
  // form itself, but preserved so submit can persist it.
  barcode: string;
  brand: string;
  product_image_url: string;
  product_source: string;
  product_source_id: string;
  package_quantity: string;
  package_unit: UnitType | "";
};

const empty: FormState = {
  name: "",
  quantity: "",
  unit: "piece",
  category: "Produce",
  location: "fridge",
  purchased_on: "",
  expires_on: "",
  notes: "",
  barcode: "",
  brand: "",
  product_image_url: "",
  product_source: "",
  product_source_id: "",
  package_quantity: "",
  package_unit: "",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: PantryItem | null;
  /** Seeds the form when adding a new item (ignored when editing). */
  initialValues?: Partial<FormState>;
  onSubmit: (payload: {
    name: string;
    quantity: number | null;
    unit: UnitType | null;
    category: string | null;
    location: PantryLocation;
    purchased_on: string | null;
    expires_on: string | null;
    notes: string | null;
    barcode?: string | null;
    brand?: string | null;
    product_image_url?: string | null;
    product_source?: string | null;
    product_source_id?: string | null;
    package_quantity?: number | null;
    package_unit?: UnitType | null;
  }) => Promise<void>;
  saving?: boolean;
};

const PantryItemSheet = ({ open, onOpenChange, item, initialValues, onSubmit, saving }: Props) => {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Track which fields the user has touched so learned defaults never
  // clobber intentional entries.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [prefillApplied, setPrefillApplied] = useState(false);

  // Only run intelligence lookup when adding a new item (not editing) and
  // we have some identity signal to work with.
  const isNew = !item;
  const lookupName = isNew ? form.name : "";
  const lookupBarcode = isNew ? form.barcode : "";
  const { data: defaults } = useSmartDefaults(
    user?.id,
    {
      barcode: lookupBarcode || null,
      name: lookupName || null,
      productHints: {
        category: (initialValues?.category as string | undefined) ?? null,
        package_quantity: initialValues?.package_quantity
          ? Number(initialValues.package_quantity)
          : null,
        package_unit:
          (initialValues?.package_unit as UnitType | undefined) ?? null,
      },
    },
    isNew && (Boolean(lookupBarcode) || (lookupName?.trim().length ?? 0) >= 3),
  );

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        ...empty,
        name: item.name,
        quantity: item.quantity != null ? String(item.quantity) : "",
        unit: (item.unit as UnitType) ?? "",
        category: item.category ?? "",
        location: item.location,
        purchased_on: item.purchased_on ?? "",
        expires_on: item.expires_on ?? "",
        notes: item.notes ?? "",
        barcode: (item as { barcode?: string | null }).barcode ?? "",
        brand: (item as { brand?: string | null }).brand ?? "",
        product_image_url:
          (item as { product_image_url?: string | null }).product_image_url ?? "",
        product_source:
          (item as { product_source?: string | null }).product_source ?? "",
        product_source_id:
          (item as { product_source_id?: string | null }).product_source_id ?? "",
        package_quantity:
          (item as { package_quantity?: number | null }).package_quantity != null
            ? String((item as { package_quantity?: number | null }).package_quantity)
            : "",
        package_unit:
          ((item as { package_unit?: UnitType | null }).package_unit as UnitType) ?? "",
      });
    } else {
      setForm({ ...empty, ...(initialValues ?? {}) });
    }
    setErrors({});
    setTouched({});
    setPrefillApplied(false);
  }, [open, item, initialValues]);

  // Fill blank fields from learned defaults exactly once per open. Never
  // overwrite anything the user has touched or that already came from a scan.
  useEffect(() => {
    if (!open || !isNew || !defaults || prefillApplied) return;
    setForm((f) => {
      const next = { ...f };
      if (!f.category && !touched.category && defaults.category)
        next.category = defaults.category;
      if (!touched.location && defaults.location) next.location = defaults.location;
      if (!f.quantity && !touched.quantity && defaults.quantity != null)
        next.quantity = String(defaults.quantity);
      if (!f.unit && !touched.unit && defaults.unit) next.unit = defaults.unit;
      if (
        !f.expires_on &&
        !touched.expires_on &&
        defaults.suggested_expires_on
      )
        next.expires_on = defaults.suggested_expires_on;
      return next;
    });
    setPrefillApplied(true);
  }, [open, isNew, defaults, prefillApplied, touched]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    setTouched((t) => ({ ...t, [key]: true }));
    setForm((f) => ({ ...f, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[issue.path[0] as string] = issue.message;
      }
      setErrors(errs);
      return;
    }
    try {
      await onSubmit({
        name: form.name.trim(),
        quantity: form.quantity ? Number(form.quantity) : null,
        unit: form.unit ? (form.unit as UnitType) : null,
        category: form.category || null,
        location: form.location,
        purchased_on: form.purchased_on || null,
        expires_on: form.expires_on || null,
        notes: form.notes?.trim() || null,
        barcode: form.barcode || null,
        brand: form.brand || null,
        product_image_url: form.product_image_url || null,
        product_source: form.product_source || null,
        product_source_id: form.product_source_id || null,
        package_quantity: form.package_quantity ? Number(form.package_quantity) : null,
        package_unit: form.package_unit ? (form.package_unit as UnitType) : null,
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: item ? "Couldn't update item" : "Couldn't add item",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const expDate = parseLocalDate(form.expires_on);
  const purDate = parseLocalDate(form.purchased_on);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[92dvh] overflow-y-auto p-0 border-t border-[hsl(var(--app-border))]"
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-2 text-left">
            <SheetTitle className="text-xl font-bold text-[hsl(var(--app-foreground))]">
              {item ? "Edit item" : "Add pantry item"}
            </SheetTitle>
            <SheetDescription className="text-[hsl(var(--app-muted))]">
              Track what's in your kitchen and when it expires.
            </SheetDescription>
          </SheetHeader>

          {form.barcode && (
            <div className="mx-5 mt-2 mb-1 flex items-center gap-3 rounded-2xl border border-[hsl(var(--app-border))] bg-[hsl(var(--app-subtle))] p-3">
              {form.product_image_url ? (
                <img
                  src={form.product_image_url}
                  alt=""
                  loading="lazy"
                  className="h-12 w-12 rounded-lg object-cover bg-white"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-white grid place-items-center text-xs font-bold text-[hsl(var(--app-muted))]">
                  {form.brand?.[0]?.toUpperCase() ?? "#"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[hsl(var(--app-muted))] uppercase tracking-wide">
                  {form.product_source === "openfoodfacts" ? "Open Food Facts" : "Scanned product"}
                </p>
                <p className="text-sm text-[hsl(var(--app-foreground))] truncate">
                  {[form.brand, form.package_quantity ? `${form.package_quantity} ${form.package_unit || ""}`.trim() : null]
                    .filter(Boolean)
                    .join(" · ") || `Barcode ${form.barcode}`}
                </p>
              </div>
            </div>
          )}

          <div className="px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Spinach"
                autoFocus
                maxLength={80}
                className="h-12 rounded-xl"
              />
              {errors.name && (
                <p className="text-xs text-[hsl(var(--app-danger))]">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  inputMode="decimal"
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  placeholder="1"
                  className="h-12 rounded-xl"
                />
                {errors.quantity && (
                  <p className="text-xs text-[hsl(var(--app-danger))]">
                    {errors.quantity}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select
                  value={form.unit || ""}
                  onValueChange={(v) => set("unit", v as UnitType)}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => set("category", v)}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Select
                  value={form.location}
                  onValueChange={(v) => set("location", v as PantryLocation)}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Expiry date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-12 rounded-xl justify-start font-normal",
                        !expDate && "text-[hsl(var(--app-muted))]"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expDate ? format(expDate, "PP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expDate}
                      onSelect={(d) =>
                        set("expires_on", d ? toLocalDateString(d) : "")
                      }
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                    {form.expires_on && (
                      <div className="p-2 border-t">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => set("expires_on", "")}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Purchased (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-12 rounded-xl justify-start font-normal",
                        !purDate && "text-[hsl(var(--app-muted))]"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {purDate ? format(purDate, "PP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={purDate}
                      onSelect={(d) =>
                        set("purchased_on", d ? toLocalDateString(d) : "")
                      }
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                    {form.purchased_on && (
                      <div className="p-2 border-t">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => set("purchased_on", "")}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Anything worth remembering…"
                rows={3}
                maxLength={500}
                className="rounded-xl resize-none"
              />
            </div>
          </div>

          <SheetFooter className="px-5 pb-6 pt-2 flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 h-12 rounded-xl bg-[hsl(var(--app-primary))] hover:bg-[hsl(var(--app-primary))]/90 text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {item ? "Save changes" : "Add to pantry"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default PantryItemSheet;
