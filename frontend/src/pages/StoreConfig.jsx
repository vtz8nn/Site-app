import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Phone } from "lucide-react";
import { toast } from "sonner";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

export default function StoreConfig() {
  const [whatsapp, setWhatsapp] = useState("");
  const [storeName, setStoreName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isFirst = params.get("first") === "1";

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/config");
        setWhatsapp(data.whatsapp_dono || "");
        setStoreName(data.store_name || "");
      } catch {}
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api.put("/config", { whatsapp_dono: whatsapp, store_name: storeName || "Minha Loja" });
      toast.success("Configurações salvas.");
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen pb-24" data-testid="config-page">
      <TopBar title="Configurações" />
      <div className="max-w-xl mx-auto p-6 space-y-6">
        {isFirst && (
          <div className="card-tech rounded-md p-4 border-primary/40 bg-primary/5">
            <p className="text-sm">
              <span className="font-bold text-primary">Boas-vindas!</span> Cadastre seu WhatsApp para receber alertas de venda.
            </p>
          </div>
        )}

        <form onSubmit={save} className="card-tech rounded-lg p-6 space-y-5">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Dados da Loja</h2>
            <p className="text-sm text-muted-foreground mt-1">Usados nas notificações via WhatsApp.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store" className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Nome da Loja</Label>
            <Input id="store" data-testid="config-store-name-input" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Minha Loja" className="h-12" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa" className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">WhatsApp do Dono (com DDD)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="wa" data-testid="config-whatsapp-input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 91234-5678" className="h-12 pl-9" />
            </div>
            <p className="text-xs text-muted-foreground">Ex: 11912345678 — vamos adicionar o código do Brasil (55) automaticamente.</p>
          </div>

          {error && <div className="text-sm text-destructive" data-testid="config-error">{error}</div>}

          <Button type="submit" disabled={busy} data-testid="config-save-button" className="w-full h-12 bg-primary hover:bg-primary/90 font-bold btn-tap">
            <Save className="h-4 w-4" /> {busy ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}
