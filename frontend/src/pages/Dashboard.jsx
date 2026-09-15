import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatBRL, stockStatus, statusLabel, waLink } from "@/lib/format";
import { Plus, Minus, MessageCircle, FileText, PackagePlus, Package, PencilLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function StatusBadge({ status }) {
  const cls =
    status === "good" ? "text-emerald-300 bg-emerald-400/10 border-emerald-400/30"
    : status === "low" ? "text-amber-300 bg-amber-400/10 border-amber-400/30"
    : "text-red-300 bg-red-400/10 border-red-400/30";
  const dotCls =
    status === "good" ? "bg-emerald-400"
    : status === "low" ? "bg-amber-400"
    : "bg-red-400";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] border ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotCls} pulse-dot`} />
      {statusLabel(status)}
    </span>
  );
}

function ProductCard({ p, config, onChange, onDelete }) {
  const status = stockStatus(p.quantidade_estoque, p.estoque_minimo);
  const navigate = useNavigate();

  const adjust = async (delta) => {
    try {
      const { data } = await api.post(`/products/${p.id}/adjust`, { delta });
      onChange(data);
      if (delta < 0) {
        // Fire WhatsApp to owner
        if (config?.whatsapp_dono) {
          const st = stockStatus(data.quantidade_estoque, data.estoque_minimo);
          const msg = `🚨 VENDA REGISTRADA
Produto: ${data.nome}
Preço: ${formatBRL(data.preco_venda)}
Estoque Restante: ${data.quantidade_estoque} un.
Status: ${st === "good" ? "OK" : "BAIXO"}`;
          window.open(waLink(config.whatsapp_dono, msg), "_blank", "noopener");
        } else {
          toast.warning("Configure seu WhatsApp para receber alertas.");
        }
      }
      toast.success(delta < 0 ? "Venda registrada" : "Estoque reabastecido");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Erro");
    }
  };

  const requestRestock = () => {
    if (!p.whatsapp_fornecedor) {
      toast.warning("Cadastre o WhatsApp do fornecedor no produto.");
      return;
    }
    const msg = `Olá! Preciso fazer o reabastecimento do produto: ${p.nome}. Meu estoque atual é de ${p.quantidade_estoque} unidade(s).`;
    window.open(waLink(p.whatsapp_fornecedor, msg), "_blank", "noopener");
  };

  return (
    <div className="card-tech rounded-md p-4" data-testid={`product-card-${p.id}`}>
      <div className="flex gap-4">
        <div className="h-24 w-24 rounded-md overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
          {p.foto_url ? (
            <img src={p.foto_url} alt={p.nome} className="h-full w-full object-cover" />
          ) : (
            <Package className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-bold text-lg leading-tight truncate" data-testid={`product-name-${p.id}`}>{p.nome}</h3>
            <StatusBadge status={status} />
          </div>
          <div className="mt-1 font-display text-2xl font-black tracking-tight text-primary" data-testid={`product-price-${p.id}`}>
            {formatBRL(p.preco_venda)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            <span className="uppercase tracking-[0.15em] font-bold">Estoque:</span>{" "}
            <span className="font-bold text-foreground" data-testid={`product-qty-${p.id}`}>{p.quantidade_estoque}</span>
            <span className="mx-1">/</span>
            <span>mín {p.estoque_minimo}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <Button
          onClick={() => adjust(-1)}
          disabled={p.quantidade_estoque <= 0}
          data-testid={`sale-button-${p.id}`}
          className="h-12 bg-primary hover:bg-primary/90 font-bold btn-tap"
        >
          <Minus className="h-4 w-4" /> -1 Venda
        </Button>
        <Button
          onClick={() => adjust(1)}
          variant="outline"
          data-testid={`restock-button-${p.id}`}
          className="h-12 border-border bg-background hover:bg-muted font-bold btn-tap"
        >
          <Plus className="h-4 w-4" /> +1 Entrada
        </Button>
      </div>

      {status !== "good" && (
        <Button
          onClick={requestRestock}
          data-testid={`supplier-restock-${p.id}`}
          className="w-full mt-2 h-12 bg-[#25D366] hover:bg-[#22c55e] text-white font-bold btn-tap"
        >
          <MessageCircle className="h-4 w-4" /> Pedir Reposição no WhatsApp
        </Button>
      )}

      <div className="flex gap-2 mt-2">
        <Button
          onClick={() => navigate(`/products/${p.id}/edit`)}
          variant="ghost"
          size="sm"
          data-testid={`edit-button-${p.id}`}
          className="flex-1 text-muted-foreground hover:text-foreground"
        >
          <PencilLine className="h-3.5 w-3.5" /> Editar
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" data-testid={`delete-button-${p.id}`} className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent data-testid={`delete-dialog-${p.id}`}>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover "{p.nome}"?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid={`delete-cancel-${p.id}`}>Cancelar</AlertDialogCancel>
              <AlertDialogAction data-testid={`delete-confirm-${p.id}`} onClick={() => onDelete(p)} className="bg-destructive hover:bg-destructive/90">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [pRes, cRes] = await Promise.all([api.get("/products"), api.get("/config")]);
      setProducts(pRes.data);
      setConfig(cRes.data);
    } catch (e) {
      toast.error("Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onChange = (updated) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const onDelete = async (p) => {
    try {
      await api.delete(`/products/${p.id}`);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      toast.success("Produto removido.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Erro ao remover");
    }
  };

  const sendFullReport = () => {
    if (!config?.whatsapp_dono) {
      toast.warning("Configure seu WhatsApp em Configurações.");
      return;
    }
    if (products.length === 0) {
      toast.warning("Sem produtos para relatar.");
      return;
    }
    const lines = products.map((p) => {
      const s = stockStatus(p.quantidade_estoque, p.estoque_minimo);
      const emoji = s === "good" ? "🟢" : s === "low" ? "🟡" : "🔴";
      return `${emoji} ${p.nome} — ${p.quantidade_estoque} un. (${formatBRL(p.preco_venda)})`;
    });
    const msg = `📊 RELATÓRIO DE ESTOQUE — ${config.store_name || "Minha Loja"}\n\n${lines.join("\n")}\n\nTotal de itens: ${products.length}`;
    window.open(waLink(config.whatsapp_dono, msg), "_blank", "noopener");
  };

  const counts = {
    good: products.filter((p) => stockStatus(p.quantidade_estoque, p.estoque_minimo) === "good").length,
    low: products.filter((p) => stockStatus(p.quantidade_estoque, p.estoque_minimo) === "low").length,
    out: products.filter((p) => stockStatus(p.quantidade_estoque, p.estoque_minimo) === "out").length,
  };

  return (
    <div className="min-h-screen pb-24" data-testid="dashboard-page">
      <TopBar title={config?.store_name || "Estoque"} />

      <div className="max-w-xl mx-auto p-4 space-y-4">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "OK", value: counts.good, color: "text-emerald-300", border: "border-emerald-400/30 bg-emerald-400/5" },
            { label: "Baixo", value: counts.low, color: "text-amber-300", border: "border-amber-400/30 bg-amber-400/5" },
            { label: "Esgotado", value: counts.out, color: "text-red-300", border: "border-red-400/30 bg-red-400/5" },
          ].map((s) => (
            <div key={s.label} className={`rounded-md border p-3 ${s.border}`} data-testid={`stat-${s.label.toLowerCase()}`}>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{s.label}</div>
              <div className={`font-display text-2xl font-black ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <Button
          onClick={sendFullReport}
          data-testid="send-full-report-button"
          className="w-full h-12 bg-[#25D366] hover:bg-[#22c55e] text-white font-bold btn-tap"
        >
          <FileText className="h-4 w-4" /> Enviar Relatório Completo ao Dono
        </Button>

        {loading ? (
          <div className="text-center text-muted-foreground py-16">Carregando...</div>
        ) : products.length === 0 ? (
          <div className="card-tech rounded-lg p-8 text-center" data-testid="empty-state">
            <PackagePlus className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="font-display text-xl font-bold mt-3">Sem produtos ainda</h3>
            <p className="text-sm text-muted-foreground mt-1">Cadastre o primeiro item do seu estoque.</p>
            <Button asChild className="mt-4 bg-primary hover:bg-primary/90 h-12 font-bold btn-tap" data-testid="empty-add-button">
              <a href="/products/new"><Plus className="h-4 w-4" /> Cadastrar Produto</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-3" data-testid="products-list">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} config={config} onChange={onChange} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
