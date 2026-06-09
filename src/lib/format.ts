export function formatRupiah(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
}

export function parseRupiahInput(s: string): number {
  const cleaned = s.replace(/[^\d]/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
}
