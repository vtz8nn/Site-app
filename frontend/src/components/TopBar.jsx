import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Box, LogOut, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TopBar({ title, back = false, right = null }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-white/10">
      <div className="max-w-xl mx-auto px-4 h-16 flex items-center gap-3">
        {back ? (
          <button
            onClick={() => navigate(-1)}
            data-testid="topbar-back-button"
            className="h-10 w-10 rounded-md hover:bg-muted flex items-center justify-center btn-tap"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="h-10 w-10 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Box className="h-5 w-5 text-primary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
            {user && user.email ? user.email : "Command Center"}
          </div>
          <div className="font-display text-lg font-black tracking-tight truncate" data-testid="topbar-title">
            {title}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {right}
          {!back && (
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              data-testid="topbar-logout-button"
              className="text-muted-foreground hover:text-foreground"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
