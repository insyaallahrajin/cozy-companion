import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listInvoices, createInvoice, cancelInvoice,
  listFeeCategories, upsertFeeCategory, deleteFeeCategory,
  listFeePlans, upsertFeePlan, deleteFeePlan,
  generateInvoicesFromPlan,
} from "@/lib/finance.functions";
import { listStudents, listAcademicYears } from "@/lib/academic.functions";
import { RequireActiveSchool } from "@/components/require-active-school";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/keuangan/tagihan")({
  head: () => ({ meta: [{ title: "Tagihan SPP — SIMAT" }] }),
  component: () => <RequireActiveSchool>{(s) => <Page schoolId={s} />}</RequireActiveSchool>,
});

function Page({ schoolId }: { schoolId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tagihan / SPP</h1>
        <p className="text-muted-foreground">Kelola kategori biaya, paket SPP, dan tagihan siswa.</p>
      </div>
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Tagihan</TabsTrigger>
          <TabsTrigger value="plans">Paket SPP</TabsTrigger>
          <TabsTrigger value="categories">Kategori Biaya</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices"><InvoicesTab schoolId={schoolId} /></TabsContent>
        <TabsContent value="plans"><PlansTab schoolId={schoolId} /></TabsContent>
        <TabsContent value="categories"><CategoriesTab schoolId={schoolId} /></TabsContent>
      </Tabs>
    </div>
  );
}

function InvoicesTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const fetch = useServerFn(listInvoices);
  const q = useQuery({ queryKey: ["invoices", schoolId], queryFn: () => fetch({ data: { school_id: schoolId } }) });
  const cancel = useServerFn(cancelInvoice);
  const mCancel = useMutation({ mutationFn: (id: string) => cancel({ data: { id } }),
    onSuccess: () => { toast.success("Tagihan dibatalkan"); qc.invalidateQueries({ queryKey: ["invoices"] }); }});
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle>Daftar Tagihan</CardTitle>
          <div className="flex gap-2">
            <GenerateDialog schoolId={schoolId} />
            <NewInvoiceDialog schoolId={schoolId} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {q.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>No. Tagihan</TableHead><TableHead>Siswa</TableHead>
              <TableHead>Periode</TableHead><TableHead>Jatuh Tempo</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Dibayar</TableHead>
              <TableHead>Status</TableHead><TableHead className="w-[60px]" />
            </TableRow></TableHeader>
            <TableBody>
              {(q.data ?? []).length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Belum ada tagihan.</TableCell></TableRow>}
              {(q.data ?? []).map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">{i.invoice_no}</TableCell>
                  <TableCell>{i.students?.full_name ?? "—"}</TableCell>
                  <TableCell>{i.period_label ?? "—"}</TableCell>
                  <TableCell>{i.due_date}</TableCell>
                  <TableCell className="text-right">{formatRupiah(i.total_amount)}</TableCell>
                  <TableCell className="text-right">{formatRupiah(i.paid_amount)}</TableCell>
                  <TableCell><Badge variant={i.status === "PAID" ? "default" : i.status === "CANCELLED" ? "outline" : "secondary"}>{i.status}</Badge></TableCell>
                  <TableCell>
                    {i.status !== "PAID" && i.status !== "CANCELLED" && (
                      <Button size="icon" variant="ghost" onClick={() => mCancel.mutate(i.id)}><X className="h-4 w-4" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function NewInvoiceDialog({ schoolId }: { schoolId: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const studentsFn = useServerFn(listStudents);
  const yearsFn = useServerFn(listAcademicYears);
  const catsFn = useServerFn(listFeeCategories);
  const students = useQuery({ queryKey: ["students", schoolId], queryFn: () => studentsFn({ data: { school_id: schoolId } }), enabled: open });
  const years = useQuery({ queryKey: ["years", schoolId], queryFn: () => yearsFn({ data: { school_id: schoolId } }), enabled: open });
  const cats = useQuery({ queryKey: ["fee-cats", schoolId], queryFn: () => catsFn({ data: { school_id: schoolId } }), enabled: open });

  const [studentId, setStudentId] = useState("");
  const [yearId, setYearId] = useState("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<{ fee_category_id?: string; description: string; amount: number }[]>([]);

  const create = useServerFn(createInvoice);
  const m = useMutation({
    mutationFn: () => create({ data: {
      school_id: schoolId, student_id: studentId,
      academic_year_id: yearId || null, period_label: period,
      due_date: dueDate, items: items.filter((i) => i.description && i.amount > 0),
    }}),
    onSuccess: () => { toast.success("Tagihan dibuat"); qc.invalidateQueries({ queryKey: ["invoices"] }); setOpen(false); setItems([]); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Tagihan Baru</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Buat Tagihan</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Siswa</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger><SelectValue placeholder="Pilih siswa..." /></SelectTrigger>
                <SelectContent>{(students.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tahun Ajaran</Label>
              <Select value={yearId} onValueChange={setYearId}>
                <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>{(years.data ?? []).map((y: any) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Periode</Label><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-09" /></div>
            <div><Label>Jatuh Tempo</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><Label>Rincian</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { description: "", amount: 0 }])}><Plus className="h-3 w-3 mr-1" />Item</Button>
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_120px_40px] gap-2 mb-2">
                <Select value={it.fee_category_id ?? ""} onValueChange={(v) => {
                  const cat = (cats.data ?? []).find((c: any) => c.id === v);
                  const next = [...items]; next[idx] = { ...it, fee_category_id: v, description: cat?.name ?? it.description, amount: cat?.default_amount ? Number(cat.default_amount) : it.amount };
                  setItems(next);
                }}>
                  <SelectTrigger><SelectValue placeholder="Kategori..." /></SelectTrigger>
                  <SelectContent>{(cats.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Deskripsi" value={it.description} onChange={(e) => { const n = [...items]; n[idx] = { ...it, description: e.target.value }; setItems(n); }} />
                <Input type="number" placeholder="Nominal" value={it.amount || ""} onChange={(e) => { const n = [...items]; n[idx] = { ...it, amount: Number(e.target.value) }; setItems(n); }} />
                <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <div className="text-right font-semibold mt-2">Total: {formatRupiah(items.reduce((s, i) => s + (i.amount || 0), 0))}</div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={!studentId || items.length === 0 || m.isPending}>
            {m.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GenerateDialog({ schoolId }: { schoolId: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const plansFn = useServerFn(listFeePlans);
  const plans = useQuery({ queryKey: ["fee-plans", schoolId], queryFn: () => plansFn({ data: { school_id: schoolId } }), enabled: open });
  const [planId, setPlanId] = useState("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [dueDate, setDueDate] = useState(() => { const d = new Date(); d.setDate(10); return d.toISOString().slice(0, 10); });
  const gen = useServerFn(generateInvoicesFromPlan);
  const m = useMutation({
    mutationFn: () => gen({ data: { school_id: schoolId, fee_plan_id: planId, period_label: period, due_date: dueDate } }),
    onSuccess: (r) => { toast.success(`Berhasil: ${r.created} tagihan dibuat, ${r.skipped} dilewati.`); qc.invalidateQueries({ queryKey: ["invoices"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Wand2 className="h-4 w-4 mr-2" />Generate dari Paket</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Generate Tagihan Massal</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Paket SPP</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Pilih paket..." /></SelectTrigger>
              <SelectContent>{(plans.data ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} — {p.academic_years?.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Periode</Label><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-09" /></div>
            <div><Label>Jatuh Tempo</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Tagihan akan dibuat untuk semua siswa AKTIF di kelas yang sesuai dengan paket. Siswa yang sudah punya tagihan periode tersebut akan dilewati.</p>
        </div>
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={!planId || m.isPending}>
            {m.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const fetch = useServerFn(listFeeCategories);
  const q = useQuery({ queryKey: ["fee-cats", schoolId], queryFn: () => fetch({ data: { school_id: schoolId } }) });
  const upsert = useServerFn(upsertFeeCategory);
  const del = useServerFn(deleteFeeCategory);
  const [name, setName] = useState(""); const [amount, setAmount] = useState(0);
  const m = useMutation({ mutationFn: () => upsert({ data: { school_id: schoolId, name, default_amount: amount } }),
    onSuccess: () => { toast.success("Kategori tersimpan"); setName(""); setAmount(0); qc.invalidateQueries({ queryKey: ["fee-cats"] }); }});
  const mDel = useMutation({ mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["fee-cats"] }); }});
  return (
    <Card>
      <CardHeader><CardTitle>Kategori Biaya</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input placeholder="Nama (mis. SPP Bulanan)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="number" placeholder="Nominal default" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className="w-40" />
          <Button onClick={() => m.mutate()} disabled={!name}><Plus className="h-4 w-4 mr-2" />Tambah</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead className="text-right">Default</TableHead><TableHead className="w-[60px]" /></TableRow></TableHeader>
          <TableBody>
            {(q.data ?? []).map((c: any) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell className="text-right">{formatRupiah(c.default_amount)}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => mDel.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PlansTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const fetch = useServerFn(listFeePlans);
  const q = useQuery({ queryKey: ["fee-plans", schoolId], queryFn: () => fetch({ data: { school_id: schoolId } }) });
  const del = useServerFn(deleteFeePlan);
  const mDel = useMutation({ mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["fee-plans"] }); }});
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between"><CardTitle>Paket SPP</CardTitle><PlanDialog schoolId={schoolId} /></div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Tahun Ajaran</TableHead><TableHead>Tingkat</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-[60px]" /></TableRow></TableHeader>
          <TableBody>
            {(q.data ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Belum ada paket.</TableCell></TableRow>}
            {(q.data ?? []).map((p: any) => {
              const total = (p.fee_plan_items ?? []).reduce((s: number, i: any) => s + Number(i.amount), 0);
              return (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.academic_years?.name ?? "—"}</TableCell>
                  <TableCell>{p.grade_level ?? "Semua"}</TableCell>
                  <TableCell className="text-right">{formatRupiah(total)}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => mDel.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PlanDialog({ schoolId }: { schoolId: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const yearsFn = useServerFn(listAcademicYears);
  const catsFn = useServerFn(listFeeCategories);
  const years = useQuery({ queryKey: ["years", schoolId], queryFn: () => yearsFn({ data: { school_id: schoolId } }), enabled: open });
  const cats = useQuery({ queryKey: ["fee-cats", schoolId], queryFn: () => catsFn({ data: { school_id: schoolId } }), enabled: open });
  const [name, setName] = useState("");
  const [yearId, setYearId] = useState("");
  const [grade, setGrade] = useState<string>("");
  const [items, setItems] = useState<{ fee_category_id: string; amount: number; recurrence: "MONTHLY"|"ONCE"; due_day: number }[]>([]);
  const upsert = useServerFn(upsertFeePlan);
  const m = useMutation({
    mutationFn: () => upsert({ data: {
      school_id: schoolId, academic_year_id: yearId, name,
      grade_level: grade ? Number(grade) : null,
      items: items.filter((i) => i.fee_category_id && i.amount > 0),
    }}),
    onSuccess: () => { toast.success("Paket tersimpan"); qc.invalidateQueries({ queryKey: ["fee-plans"] }); setOpen(false); setName(""); setItems([]); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Paket Baru</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Buat Paket SPP</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1"><Label>Nama</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Tahun Ajaran</Label>
              <Select value={yearId} onValueChange={setYearId}>
                <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>{(years.data ?? []).map((y: any) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tingkat (opsional)</Label><Input type="number" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Semua" /></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><Label>Komponen</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { fee_category_id: "", amount: 0, recurrence: "MONTHLY", due_day: 10 }])}><Plus className="h-3 w-3 mr-1" />Item</Button>
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_120px_40px] gap-2 mb-2">
                <Select value={it.fee_category_id} onValueChange={(v) => {
                  const cat = (cats.data ?? []).find((c: any) => c.id === v);
                  const n = [...items]; n[idx] = { ...it, fee_category_id: v, amount: cat?.default_amount ? Number(cat.default_amount) : it.amount }; setItems(n);
                }}>
                  <SelectTrigger><SelectValue placeholder="Kategori..." /></SelectTrigger>
                  <SelectContent>{(cats.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" value={it.amount || ""} onChange={(e) => { const n = [...items]; n[idx] = { ...it, amount: Number(e.target.value) }; setItems(n); }} />
                <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={!name || !yearId || items.length === 0 || m.isPending}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
