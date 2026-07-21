import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: ReactNode;
};

const ScreenHeader = ({ title, subtitle, eyebrow, right }: Props) => (
  <header className="safe-top px-5 pt-3 pb-4 flex items-start justify-between gap-3">
    <div className="min-w-0">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--app-primary))] mb-1">
          {eyebrow}
        </p>
      )}
      <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[hsl(var(--app-foreground))]">
        {title}
      </h1>
      {subtitle && <p className="text-[15px] text-[hsl(var(--app-muted))] mt-1">{subtitle}</p>}
    </div>
    {right && <div className="shrink-0">{right}</div>}
  </header>
);

export default ScreenHeader;
