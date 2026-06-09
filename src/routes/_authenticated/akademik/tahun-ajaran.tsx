import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAcademicYears, upsertAcademicYear, deleteAcademicYear,
  listTerms, upsertTerm, deleteTerm,
} from "@/lib/academic.functions";
import { RequireActiveSchool } from "@/components/require-active-school";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/akademik/tahun-ajaran")({
  head: () => ({ meta: [{ title: "Tahun Ajaran — SIMAT" }] }),
  component: () => (
    <RequireActiveSchool>{(schoolId) => <YearsPage schoolId={schoolId} />}</RequireActiveSchool>
  ),
});

function YearsPage({ schoolId }: { schoolId: string }) {
  const fetchYears = useServerFn(listAcademicYears);
  const q = useQuery({ queryKey: ["years", schoolId], queryFn: () => fetchYears({ data: { school_id: schoolId } }) });
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tahun Ajaran & Semester</h1>
          <p className="text-muted-foreground">Atur tahun ajaran dan semester untuk sekolah aktif.</p>
        </div>
        <YearDialog schoolId={schoolId} />
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Tahun Ajaran</CardTitle></CardHeader>
        <CardContent>
          {q.isLoading ? (
            <div className="py-12 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Nama</TableHead><TableHead>Mulai</TableHead><TableHead>Selesai</TableHead>
                <TableHead>Aktif</TableHead><TableHead className="w-[160px]" />
              </TableRow></TableHeader>
              <TableBody>
                {(q.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Belum ada tahun ajaran.</TableCell></TableRow>
                )}
                {(q.data ?? []).map((y) => (
                  <TableRow key={y.id}>
                    <TableCell className="font-medium">{y.name}</TableCell>
                    <TableCell>{y.start_date}</TableCell>
                    <TableCell>{y.end_date}</TableCell>
                    <TableCell>{y.is_active && <Badge>Aktif</Badge>}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedYear(y.id === selectedYear ? null : y.id)}>
                        <ChevronRight className={`h-4 w-4 transition ${selectedYear === y.id ? "rotate-90" : ""}`} /> Semester
                      </Button>
                      <YearDialog schoolId={schoolId} year={y} />
                      <DeleteButton id={y.id} schoolId={schoolId} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedYear && <TermsCard yearId={selectedYear} />}
    </div>
  );
}

function DeleteButton({ id, schoolId }: { id: string; schoolId: string }) {
  const qc = useQueryClient();
  const del = useServerFn(deleteAcademicYear);
  const m = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["years", schoolId] }); },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });
  return (
    <Button size="icon" variant="ghost" onClick={() => confirm("Hapus tahun ajaran?") && m.mutate()}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

type Year = { id: string; school_id: string; name: string; start_date: string; end_date: string; is_active: boolean };

function YearDialog({ schoolId, year }: { schoolId: string; year?: Year }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const [name, setName] = useState(year?.name ?? "");
  const [start, setStart] = useState(year?.start_date ?? "");
  const [end, setEnd] = useState(year?.end_date ?? "");
  const [active, setActive] = useState(year?.is_active ?? false);
  const fn = useServerFn(upsertAcademicYear);
  const m = useMutation({
    mutationFn: () => fn({ data: { id: year?.id, school_id: schoolId, name, start_date: start, end_date: end, is_active: active } }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["years", schoolId] }); setOpen(false); },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {year ? <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
              : <Button><Plus className="h-4 w-4 mr-1" />Tahun Ajaran</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{year ? "Ubah" : "Buat"} Tahun Ajaran</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nama *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="2025/2026" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Mulai *</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label>Selesai *</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-2"><Switch checked={active} onCheckedChange={setActive} /><Label>Tandai aktif</Label></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => m.mutate()} disabled={!name || !start || !end || m.isPending}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TermsCard({ yearId }: { yearId: string }) {
  const qc = useQueryClient();
  const fetchTerms = useServerFn(listTerms);
  const q = useQuery({ queryKey: ["terms", yearId], queryFn: () => fetchTerms({ data: { academic_year_id: yearId } }) });
  const up = useServerFn(upsertTerm);
  const del = useServerFn(deleteTerm);

  const [name, setName] = useState("");
  const [ord, setOrd] = useState(1);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const add = useMutation({
    mutationFn: () => up({ data: { academic_year_id: yearId, name, ordinal: ord, start_date: start, end_date: end, is_active: false } }),
    onSuccess: () => { toast.success("Semester ditambah"); qc.invalidateQueries({ queryKey: ["terms", yearId] }); setName(""); setStart(""); setEnd(""); },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["terms", yearId] }),
  });

  return (
    <Card>
      <CardHeader><CardTitle>Semester</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Nama</TableHead><TableHead>Mulai</TableHead><TableHead>Selesai</TableHead><TableHead>Aktif</TableHead><TableHead className="w-[60px]" /></TableRow></TableHeader>
          <TableBody>
            {(q.data ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.ordinal}</TableCell>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.start_date}</TableCell>
                <TableCell>{t.end_date}</TableCell>
                <TableCell>{t.is_active && <Badge>Aktif</Badge>}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remove.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="grid grid-cols-5 gap-2 items-end pt-2 border-t">
          <div><Label>Nama</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Semester Ganjil" /></div>
          <div><Label>Urutan</Label><Input type="number" value={ord} onChange={(e) => setOrd(parseInt(e.target.value) || 1)} /></div>
          <div><Label>Mulai</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><Label>Selesai</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          <Button onClick={() => add.mutate()} disabled={!name || !start || !end || add.isPending}>Tambah</Button>
        </div>
      </CardContent>
    </Card>
  );
}
