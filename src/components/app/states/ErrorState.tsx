import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

const ErrorState = ({
  title = "Something went wrong",
  description = "Please try again in a moment.",
  onRetry,
  className,
}: Props) => (
  <div className={cn("app-card p-6 text-center flex flex-col items-center gap-3", className)}>
    <div className="h-12 w-12 rounded-2xl bg-[hsl(var(--app-accent-berry-soft))] grid place-items-center text-[hsl(var(--app-danger))]">
      <AlertCircle className="h-5 w-5" />
    </div>
    <div>
      <p className="font-semibold text-[hsl(var(--app-foreground))]">{title}</p>
      <p className="text-sm text-[hsl(var(--app-muted))] mt-1">{description}</p>
    </div>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} className="rounded-xl">
        Try again
      </Button>
    )}
  </div>
);

export default ErrorState;
