import PantryItemSheet from "@/components/app/pantry/PantryItemSheet";
import { useCreatePantryItem } from "@/hooks/queries/usePantryItems";
import { toast } from "@/hooks/use-toast";
import { inferCategory, normalizeUnit } from "@/lib/grocery";
import type { GroceryItem } from "@/repositories/grocery";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  item: GroceryItem | null;
  onAdded?: () => void;
};

/**
 * Prefills the shared PantryItemSheet from a purchased grocery item and creates
 * a pantry row on confirmation. The grocery row itself is NOT modified — the
 * user can still see or clear the purchased item afterwards.
 */
const AddToPantrySheet = ({ open, onOpenChange, userId, item, onAdded }: Props) => {
  const createMut = useCreatePantryItem(userId);

  if (!item) return null;

  const unit = normalizeUnit(item.unit);
  const category =
    (item as { category?: string | null }).category ?? inferCategory(item.name);
  const notes = (item as { notes?: string | null }).notes ?? "";

  return (
    <PantryItemSheet
      open={open}
      onOpenChange={onOpenChange}
      item={null}
      initialValues={{
        name: item.name,
        quantity: item.quantity != null ? String(item.quantity) : "",
        unit: unit ?? "",
        category,
        notes,
      }}
      saving={createMut.isPending}
      onSubmit={async (payload) => {
        // Guard against accidental double-submit; the button is disabled while
        // pending, but this is a belt-and-braces check.
        if (createMut.isPending) return;
        try {
          await createMut.mutateAsync(payload);
          toast({ title: "Added to pantry", description: payload.name });
          onAdded?.();
        } catch (err) {
          toast({
            title: "Couldn't add to pantry",
            description: err instanceof Error ? err.message : "Please try again.",
            variant: "destructive",
          });
          throw err;
        }
      }}
    />
  );
};

export default AddToPantrySheet;
