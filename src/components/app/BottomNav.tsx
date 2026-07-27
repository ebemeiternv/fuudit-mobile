import { NavLink } from "react-router-dom";
import { Home, Refrigerator, Sparkles, CalendarDays, ShoppingBag, User } from "lucide-react";

const tabs = [
  { to: "/app/home", label: "Home", Icon: Home },
  { to: "/app/pantry", label: "Pantry", Icon: Refrigerator },
  { to: "/app/chef", label: "AI Chef", srLabel: "AI Chef", Icon: Sparkles },
  { to: "/app/meal-plan", label: "Meals", Icon: CalendarDays },
  { to: "/app/grocery", label: "Grocery", Icon: ShoppingBag },
  { to: "/app/profile", label: "Profile", Icon: User },
];

// Six tabs on 320-px screens leaves ~52 px per tab. We keep every icon at
// 44×44 (via the 40 px chip + row padding) and show the label only for the
// active tab on narrow widths — inactive tabs still expose their name to
// assistive tech via aria-label.
const BottomNav = () => {
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-40 app-glass border-t border-[hsl(var(--app-border))] safe-bottom"
    >
      <ul className="grid grid-cols-6 px-0.5 pt-1">
        {tabs.map(({ to, label, srLabel, Icon }) => (
          <li key={to} className="min-w-0">
            <NavLink
              to={to}
              aria-label={srLabel ?? label}
              className={({ isActive }) =>
                `no-tap-highlight flex flex-col items-center justify-center gap-0.5 py-1 min-h-11 rounded-xl transition-all ${
                  isActive
                    ? "text-[hsl(var(--app-primary))]"
                    : "text-[hsl(var(--app-muted))] active:scale-95"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    aria-hidden="true"
                    className={`grid place-items-center h-9 w-9 rounded-xl transition-all ${
                      isActive ? "bg-[hsl(var(--app-primary-soft))]" : ""
                    }`}
                  >
                    <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 2} />
                  </div>
                  <span
                    aria-hidden="true"
                    className={`text-[10px] leading-none max-w-full truncate px-0.5 ${
                      isActive
                        ? "font-semibold inline-block"
                        : "font-medium hidden xs:inline-block"
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default BottomNav;
