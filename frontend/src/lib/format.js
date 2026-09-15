export function formatBRL(value) {
  const n = Number(value) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function stockStatus(qty, min) {
  if (qty <= 0) return "out";
  if (qty <= min) return "low";
  return "good";
}

export function statusLabel(s) {
  return s === "out" ? "ESGOTADO" : s === "low" ? "BAIXO" : "OK";
}

// Sanitize phone: keep digits only. Assumes user entered BR number with DDD.
// If starts with 55 already, keep it. Otherwise prefix 55.
export function toWhatsAppNumber(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export function waLink(phone, message) {
  const n = toWhatsAppNumber(phone);
  const msg = encodeURIComponent(message);
  return `https://wa.me/${n}?text=${msg}`;
}
