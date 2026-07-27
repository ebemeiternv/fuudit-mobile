import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: ReactNode;
  left?: ReactNode;
  /** Allow the title to wrap onto two lines. Defaults to false (truncate). */
  allowTitleWrap?: boolean;
};

/**
 * Responsive top header used on every /app screen.
 *
 * Narrow-width rules (320–375 px):
 * - The left and right slots have a fixed intrinsic width and never shrink,
 *   so 44×44 tap targets are preserved.
 * - The title column takes remaining space with `min-w-0`, and truncates by
 *   default. Screens that need multi-line titles opt in via `allowTitleWrap`.
 * - Subtitle always wraps to two lines, then clips.
 */
const ScreenHeader = ({
  title,
  subtitle,
  eyebrow,
  right,
  left,
  allowTitleWrap = false,
}: Props) => (
  <header className="safe-top px-5 pt-3 pb-4 flex items-start gap-3">
    {left && <div className="shrink-0 pt-1">{left}</div>}
    <div className="min-w-0 flex-1">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--app-primary))] mb-1 truncate">
          {eyebrow}
        </p>
      )}
      <h1
        className={
          "text-[26px] sm:text-[28px] font-bold leading-tight tracking-tight text-[hsl(var(--app-foreground))] " +
          (allowTitleWrap ? "break-words" : "truncate")
        }
      >
        {title}
      </h1>
      {subtitle && (
        <p className="text-[14px] sm:text-[15px] text-[hsl(var(--app-muted))] mt-1 line-clamp-2">
          {subtitle}
        </p>
      )}
    </div>
    {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
  </header>
);

export default ScreenHeader;
