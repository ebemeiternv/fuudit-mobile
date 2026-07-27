import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, Plus, MessageSquare, Trash2, ChefHat, Compass, RotateCcw, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import ScreenHeader from "@/components/app/ScreenHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import LoadingState from "@/components/app/states/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import {
  useChefConversations,
  useChefMessages,
  useCreateChefConversation,
  useDeleteChefConversation,
  useSendChefMessage,
} from "@/hooks/queries/useChef";
import { ChefError, type ChefErrorCode, type ChefMessage, type ChefMessageData, type ChefRecipeCard } from "@/repositories/chef";
import { useSavedRecipes, useUnsaveRecipe } from "@/hooks/queries/useSavedRecipes";
import { useSaveSpoonacularRecipe } from "@/hooks/queries/useRecipes";
import RecipeCard from "@/components/app/recipes/RecipeCard";
import AddToMealPlanSheet from "@/components/app/mealplan/AddToMealPlanSheet";
import type { AddToMealPlanPayload } from "@/hooks/queries/useMealPlan";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STARTERS = [
  "Use what expires first",
  "Dinner in 20 minutes",
  "Family-friendly dinner",
  "High-protein idea",
  "Use my leftovers",
];

const ChefScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: conversations = [] } = useChefConversations(userId);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Select most recent conversation by default
  useEffect(() => {
    if (!activeId && conversations.length) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  // Clear the inline error whenever the user switches conversations.
  useEffect(() => {
    setLastError((prev) => (prev && prev.convoId !== activeId ? null : prev));
  }, [activeId]);

  const { data: messages = [], isLoading: loadingMessages } = useChefMessages(
    activeId ?? undefined,
  );

  const createConvo = useCreateChefConversation(userId);
  const deleteConvo = useDeleteChefConversation(userId);
  const send = useSendChefMessage(userId);

  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [lastError, setLastError] = useState<{
    code: ChefErrorCode;
    message: string;
    requestId?: string;
    lastMessage: string;
    convoId: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inFlightRef = useRef(false); // extra guard against double-taps

  // Autoscroll to newest message
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, send.isPending]);

  const startNew = async () => {
    if (!userId) return;
    try {
      const c = await createConvo.mutateAsync(undefined);
      setActiveId(c.id);
      setHistoryOpen(false);
      inputRef.current?.focus();
    } catch {
      toast({ title: "Couldn't start a new conversation", variant: "destructive" });
    }
  };

  const submit = async (text?: string, opts?: { retry?: boolean }) => {
    if (!userId) return;
    const msg = (text ?? input).trim();
    if (!msg) return;
    if (send.isPending || inFlightRef.current) return;

    let convoId = activeId;
    if (!convoId) {
      try {
        const c = await createConvo.mutateAsync(undefined);
        convoId = c.id;
        setActiveId(convoId);
      } catch {
        toast({ title: "Couldn't start a conversation", variant: "destructive" });
        return;
      }
    }

    inFlightRef.current = true;
    const previousInput = input;
    // Only clear the composer when this is a fresh send, not a retry — nothing was typed then.
    if (!opts?.retry) setInput("");
    setLastError(null);

    try {
      await send.mutateAsync({
        conversationId: convoId!,
        message: msg,
        retry: opts?.retry === true,
      });
    } catch (e: unknown) {
      const err = e instanceof ChefError ? e : null;
      const code: ChefErrorCode = err?.code ?? "unknown_error";
      const message = err?.message ?? "AI Chef couldn't respond. Please try again.";
      // On failure the server rolled back the user message. Restore the composer
      // text so the user doesn't lose what they typed, and surface an inline
      // error card in the conversation with a "Try again" action.
      if (!opts?.retry) setInput(previousInput);
      setLastError({
        code,
        message,
        requestId: err?.requestId,
        lastMessage: msg,
        convoId: convoId!,
      });
      // Only 429 gets a toast — everything else is shown inline where the answer would have been.
      if (code === "gateway_rate_limited") {
        toast({ title: message, variant: "destructive" });
      }
    } finally {
      inFlightRef.current = false;
    }
  };

  const showIntro = !activeId || (messages.length === 0 && !send.isPending);

  return (
    <div className="pb-3 flex flex-col h-[calc(100dvh-var(--app-nav-h,72px))]">
      <ScreenHeader
        title="AI Chef"
        subtitle="Your pantry-aware cooking companion"
        right={
          <div className="flex items-center gap-2">
            <Link
              to="/app/discover"
              aria-label="Browse recipes"
              className="h-9 w-9 grid place-items-center rounded-full bg-[hsl(var(--app-subtle))] active:scale-95 no-tap-highlight"
            >
              <Compass className="h-4 w-4 text-[hsl(var(--app-foreground))]" />
            </Link>
            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Conversation history"
                  className="h-9 w-9 grid place-items-center rounded-full bg-[hsl(var(--app-subtle))] active:scale-95 no-tap-highlight"
                >
                  <MessageSquare className="h-4 w-4 text-[hsl(var(--app-foreground))]" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-sm p-0">
                <SheetHeader className="p-4 border-b border-[hsl(var(--app-border))]">
                  <SheetTitle>Chats with Tilda</SheetTitle>
                </SheetHeader>
                <div className="p-3">
                  <button
                    onClick={startNew}
                    className="w-full flex items-center gap-2 p-3 rounded-xl bg-[hsl(var(--app-primary))] text-white font-semibold active:scale-[.99] no-tap-highlight"
                  >
                    <Plus className="h-4 w-4" /> New conversation
                  </button>
                </div>
                <div className="px-3 pb-6 space-y-1 overflow-y-auto max-h-[calc(100dvh-140px)]">
                  {conversations.length === 0 ? (
                    <p className="text-sm text-[hsl(var(--app-muted))] p-3">No chats yet.</p>
                  ) : (
                    conversations.map((c) => (
                      <div
                        key={c.id}
                        className={cn(
                          "flex items-center gap-1 rounded-xl px-1",
                          activeId === c.id && "bg-[hsl(var(--app-subtle))]",
                        )}
                      >
                        <button
                          onClick={() => {
                            setActiveId(c.id);
                            setHistoryOpen(false);
                          }}
                          className="flex-1 text-left p-3 no-tap-highlight"
                        >
                          <p className="font-medium text-sm text-[hsl(var(--app-foreground))] line-clamp-1">
                            {c.title || "New conversation"}
                          </p>
                          <p className="text-[11px] text-[hsl(var(--app-muted))]">
                            {new Date(c.last_message_at).toLocaleDateString()}
                          </p>
                        </button>
                        <button
                          aria-label="Delete conversation"
                          onClick={() => setPendingDelete(c.id)}
                          className="h-9 w-9 grid place-items-center rounded-full text-[hsl(var(--app-muted))] active:scale-95 no-tap-highlight"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        }
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pt-2 pb-4 space-y-4"
      >
        {showIntro && <ChefIntro onPick={(p) => submit(p)} />}

        {loadingMessages && activeId && <LoadingState label="Loading chat…" />}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} userId={userId} />
        ))}

        {send.isPending && (
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--app-muted))]">
            <Sparkles className="h-4 w-4 animate-pulse" />
            Tilda is thinking…
          </div>
        )}
      </div>

      <div className="border-t border-[hsl(var(--app-border))] bg-[hsl(var(--app-bg))] px-3 pt-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Tilda what to cook…"
            rows={1}
            className="min-h-[44px] max-h-32 resize-none rounded-2xl bg-[hsl(var(--app-subtle))] border-transparent focus-visible:ring-1 focus-visible:ring-[hsl(var(--app-primary))]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={send.isPending}
          />
          <Button
            onClick={() => submit()}
            disabled={!input.trim() || send.isPending}
            size="icon"
            className="h-11 w-11 rounded-full shrink-0"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1 text-[10px] text-[hsl(var(--app-muted))] text-center">
          Tilda is a cooking helper, not a dietitian. Always check labels for allergies.
        </p>
      </div>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Messages will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete) return;
                const id = pendingDelete;
                setPendingDelete(null);
                try {
                  await deleteConvo.mutateAsync(id);
                  if (activeId === id) setActiveId(null);
                } catch {
                  toast({ title: "Couldn't delete", variant: "destructive" });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ---------- Intro ----------
const ChefIntro = ({ onPick }: { onPick: (prompt: string) => void }) => (
  <div className="app-card p-5 text-center">
    <div className="mx-auto h-12 w-12 rounded-full bg-[hsl(var(--app-primary-soft))] grid place-items-center mb-2">
      <ChefHat className="h-6 w-6 text-[hsl(var(--app-primary))]" />
    </div>
    <p className="font-semibold text-[hsl(var(--app-foreground))]">Hi, I'm Tilda 👋</p>
    <p className="mt-1 text-sm text-[hsl(var(--app-muted))]">
      I use your pantry to help you decide what to cook. Try one of these:
    </p>
    <div className="mt-3 flex flex-wrap gap-2 justify-center">
      {STARTERS.map((s) => (
        <button
          key={s}
          onClick={() => onPick(s)}
          className="text-xs font-medium px-3 py-1.5 rounded-full bg-[hsl(var(--app-subtle))] text-[hsl(var(--app-foreground))] active:scale-95 no-tap-highlight"
        >
          {s}
        </button>
      ))}
    </div>
  </div>
);

// ---------- Message bubble ----------
const MessageBubble = ({
  message,
  userId,
}: {
  message: ChefMessage;
  userId: string | undefined;
}) => {
  const isUser = message.role === "user";
  const data = (message.data ?? {}) as unknown as ChefMessageData;
  const recipes = data.recipes ?? [];
  const tips = data.tips ?? [];
  const clarify = data.clarifyingQuestion;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[hsl(var(--app-primary))] text-white px-4 py-2.5 text-sm whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="max-w-[90%] text-[15px] text-[hsl(var(--app-foreground))] whitespace-pre-wrap">
        {message.content}
      </div>
      {clarify && (
        <div className="max-w-[90%] rounded-2xl bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))] px-4 py-2 text-sm font-medium">
          {clarify}
        </div>
      )}
      {recipes.length > 0 && (
        <div className="space-y-3">
          {recipes.map((r) => (
            <ChefRecipeItem key={r.sourceId} recipe={r} userId={userId} />
          ))}
        </div>
      )}
      {tips.length > 0 && (
        <ul className="app-card-flat p-3 text-sm text-[hsl(var(--app-foreground))] list-disc list-inside space-y-1">
          {tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ---------- Recipe card in a Chef message ----------
const ChefRecipeItem = ({
  recipe,
  userId,
}: {
  recipe: ChefRecipeCard;
  userId: string | undefined;
}) => {
  const { data: saved = [] } = useSavedRecipes(userId);
  const savedRow = saved.find(
    (s) => s.recipe?.source === "spoonacular" && s.recipe.source_id === recipe.sourceId,
  );
  const saveMut = useSaveSpoonacularRecipe(userId);
  const unsaveMut = useUnsaveRecipe(userId);
  const [addOpen, setAddOpen] = useState(false);

  const spoonId = Number(recipe.sourceId);
  const isSaved = !!savedRow;
  const busy = saveMut.isPending || unsaveMut.isPending;

  const planPayload: AddToMealPlanPayload = savedRow?.recipe
    ? { kind: "recipe", recipeId: savedRow.recipe.id }
    : {
        kind: "spoon",
        spoonId,
        hint: { title: recipe.title, image: recipe.image ?? null },
      };

  return (
    <div className="space-y-1">
      <RecipeCard
        recipe={{
          spoonId,
          title: recipe.title,
          image: recipe.image,
          readyMinutes: recipe.readyMinutes,
          servings: recipe.servings,
          diets: recipe.diets,
          used: recipe.pantryUsed.length || undefined,
          missed: recipe.missing.length || undefined,
        }}
        saved={isSaved}
        saving={busy}
        onToggleSave={() => {
          if (busy) return;
          if (isSaved && savedRow) {
            unsaveMut.mutate(savedRow.recipe!.id, {
              onError: () => toast({ title: "Couldn't unsave", variant: "destructive" }),
            });
          } else {
            saveMut.mutate(
              { id: spoonId, title: recipe.title, image: recipe.image ?? undefined } as any,
              { onError: () => toast({ title: "Couldn't save", variant: "destructive" }) },
            );
          }
        }}
        onAddToPlan={() => setAddOpen(true)}
      />
      {(recipe.expiringUsed.length > 0 || recipe.reason) && (
        <div className="px-1 space-y-1">
          {recipe.expiringUsed.length > 0 && (
            <p className="text-[11px] font-medium text-[hsl(var(--app-primary))]">
              Uses expiring soon: {recipe.expiringUsed.join(", ")}
            </p>
          )}
          {recipe.reason && (
            <p className="text-xs text-[hsl(var(--app-muted))] line-clamp-2">{recipe.reason}</p>
          )}
        </div>
      )}
      <AddToMealPlanSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        payload={planPayload}
        title={recipe.title}
      />
    </div>
  );
};

export default ChefScreen;
