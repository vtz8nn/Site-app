import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatApiErrorDetail } from "@/lib/api";
import { Box, Zap } from "lucide-react";
import { toast } from "sonner";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function googleLogin() {
  const redirectUrl = window.location.origin + "/auth/callback";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await login(email, password);
      toast.success("Bem-vindo!");
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-12 w-12 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Box className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-bold">Command Center</div>
            <div className="font-display text-2xl font-black tracking-tighter">ESTOQUE.OPS</div>
          </div>
        </div>

        <div className="card-tech rounded-lg p-6">
          <h1 className="font-display text-3xl font-black tracking-tighter mb-1">Entrar</h1>
          <p className="text-sm text-muted-foreground mb-6">Acesse seu painel de controle.</p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Email</Label>
              <Input id="email" data-testid="login-email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="h-12 bg-background border-border" placeholder="voce@loja.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Senha</Label>
              <Input id="password" data-testid="login-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="h-12 bg-background border-border" placeholder="••••••••" />
            </div>
            {error && <div data-testid="login-error" className="text-sm text-destructive">{error}</div>}
            <Button type="submit" disabled={busy} data-testid="login-submit-button"
              className="w-full h-12 bg-primary hover:bg-primary/90 font-bold text-base btn-tap">
              <Zap className="h-4 w-4" /> {busy ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" onClick={googleLogin} variant="outline" data-testid="login-google-button"
            className="w-full h-12 bg-background border-border hover:bg-muted font-bold btn-tap">
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.24 1.5-1.7 4.4-5.35 4.4a6.1 6.1 0 1 1 0-12.2c1.9 0 3.18.8 3.9 1.48l2.66-2.57C17.02 3.9 14.7 3 12 3a9 9 0 1 0 0 18c5.2 0 8.65-3.66 8.65-8.8 0-.6-.06-1.05-.15-1.5Z"/></svg>
            Continuar com Google
          </Button>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            Não tem conta? <Link to="/register" data-testid="link-to-register" className="text-primary font-bold hover:underline">Criar agora</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
