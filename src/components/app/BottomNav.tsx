import { NavLink } from "react-router-dom";
import { Home, Refrigerator, Sparkles, CalendarDays, ShoppingBag, User } from "lucide-react";

const tabs = [
  { to: "/app/home", label: "Home", Icon: Home },
  { to: "/app/pantry", label: "Pantry", Icon: Refrigerator },
  { to: "/app/chef", label: "AI Chef", Icon: Sparkles },
  { to: "/app/meal-plan", label: "Meals", Icon: CalendarDays },
  { to: "/app/grocery", label: "Grocery", Icon: ShoppingBag },
  { to: "/app/profile", label: "Profile", Icon: User },
];

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 app-glass border-t border-[hsl(var(--app-border))] safe-bottom">
      <ul className="grid grid-cols-6 px-1 pt-1.5">
        {tabs.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `no-tap-highlight flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${
                  isActive
                    ? "text-[hsl(var(--app-primary))]"
                    : "text-[hsl(var(--app-muted))] active:scale-95"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`grid place-items-center h-9 w-9 rounded-xl transition-all ${isActive ? "bg-[hsl(var(--app-primary-soft))]" : ""}`}>
                    <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 2} />
                  </div>
                  <span className={`text-[10px] leading-none font-medium ${isActive ? "font-semibold" : ""}`}>{label}</span>
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
