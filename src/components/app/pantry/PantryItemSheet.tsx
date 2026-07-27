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
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: PantryItem | null;
  onSubmit: (payload: {
    name: string;
    quantity: number | null;
    unit: UnitType | null;
    category: string | null;
    location: PantryLocation;
    purchased_on: string | null;
    expires_on: string | null;
    notes: string | null;
  }) => Promise<void>;
  saving?: boolean;
};

const PantryItemSheet = ({ open, onOpenChange, item, onSubmit, saving }: Props) => {
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        name: item.name,
        quantity: item.quantity != null ? String(item.quantity) : "",
        unit: (item.unit as UnitType) ?? "",
        category: item.category ?? "",
        location: item.location,
        purchased_on: item.purchased_on ?? "",
        expires_on: item.expires_on ?? "",
        notes: item.notes ?? "",
      });
    } else {
      setForm(empty);
    }
    setErrors({});
  }, [open, item]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

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
