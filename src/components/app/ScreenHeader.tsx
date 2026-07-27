import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: ReactNode;
  left?: ReactNode;
};

const ScreenHeader = ({ title, subtitle, eyebrow, right, left }: Props) => (
  <header className="safe-top px-5 pt-3 pb-4 flex items-start gap-3">
    {left && <div className="shrink-0 pt-1">{left}</div>}
    <div className="min-w-0 flex-1">
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
