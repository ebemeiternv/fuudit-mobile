import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";
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
import { toast } from "@/hooks/use-toast";
import { CATEGORIES, UNITS, type UnitType } from "@/lib/pantry";
import type { GroceryItem } from "@/repositories/grocery";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  quantity: z
    .string()
    .optional()
    .refine((v) => !v || !isNaN(Number(v)), "Must be a number"),
});

type FormState = {
  name: string;
  quantity: string;
  unit: UnitType | "";
  category: string;
  notes: string;
};

const empty: FormState = {
  name: "",
  quantity: "",
  unit: "",
  category: "Other",
  notes: "",
};

type SubmitPayload = {
  name: string;
  quantity: number | null;
  unit: UnitType | null;
  category: string | null;
  notes: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: GroceryItem | null;
  onSubmit: (payload: SubmitPayload) => Promise<void>;
  saving?: boolean;
};

const GroceryItemSheet = ({ open, onOpenChange, item, onSubmit, saving }: Props) => {
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        name: item.name,
        quantity: item.quantity != null ? String(item.quantity) : "",
        unit: (item.unit as UnitType) ?? "",
        category: (item as { category?: string | null }).category ?? "Other",
        notes: (item as { notes?: string | null }).notes ?? "",
      });
    } else {
      setForm(empty);
    }
    setErrors({});
  }, [open, item]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[92dvh] overflow-y-auto p-0 border-t border-[hsl(var(--app-border))]"
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-2 text-left">
            <SheetTitle className="text-xl font-bold text-[hsl(var(--app-foreground))]">
              {item ? "Edit item" : "Add grocery item"}
            </SheetTitle>
            <SheetDescription className="text-[hsl(var(--app-muted))]">
              What do you need to pick up?
            </SheetDescription>
          </SheetHeader>

          <div className="px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-name">Name</Label>
              <Input
                id="g-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Baby spinach"
                autoFocus
                maxLength={120}
                className="h-12 rounded-xl"
              />
              {errors.name && (
                <p className="text-xs text-[hsl(var(--app-danger))]">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="g-qty">Quantity (optional)</Label>
                <Input
                  id="g-qty"
                  inputMode="decimal"
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  placeholder="1"
                  className="h-12 rounded-xl"
                />
                {errors.quantity && (
                  <p className="text-xs text-[hsl(var(--app-danger))]">{errors.quantity}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Unit (optional)</Label>
                <Select
                  value={form.unit || "__none"}
                  onValueChange={(v) => set("unit", v === "__none" ? "" : (v as UnitType))}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">—</SelectItem>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
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
              <Label htmlFor="g-notes">Notes (optional)</Label>
              <Textarea
                id="g-notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Brand, store, anything…"
                rows={3}
                maxLength={300}
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
              {item ? "Save changes" : "Add to list"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default GroceryItemSheet;
