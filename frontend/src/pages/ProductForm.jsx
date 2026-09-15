import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Camera, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

// Downscale image on client to keep base64 tiny (~<200KB)
async function fileToOptimizedDataUrl(file, maxSize = 800, quality = 0.82) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function ProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const [form, setForm] = useState({
    nome: "",
    foto_url: "",
    preco_venda: "",
    quantidade_estoque: "",
    estoque_minimo: "",
    whatsapp_fornecedor: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) return;
    (async () => {
      try {
        const { data } = await api.get(`/products/${id}`);
        setForm({
          nome: data.nome,
          foto_url: data.foto_url || "",
          preco_venda: String(data.preco_venda),
          quantidade_estoque: String(data.quantidade_estoque),
          estoque_minimo: String(data.estoque_minimo),
          whatsapp_fornecedor: data.whatsapp_fornecedor || "",
        });
      } catch (err) {
        toast.error("Produto não encontrado");
        navigate("/dashboard");
      }
    })();
  }, [id, editing, navigate]);

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await fileToOptimizedDataUrl(file);
      setForm((f) => ({ ...f, foto_url: url }));
    } catch {
      toast.error("Não foi possível processar a imagem");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    const payload = {
      nome: form.nome.trim(),
      foto_url: form.foto_url,
      preco_venda: parseFloat(String(form.preco_venda).replace(",", ".")) || 0,
      quantidade_estoque: parseInt(form.quantidade_estoque || "0", 10),
      estoque_minimo: parseInt(form.estoque_minimo || "0", 10),
      whatsapp_fornecedor: form.whatsapp_fornecedor.trim(),
    };
    try {
      if (editing) await api.put(`/products/${id}`, payload);
      else await api.post("/products", payload);
      toast.success(editing ? "Produto atualizado" : "Produto cadastrado");
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen pb-24" data-testid="product-form-page">
      <TopBar title={editing ? "Editar Produto" : "Novo Produto"} back />

      <div className="max-w-xl mx-auto p-4">
        <form onSubmit={submit} className="card-tech rounded-lg p-5 space-y-5">
          {/* Photo */}
          <div>
            <Label className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Foto do Produto</Label>
            <div className="mt-2 aspect-square w-full max-w-[240px] rounded-md border border-border bg-background overflow-hidden flex items-center justify-center relative">
              {form.foto_url ? (
                <>
                  <img src={form.foto_url} alt="produto" className="h-full w-full object-cover" data-testid="product-photo-preview" />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, foto_url: "" }))}
                    data-testid="product-photo-clear"
                    className="absolute top-2 right-2 h-8 w-8 rounded-md bg-background/80 backdrop-blur border border-border hover:bg-destructive/20 flex items-center justify-center btn-tap"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} data-testid="product-photo-file" />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPickFile} data-testid="product-photo-camera" />
              <Button type="button" variant="outline" onClick={() => cameraRef.current?.click()} className="flex-1 h-11 btn-tap" data-testid="open-camera-button">
                <Camera className="h-4 w-4" /> Câmera
              </Button>
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="flex-1 h-11 btn-tap" data-testid="open-gallery-button">
                <ImageIcon className="h-4 w-4" /> Galeria
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Nome</Label>
            <Input value={form.nome} onChange={setField("nome")} required className="h-12" placeholder="Camisa Polo Azul" data-testid="product-name-input" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Preço (R$)</Label>
              <Input value={form.preco_venda} onChange={setField("preco_venda")} required inputMode="decimal" className="h-12" placeholder="99,90" data-testid="product-price-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Qtd. Estoque</Label>
              <Input value={form.quantidade_estoque} onChange={setField("quantidade_estoque")} required inputMode="numeric" className="h-12" placeholder="10" data-testid="product-qty-input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Estoque Mínimo</Label>
              <Input value={form.estoque_minimo} onChange={setField("estoque_minimo")} required inputMode="numeric" className="h-12" placeholder="3" data-testid="product-min-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">WhatsApp Fornecedor</Label>
              <Input value={form.whatsapp_fornecedor} onChange={setField("whatsapp_fornecedor")} className="h-12" placeholder="11912345678" data-testid="product-supplier-input" />
            </div>
          </div>

          {error && <div className="text-sm text-destructive" data-testid="product-form-error">{error}</div>}

          <Button type="submit" disabled={busy} className="w-full h-12 bg-primary hover:bg-primary/90 font-bold btn-tap" data-testid="product-save-button">
            <Save className="h-4 w-4" /> {busy ? "Salvando..." : editing ? "Salvar Alterações" : "Cadastrar Produto"}
          </Button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
}
