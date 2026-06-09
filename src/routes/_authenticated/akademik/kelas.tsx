import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listClasses, upsertClass, deleteClass,
  listAcademicYears, listStaff,
  listClassSubjects, upsertClassSubject, deleteClassSubject, listSubjects,
} from "@/lib/academic.functions";
import { RequireActiveSchool } from "@/components/require-active-school";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/akademik/kelas")({
  head: () => ({ meta: [{ title: "Kelas & Rombel — SIMAT" }] }),
  component: () => <RequireActiveSchool>{(s) => <Page schoolId={s} />}</RequireActiveSchool>,
});

function Page({ schoolId }: { schoolId: string }) {
  const fetchYears = useServerFn(listAcademicYears);
  const years = useQuery({ queryKey: ["years", schoolId], queryFn: () => fetchYears({ data: { school_id: schoolId } }) });
  const [yearId, setYearId] = useState<string | "">("");
  const effective = yearId || years.data?.find((y) => y.is_active)?.id || years.data?.[0]?.id || "";
  const fetchClasses = useServerFn(listClasses);
  const q = useQuery({
    queryKey: ["classes", schoolId, effective],
    queryFn: () => fetchClasses({ data: { school_id: schoolId, academic_year_id: effective } }),
    enabled: !!effective,
  });
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight">Kelas & Rombel</h1><p className="text-muted-foreground">Kelola rombongan belajar per tahun ajaran.</p></div>
        <div className="flex items-center gap-2">
          <Select value={effective} onValueChange={setYearId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tahun Ajaran" /></SelectTrigger>
            <SelectContent>{(years.data ?? []).map((y) => <SelectItem key={y.id} value={y.id}>{y.name}{y.is_active && " (aktif)"}</SelectItem>)}</SelectContent>
          </Select>
          {effective && <ClassDialog schoolId={schoolId} yearId={effective} />}
        </div>
      </div>
      <Card><CardHeader><CardTitle>Daftar Kelas</CardTitle></CardHeader><CardContent>
        {!effective ? <p className="text-sm text-muted-foreground py-4">Buat tahun ajaran dahulu.</p>
         : q.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tingkat</TableHead><TableHead>Nama</TableHead><TableHead>Wali Kelas</TableHead>
              <TableHead>Ruangan</TableHead><TableHead>Kapasitas</TableHead><TableHead className="w-[140px]" />
            </TableRow></TableHeader>
            <TableBody>
              {(q.data ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada kelas.</TableCell></TableRow>}
              {(q.data ?? []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.grade_level}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.staff?.full_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{c.room ?? "—"}</TableCell>
                  <TableCell>{c.capacity}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <ClassSubjectsDialog classId={c.id} className={c.name} schoolId={schoolId} />
                    <ClassDialog schoolId={schoolId} yearId={effective} klass={c} />
                    <DelBtn id={c.id} schoolId={schoolId} yearId={effective} />
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

function DelBtn({ id, schoolId, yearId }: { id: string; schoolId: string; yearId: string }) {
  const qc = useQueryClient(); const del = useServerFn(deleteClass);
  const m = useMutation({ mutationFn: () => del({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["classes", schoolId, yearId] }); } });
  return <Button size="icon" variant="ghost" onClick={() => confirm("Hapus kelas?") && m.mutate({})}><Trash2 className="h-4 w-4" /></Button>;
}

function ClassDialog({ schoolId, yearId, klass }: { schoolId: string; yearId: string; klass?: any }) {
  const [open, setOpen] = useState(false); const qc = useQueryClient();
  const fetchStaff = useServerFn(listStaff);
  const staff = useQuery({ queryKey: ["staff", schoolId], queryFn: () => fetchStaff({ data: { school_id: schoolId } }), enabled: open });
  const [d, setD] = useState({
    grade_level: klass?.grade_level ?? 7, name: klass?.name ?? "", capacity: klass?.capacity ?? 32,
    room: klass?.room ?? "", homeroom_teacher_id: klass?.homeroom_teacher_id ?? "",
  });
  const fn = useServerFn(upsertClass);
  const m = useMutation({
    mutationFn: () => fn({ data: { id: klass?.id, school_id: schoolId, academic_year_id: yearId, grade_level: d.grade_level, name: d.name, capacity: d.capacity, room: d.room || null, homeroom_teacher_id: d.homeroom_teacher_id || null, status: "ACTIVE" } }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["classes", schoolId, yearId] }); setOpen(false); },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{klass ? <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button> : <Button><Plus className="h-4 w-4 mr-1" />Kelas</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{klass ? "Ubah" : "Tambah"} Kelas</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Tingkat *</Label><Input type="number" value={d.grade_level} onChange={(e) => setD({...d, grade_level: parseInt(e.target.value) || 1})} /></div>
          <div><Label>Nama *</Label><Input value={d.name} onChange={(e) => setD({...d, name: e.target.value})} placeholder="7A" /></div>
          <div><Label>Kapasitas</Label><Input type="number" value={d.capacity} onChange={(e) => setD({...d, capacity: parseInt(e.target.value) || 32})} /></div>
          <div><Label>Ruangan</Label><Input value={d.room} onChange={(e) => setD({...d, room: e.target.value})} /></div>
          <div className="col-span-2"><Label>Wali Kelas</Label>
            <Select value={d.homeroom_teacher_id} onValueChange={(v) => setD({...d, homeroom_teacher_id: v})}>
              <SelectTrigger><SelectValue placeholder="Pilih guru..." /></SelectTrigger>
              <SelectContent>{(staff.data ?? []).filter((s: any) => s.is_teacher).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button onClick={() => m.mutate({})} disabled={!d.name || m.isPending}>Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClassSubjectsDialog({ classId, className, schoolId }: { classId: string; className: string; schoolId: string }) {
  const [open, setOpen] = useState(false); const qc = useQueryClient();
  const fetchCS = useServerFn(listClassSubjects);
  const fetchSubj = useServerFn(listSubjects);
  const fetchStaff = useServerFn(listStaff);
  const cs = useQuery({ queryKey: ["cs", classId], queryFn: () => fetchCS({ data: { class_id: classId } }), enabled: open });
  const subj = useQuery({ queryKey: ["subjects", schoolId], queryFn: () => fetchSubj({ data: { school_id: schoolId } }), enabled: open });
  const staff = useQuery({ queryKey: ["staff", schoolId], queryFn: () => fetchStaff({ data: { school_id: schoolId } }), enabled: open });
  const upsert = useServerFn(upsertClassSubject); const del = useServerFn(deleteClassSubject);
  const [subjectId, setSubjectId] = useState(""); const [teacherId, setTeacherId] = useState(""); const [hours, setHours] = useState(2);
  const add = useMutation({
    mutationFn: () => upsert({ data: { class_id: classId, subject_id: subjectId, teacher_id: teacherId || null, weekly_hours: hours } }),
    onSuccess: () => { toast.success("Mapel ditambah"); qc.invalidateQueries({ queryKey: ["cs", classId] }); setSubjectId(""); setTeacherId(""); },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });
  const remove = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["cs", classId] }) });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon" variant="ghost"><Settings2 className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Mata Pelajaran Kelas {className}</DialogTitle></DialogHeader>
        <Table><TableHeader><TableRow><TableHead>Mapel</TableHead><TableHead>Guru</TableHead><TableHead>Jam</TableHead><TableHead className="w-[50px]" /></TableRow></TableHeader>
          <TableBody>
            {(cs.data ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.subjects?.name}</TableCell>
                <TableCell>{r.staff?.full_name ?? "—"}</TableCell>
                <TableCell>{r.weekly_hours}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="grid grid-cols-4 gap-2 items-end pt-3 border-t">
          <div className="col-span-2"><Label>Mapel</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
              <SelectContent>{(subj.data ?? []).filter((s: any) => !cs.data?.some((c: any) => c.subject_id === s.id)).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Guru</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
              <SelectContent>{(staff.data ?? []).filter((s: any) => s.is_teacher).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Label>Jam</Label><Input type="number" value={hours} onChange={(e) => setHours(parseInt(e.target.value) || 1)} /></div>
            <Button onClick={() => add.mutate({})} disabled={!subjectId || add.isPending}>+</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
