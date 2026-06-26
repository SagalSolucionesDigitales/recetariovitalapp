import { Link, useLocation } from "@tanstack/react-router";
import { Home, CalendarRange, MessageCircle, LineChart, ShoppingBasket, Settings } from "lucide-react";

const mainItems = [
  { to: "/dashboard", label: "Inicio", icon: Home },
  { to: "/plan", label: "Mi Plan", icon: CalendarRange },
  { to: "/coach", label: "Coach", icon: MessageCircle },
  { to: "/progreso", label: "Progreso", icon: LineChart },
  { to: "/compras", label: "Compras", icon: ShoppingBasket },
] as const;

export function SideNav() {
  const { pathname } = useLocation();

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-40 border-r border-border bg-card">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-6">
        <span className="font-serif text-xl text-primary">
          Recetario <em className="italic">Vital</em>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {mainItems.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border px-3 py-4">
        <Link
          to="/ajustes"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            pathname.startsWith("/ajustes")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Settings className="h-5 w-5 shrink-0" strokeWidth={1.8} />
          Ajustes
        </Link>
      </div>
    </aside>
  );
}
