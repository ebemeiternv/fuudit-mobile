import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { className?: string; label?: string };

const LoadingState = ({ className, label }: Props) => (
  <div className={cn("grid place-items-center py-10 gap-3", className)}>
    <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--app-primary))]" />
    {label && <p className="text-sm text-[hsl(var(--app-muted))]">{label}</p>}
  </div>
);

export default LoadingState;
