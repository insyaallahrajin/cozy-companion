import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPayments, recordPayment, listCashAccounts, listInvoices } from "@/lib/finance.functions";
import { RequireActiveSchool } from "@/components/require-active-school";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/keuangan/pembayaran")({
  head: () => ({ meta: [{ title: "Pembayaran — SIMAT" }] }),
  component: () => <RequireActiveSchool>{(s) => <Page schoolId={s} />}</RequireActiveSchool>,
});

function Page({ schoolId }: { schoolId: string }) {
  const fetch = useServerFn(listPayments);
  const q = useQuery({ queryKey: ["payments", schoolId], queryFn: () => fetch({ data: { school_id: schoolId } }) });
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pembayaran</h1>
          <p className="text-muted-foreground">Catat pembayaran tagihan SPP dan penerimaan lain.</p>
        </div>
        <NewPaymentDialog schoolId={schoolId} />
      </div>
      <Card>
        <CardHeader><CardTitle>Riwayat Pembayaran</CardTitle></CardHeader>
        <CardContent>
          {q.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>No</TableHead><TableHead>Tanggal</TableHead>
                <TableHead>Tagihan</TableHead><TableHead>Siswa</TableHead>
                <TableHead>Akun</TableHead><TableHead>Metode</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(q.data ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada pembayaran.</TableCell></TableRow>}
                {(q.data ?? []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.payment_no}</TableCell>
                    <TableCell>{p.paid_at}</TableCell>
                    <TableCell className="font-mono text-xs">{p.invoices?.invoice_no ?? "—"}</TableCell>
                    <TableCell>{p.students?.full_name ?? "—"}</TableCell>
                    <TableCell>{p.cash_accounts?.name ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{p.method}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatRupiah(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NewPaymentDialog({ schoolId }: { schoolId: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const accountsFn = useServerFn(listCashAccounts);
  const invoicesFn = useServerFn(listInvoices);
  const accs = useQuery({ queryKey: ["cash-accounts", schoolId], queryFn: () => accountsFn({ data: { school_id: schoolId } }), enabled: open });
  const invs = useQuery({ queryKey: ["invoices-unpaid", schoolId], queryFn: () => invoicesFn({ data: { school_id: schoolId } }), enabled: open });
  const unpaid = (invs.data ?? []).filter((i: any) => i.status === "UNPAID" || i.status === "PARTIAL");

  const [invoiceId, setInvoiceId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<"TUNAI"|"TRANSFER"|"QRIS"|"VA"|"LAINNYA">("TUNAI");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");

  const record = useServerFn(recordPayment);
  const m = useMutation({
    mutationFn: () => {
      const inv = unpaid.find((i: any) => i.id === invoiceId);
      return record({ data: {
        school_id: schoolId,
        invoice_id: invoiceId || null,
        student_id: inv?.student_id ?? null,
        cash_account_id: accountId,
        amount, method, reference: reference || null, paid_at: paidAt,
      }});
    },
    onSuccess: () => {
      toast.success("Pembayaran tercatat");
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["cash-accounts"] });
      setOpen(false); setInvoiceId(""); setAmount(0); setReference("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Catat Pembayaran</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Catat Pembayaran</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Tagihan (opsional)</Label>
            <Select value={invoiceId} onValueChange={(v) => {
              setInvoiceId(v);
              const inv = unpaid.find((i: any) => i.id === v);
              if (inv) setAmount(Number(inv.total_amount) - Number(inv.paid_amount));
            }}>
              <SelectTrigger><SelectValue placeholder="Pilih tagihan..." /></SelectTrigger>
              <SelectContent>
                {unpaid.map((i: any) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.invoice_no} — {i.students?.full_name} — {formatRupiah(Number(i.total_amount) - Number(i.paid_amount))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Akun Kas/Bank</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>{(accs.data ?? []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Metode</Label>
              <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["TUNAI","TRANSFER","QRIS","VA","LAINNYA"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Nominal</Label><Input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} /></div>
            <div><Label>Tanggal</Label><Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></div>
            <div className="col-span-2"><Label>Referensi (opsional)</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="No. transfer / catatan" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={!accountId || amount <= 0 || m.isPending}>
            {m.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
