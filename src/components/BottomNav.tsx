import { Link, useLocation } from "@tanstack/react-router";
import { Home, CalendarRange, MessageCircle, LineChart } from "lucide-react";

const items = [
  { to: "/dashboard", label: "Inicio", icon: Home },
  { to: "/plan", label: "Mi Plan", icon: CalendarRange },
  { to: "/coach", label: "Coach", icon: MessageCircle },
  { to: "/progreso", label: "Progreso", icon: LineChart },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 z-40 w-full border-t border-border bg-card/95 backdrop-blur">
      <ul className="grid grid-cols-4 px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                className="flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors"
              >
                <Icon
                  className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span className={active ? "text-primary" : "text-muted-foreground"}>{label}</span>
                <span className={`mt-0.5 h-1 w-1 rounded-full ${active ? "bg-accent" : "bg-transparent"}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
