import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatApiErrorDetail } from "@/lib/api";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await register(email, password, name);
      toast.success("Conta criada!");
      navigate("/config?first=1");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4" data-testid="register-page">
      <div className="w-full max-w-md card-tech rounded-lg p-6">
        <h1 className="font-display text-3xl font-black tracking-tighter mb-1">Criar conta</h1>
        <p className="text-sm text-muted-foreground mb-6">Comece a controlar seu estoque em segundos.</p>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Nome</Label>
            <Input id="name" data-testid="register-name-input" value={name} onChange={(e) => setName(e.target.value)} className="h-12" placeholder="Seu nome" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Email</Label>
            <Input id="email" data-testid="register-email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12" placeholder="voce@loja.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Senha</Label>
            <Input id="password" data-testid="register-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-12" placeholder="Mínimo 6 caracteres" />
          </div>
          {error && <div data-testid="register-error" className="text-sm text-destructive">{error}</div>}
          <Button type="submit" disabled={busy} data-testid="register-submit-button" className="w-full h-12 bg-primary hover:bg-primary/90 font-bold text-base btn-tap">
            <UserPlus className="h-4 w-4" /> {busy ? "Criando..." : "Criar Conta"}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground mt-6 text-center">
          Já tem conta? <Link to="/login" data-testid="link-to-login" className="text-primary font-bold hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
