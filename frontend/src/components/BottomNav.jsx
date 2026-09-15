import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, Plus, Settings } from "lucide-react";

export default function BottomNav() {
  const { pathname } = useLocation();
  const items = [
    { to: "/dashboard", icon: LayoutGrid, label: "Estoque", tid: "nav-dashboard" },
    { to: "/products/new", icon: Plus, label: "Novo", tid: "nav-new-product" },
    { to: "/config", icon: Settings, label: "Config", tid: "nav-config" },
  ];
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl bg-background/80 border-t border-white/10"
      data-testid="bottom-nav"
    >
      <div className="max-w-xl mx-auto grid grid-cols-3">
        {items.map(({ to, icon: Icon, label, tid }) => {
          const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              data-testid={tid}
              className={`flex flex-col items-center justify-center py-3 gap-1 btn-tap ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
