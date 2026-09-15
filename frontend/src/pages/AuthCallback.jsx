import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUserFromSession } = useAuth();

  useEffect(() => {
    const hash = location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      navigate("/login", { replace: true });
      return;
    }
    const sessionId = match[1];
    (async () => {
      try {
        const { data } = await api.post("/auth/google-session", { session_id: sessionId });
        setUserFromSession(data);
        // Clear hash and go to dashboard
        window.history.replaceState(null, "", "/dashboard");
        navigate("/dashboard", { replace: true });
      } catch {
        navigate("/login?error=google", { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" data-testid="auth-callback-page">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Autenticando com Google...</span>
      </div>
    </div>
  );
}
