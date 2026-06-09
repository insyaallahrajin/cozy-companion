import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSubjects, upsertSubject, deleteSubject } from "@/lib/academic.functions";
import { RequireActiveSchool } from "@/components/require-active-school";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/akademik/mata-pelajaran")({
  head: () => ({ meta: [{ title: "Mata Pelajaran — SIMAT" }] }),
  component: () => <RequireActiveSchool>{(s) => <Page schoolId={s} />}</RequireActiveSchool>,
});

const GROUPS = ["UMUM","AGAMA","BAHASA","MATEMATIKA","IPA","IPS","SENI","OLAHRAGA","KEJURUAN","MUATAN_LOKAL"] as const;

type Subject = {
  id: string; school_id: string; code: string; name: string;
  subject_group: typeof GROUPS[number]; kkm: number; description: string | null; status: string;
};

function Page({ schoolId }: { schoolId: string }) {
  const fetch = useServerFn(listSubjects);
  const q = useQuery({ queryKey: ["subjects", schoolId], queryFn: () => fetch({ data: { school_id: schoolId } }) });
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mata Pelajaran</h1>
          <p className="text-muted-foreground">Kelola mata pelajaran beserta KKM untuk sekolah aktif.</p>
        </div>
        <SubjectDialog schoolId={schoolId} />
      </div>
      <Card><CardHeader><CardTitle>Daftar Mata Pelajaran</CardTitle></CardHeader><CardContent>
        {q.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Kelompok</TableHead>
              <TableHead>KKM</TableHead><TableHead>Status</TableHead><TableHead className="w-[100px]" />
            </TableRow></TableHeader>
            <TableBody>
              {(q.data ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada mata pelajaran.</TableCell></TableRow>}
              {(q.data ?? []).map((s: Subject) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono">{s.code}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell><Badge variant="outline">{s.subject_group}</Badge></TableCell>
                  <TableCell>{s.kkm}</TableCell>
                  <TableCell><Badge variant={s.status === "ACTIVE" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <SubjectDialog schoolId={schoolId} subject={s} />
                    <DelBtn id={s.id} schoolId={schoolId} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}

function DelBtn({ id, schoolId }: { id: string; schoolId: string }) {
  const qc = useQueryClient(); const del = useServerFn(deleteSubject);
  const m = useMutation({ mutationFn: () => del({ data: { id } }), onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["subjects", schoolId] }); } });
  return <Button size="icon" variant="ghost" onClick={() => confirm("Hapus?") && m.mutate()}><Trash2 className="h-4 w-4" /></Button>;
}

function SubjectDialog({ schoolId, subject }: { schoolId: string; subject?: Subject }) {
  const [open, setOpen] = useState(false); const qc = useQueryClient();
  const [code, setCode] = useState(subject?.code ?? "");
  const [name, setName] = useState(subject?.name ?? "");
  const [group, setGroup] = useState<typeof GROUPS[number]>(subject?.subject_group ?? "UMUM");
  const [kkm, setKkm] = useState(subject?.kkm ?? 70);
  const fn = useServerFn(upsertSubject);
  const m = useMutation({
    mutationFn: () => fn({ data: { id: subject?.id, school_id: schoolId, code, name, subject_group: group, kkm, status: "ACTIVE" } }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["subjects", schoolId] }); setOpen(false); },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{subject ? <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button> : <Button><Plus className="h-4 w-4 mr-1" />Mata Pelajaran</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{subject ? "Ubah" : "Tambah"} Mata Pelajaran</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Kode *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <div><Label>Nama *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Kelompok</Label>
              <Select value={group} onValueChange={(v) => setGroup(v as typeof GROUPS[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>KKM</Label><Input type="number" min={0} max={100} value={kkm} onChange={(e) => setKkm(parseInt(e.target.value) || 0)} /></div>
          </div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button onClick={() => m.mutate()} disabled={!code || !name || m.isPending}>Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
