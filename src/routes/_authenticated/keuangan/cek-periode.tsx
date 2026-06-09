import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFeePlans, previewGenerateInvoices, reconcilePeriod } from "@/lib/finance.functions";
import { RequireActiveSchool } from "@/components/require-active-school";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Wand2, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatRupiah } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/keuangan/cek-periode")({
  head: () => ({ meta: [{ title: "Cek Periode — SIMAT" }] }),
  component: () => <RequireActiveSchool>{(s) => <Page schoolId={s} />}</RequireActiveSchool>,
});

function Page({ schoolId }: { schoolId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cek Periode</h1>
        <p className="text-muted-foreground">
          Verifikasi generator tagihan massal sebelum di-commit, dan rekonsiliasi laporan keuangan untuk bulan/tahun tertentu.
        </p>
      </div>
      <Tabs defaultValue="dryrun">
        <TabsList>
          <TabsTrigger value="dryrun"><Wand2 className="h-4 w-4 mr-2" />Dry-run Generator</TabsTrigger>
          <TabsTrigger value="recon"><ShieldCheck className="h-4 w-4 mr-2" />Rekonsiliasi Periode</TabsTrigger>
        </TabsList>
        <TabsContent value="dryrun"><DryRunTab schoolId={schoolId} /></TabsContent>
        <TabsContent value="recon"><ReconTab schoolId={schoolId} /></TabsContent>
      </Tabs>
    </div>
  );
}

function DryRunTab({ schoolId }: { schoolId: string }) {
  const plansFn = useServerFn(listFeePlans);
  const plans = useQuery({ queryKey: ["fee-plans", schoolId], queryFn: () => plansFn({ data: { school_id: schoolId } }) });
  const [planId, setPlanId] = useState("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const previewFn = useServerFn(previewGenerateInvoices);
  const preview = useQuery({
    queryKey: ["preview-gen", schoolId, planId, period],
    queryFn: () => previewFn({ data: { school_id: schoolId, fee_plan_id: planId, period_label: period } }),
    enabled: !!planId && !!period,
  });
  const r = preview.data;
  return (
    <Card>
      <CardHeader><CardTitle>Simulasi Generate Tagihan</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[260px]">
            <Label>Paket SPP</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Pilih paket..." /></SelectTrigger>
              <SelectContent>
                {(plans.data ?? []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} — {p.academic_years?.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Periode (YYYY-MM)</Label>
            <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-09" className="w-40" />
          </div>
        </div>

        {!planId && <p className="text-sm text-muted-foreground">Pilih paket dan periode untuk melihat hasil simulasi.</p>}
        {preview.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
        {r && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Kelas Tercocok" value={String(r.classesMatched)} />
              <Stat label="Siswa Aktif" value={String(r.totalStudents)} />
              <Stat label="Akan Dibuat" value={String(r.willCreateCount)} tone="ok" />
              <Stat label="Dilewati (sudah ada)" value={String(r.willSkipCount)} tone="warn" />
              <Stat label="Nilai per Siswa" value={formatRupiah(r.perStudentAmount)} />
              <Stat label="Proyeksi Total" value={formatRupiah(r.projectedAmount)} tone="ok" />
            </div>

            <div>
              <h4 className="font-semibold mb-2">Komponen Paket</h4>
              <Table>
                <TableHeader><TableRow><TableHead>Komponen</TableHead><TableHead className="text-right">Nominal</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.items.map((it, i) => (
                    <TableRow key={i}><TableCell>{it.name}</TableCell><TableCell className="text-right">{formatRupiah(it.amount)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Contoh siswa yang akan ditagih (maks 10)</h4>
                <Table>
                  <TableHeader><TableRow><TableHead>NIS</TableHead><TableHead>Nama</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {r.sample.length === 0 && <TableRow><TableCell colSpan={2} className="text-muted-foreground text-center py-4">—</TableCell></TableRow>}
                    {r.sample.map((s) => <TableRow key={s.student_id}><TableCell>{s.nis}</TableCell><TableCell>{s.full_name}</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Dilewati — sudah punya tagihan periode ini</h4>
                <Table>
                  <TableHeader><TableRow><TableHead>Nama</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {r.skippedSample.length === 0 && <TableRow><TableCell className="text-muted-foreground text-center py-4">—</TableCell></TableRow>}
                    {r.skippedSample.map((s) => <TableRow key={s.student_id}><TableCell>{s.full_name}</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Alert>
              <AlertTitle>Dry-run saja</AlertTitle>
              <AlertDescription>
                Tidak ada data yang ditulis. Untuk benar-benar membuat tagihan, buka halaman <b>Tagihan / SPP → Generate dari Paket</b>.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReconTab({ schoolId }: { schoolId: string }) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [period, setPeriod] = useState("");
  const fn = useServerFn(reconcilePeriod);
  const q = useQuery({
    queryKey: ["recon", schoolId, from, to, period],
    queryFn: () => fn({ data: { school_id: schoolId, from, to, period_label: period || null } }),
  });
  const r = q.data;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end gap-2">
          <div><Label>Dari</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Sampai</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div><Label>Periode (opsional)</Label><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-09" className="w-40" /></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {q.isLoading || !r ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <>
            <Alert variant={r.ok ? "default" : "destructive"}>
              {r.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertTitle>{r.ok ? "Akurat — tidak ada anomali" : "Ditemukan anomali pada periode ini"}</AlertTitle>
              <AlertDescription>
                {r.counts.invoices} tagihan · {r.counts.payments} pembayaran · {r.counts.journals} jurnal.
              </AlertDescription>
            </Alert>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Total Ditagihkan" value={formatRupiah(r.totals.invoiced)} />
              <Stat label="Total Pembayaran" value={formatRupiah(r.totals.sumPayments)} />
              <Stat label="Telah Dibayar (di tagihan)" value={formatRupiah(r.totals.paidOnInvoices)} />
              <Stat label="Tunggakan" value={formatRupiah(r.totals.outstanding)} tone={r.totals.outstanding > 0 ? "warn" : "ok"} />
            </div>

            <Section title="Tagihan Ganda (siswa × periode)" empty={r.issues.duplicateInvoices.length === 0}>
              <Table>
                <TableHeader><TableRow><TableHead>Kunci</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.issues.duplicateInvoices.map((d, i) => (
                    <TableRow key={i}><TableCell className="font-mono text-xs">{d.key}</TableCell><TableCell className="text-right"><Badge variant="destructive">{d.count}</Badge></TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>

            <Section title="Pembayaran tanpa Jurnal" empty={r.issues.orphanPayments.length === 0}>
              <Table>
                <TableHeader><TableRow><TableHead>No</TableHead><TableHead className="text-right">Nominal</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.issues.orphanPayments.map((p) => (
                    <TableRow key={p.id}><TableCell className="font-mono text-xs">{p.payment_no}</TableCell><TableCell className="text-right">{formatRupiah(p.amount)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>

            <Section title="Jurnal Tidak Seimbang" empty={r.issues.unbalancedJournals.length === 0}>
              <Table>
                <TableHeader><TableRow><TableHead>No</TableHead><TableHead>Tgl</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Kredit</TableHead><TableHead className="text-right">Selisih</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.issues.unbalancedJournals.map((j, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{j.entry_no}</TableCell>
                      <TableCell>{j.entry_date}</TableCell>
                      <TableCell className="text-right">{formatRupiah(j.debit)}</TableCell>
                      <TableCell className="text-right">{formatRupiah(j.credit)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatRupiah(j.diff)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>

            <Section title="Tagihan Lebih Bayar" empty={r.issues.overPaid.length === 0}>
              <Table>
                <TableHeader><TableRow><TableHead>Siswa</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Dibayar</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.issues.overPaid.map((o) => (
                    <TableRow key={o.id}><TableCell>{o.student}</TableCell><TableCell className="text-right">{formatRupiah(o.total)}</TableCell><TableCell className="text-right">{formatRupiah(o.paid)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  const color = tone === "ok" ? "text-emerald-600 dark:text-emerald-400"
    : tone === "warn" ? "text-amber-600 dark:text-amber-400" : "";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Section({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-semibold mb-2 flex items-center gap-2">
        {title}
        {empty ? <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" />OK</Badge>
               : <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Perlu Tinjau</Badge>}
      </h4>
      {!empty && children}
    </div>
  );
}
