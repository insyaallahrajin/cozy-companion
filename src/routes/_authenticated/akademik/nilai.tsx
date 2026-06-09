import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listClasses, listAcademicYears, listClassSubjects, listTerms,
  listGrades, saveGrade, deleteGrade,
} from "@/lib/academic.functions";
import { RequireActiveSchool } from "@/components/require-active-school";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/akademik/nilai")({
  head: () => ({ meta: [{ title: "Nilai — SIMAT" }] }),
  component: () => <RequireActiveSchool>{(s) => <Page schoolId={s} />}</RequireActiveSchool>,
});

const ATYPES = ["TUGAS","ULANGAN_HARIAN","UTS","UAS","PRAKTIK","PROYEK","SIKAP"] as const;

function Page({ schoolId }: { schoolId: string }) {
  const fetchYears = useServerFn(listAcademicYears);
  const years = useQuery({ queryKey: ["years", schoolId], queryFn: () => fetchYears({ data: { school_id: schoolId } }) });
  const yearId = years.data?.find((y) => y.is_active)?.id || years.data?.[0]?.id || "";
  const fetchClasses = useServerFn(listClasses);
  const classes = useQuery({
    queryKey: ["classes", schoolId, yearId],
    queryFn: () => fetchClasses({ data: { school_id: schoolId, academic_year_id: yearId } }),
    enabled: !!yearId,
  });
  const fetchTerms = useServerFn(listTerms);
  const terms = useQuery({ queryKey: ["terms", yearId], queryFn: () => fetchTerms({ data: { academic_year_id: yearId } }), enabled: !!yearId });

  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const fetchCS = useServerFn(listClassSubjects);
  const cs = useQuery({ queryKey: ["cs", classId], queryFn: () => fetchCS({ data: { class_id: classId } }), enabled: !!classId });
  const [csId, setCsId] = useState("");

  const effTerm = termId || terms.data?.find((t) => t.is_active)?.id || terms.data?.[0]?.id || "";

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Nilai</h1><p className="text-muted-foreground">Input nilai per mata pelajaran dan semester.</p></div>
      <Card><CardContent className="pt-6 grid grid-cols-3 gap-3">
        <div><Label>Kelas</Label>
          <Select value={classId} onValueChange={(v) => { setClassId(v); setCsId(""); }}>
            <SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
            <SelectContent>{(classes.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Mata Pelajaran</Label>
          <Select value={csId} onValueChange={setCsId} disabled={!classId}>
            <SelectTrigger><SelectValue placeholder="Pilih mapel..." /></SelectTrigger>
            <SelectContent>{(cs.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.subjects?.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Semester</Label>
          <Select value={effTerm} onValueChange={setTermId}>
            <SelectTrigger><SelectValue placeholder="Pilih semester..." /></SelectTrigger>
            <SelectContent>{(terms.data ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}{t.is_active && " (aktif)"}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </CardContent></Card>
      {csId && effTerm && <GradesPanel csId={csId} termId={effTerm} />}
    </div>
  );
}

function GradesPanel({ csId, termId }: { csId: string; termId: string }) {
  const qc = useQueryClient();
  const fetch = useServerFn(listGrades);
  const save = useServerFn(saveGrade);
  const del = useServerFn(deleteGrade);
  const q = useQuery({ queryKey: ["grades", csId, termId], queryFn: () => fetch({ data: { class_subject_id: csId, term_id: termId } }) });

  const [studentId, setStudentId] = useState("");
  const [atype, setAtype] = useState<typeof ATYPES[number]>("TUGAS");
  const [title, setTitle] = useState(""); const [score, setScore] = useState(0); const [weight, setWeight] = useState(1);
  const add = useMutation({
    mutationFn: () => save({ data: { class_subject_id: csId, student_id: studentId, term_id: termId, assessment_type: atype, title: title || null, score, weight } }),
    onSuccess: () => { toast.success("Nilai disimpan"); qc.invalidateQueries({ queryKey: ["grades", csId, termId] }); setTitle(""); setScore(0); },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });
  const remove = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["grades", csId, termId] }) });

  if (q.isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  const students = q.data?.students ?? []; const grades = q.data?.grades ?? []; const kkm = q.data?.subject?.kkm ?? 70;

  return (
    <Card><CardHeader><CardTitle>Nilai (KKM: {kkm})</CardTitle></CardHeader><CardContent className="space-y-4">
      <Table>
        <TableHeader><TableRow><TableHead>Siswa</TableHead><TableHead>Jenis</TableHead><TableHead>Judul</TableHead><TableHead>Nilai</TableHead><TableHead>Bobot</TableHead><TableHead className="w-[50px]" /></TableRow></TableHeader>
        <TableBody>
          {grades.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada nilai.</TableCell></TableRow>}
          {grades.map((g: any) => {
            const st = students.find((s: any) => s.id === g.student_id);
            return (
              <TableRow key={g.id}>
                <TableCell>{st?.full_name ?? "—"}</TableCell>
                <TableCell><Badge variant="outline">{g.assessment_type}</Badge></TableCell>
                <TableCell>{g.title ?? "—"}</TableCell>
                <TableCell><Badge variant={g.score >= kkm ? "default" : "destructive"}>{Number(g.score).toFixed(2)}</Badge></TableCell>
                <TableCell>{Number(g.weight).toFixed(2)}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remove.mutate(g.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="grid grid-cols-6 gap-2 items-end pt-3 border-t">
        <div className="col-span-2"><Label>Siswa</Label>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
            <SelectContent>{students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Jenis</Label>
          <Select value={atype} onValueChange={(v) => setAtype(v as typeof ATYPES[number])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ATYPES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Judul</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><Label>Nilai</Label><Input type="number" step="0.01" min={0} max={100} value={score} onChange={(e) => setScore(parseFloat(e.target.value) || 0)} /></div>
        <div className="flex gap-2 items-end">
          <div className="flex-1"><Label>Bobot</Label><Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(parseFloat(e.target.value) || 1)} /></div>
          <Button onClick={() => add.mutate({})} disabled={!studentId || add.isPending}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
    </CardContent></Card>
  );
}
