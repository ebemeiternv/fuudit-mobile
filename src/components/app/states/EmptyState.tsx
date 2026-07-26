import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

const EmptyState = ({ icon, title, description, action, className }: Props) => (
  <div className={cn("app-card p-8 text-center flex flex-col items-center gap-3", className)}>
    {icon && (
      <div className="h-12 w-12 rounded-2xl bg-[hsl(var(--app-subtle))] grid place-items-center text-[hsl(var(--app-primary))]">
        {icon}
      </div>
    )}
    <div>
      <p className="font-semibold text-[hsl(var(--app-foreground))]">{title}</p>
      {description && (
        <p className="text-sm text-[hsl(var(--app-muted))] mt-1">{description}</p>
      )}
    </div>
    {action}
  </div>
);

export default EmptyState;
