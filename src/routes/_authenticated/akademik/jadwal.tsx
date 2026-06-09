import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listClasses, listAcademicYears, listClassSubjects,
  listSchedules, upsertSchedule, deleteSchedule,
} from "@/lib/academic.functions";
import { RequireActiveSchool } from "@/components/require-active-school";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/akademik/jadwal")({
  head: () => ({ meta: [{ title: "Jadwal Pelajaran — SIMAT" }] }),
  component: () => <RequireActiveSchool>{(s) => <Page schoolId={s} />}</RequireActiveSchool>,
});

const DAYS = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

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
  const [classId, setClassId] = useState("");

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Jadwal Pelajaran</h1><p className="text-muted-foreground">Susun jadwal mingguan per kelas.</p></div>
      <Card><CardHeader><div className="flex items-center justify-between gap-4">
        <CardTitle>Pilih Kelas</CardTitle>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-[260px]"><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
          <SelectContent>{(classes.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} (Tingkat {c.grade_level})</SelectItem>)}</SelectContent>
        </Select>
      </div></CardHeader></Card>
      {classId && <SchedulePanel classId={classId} />}
    </div>
  );
}

function SchedulePanel({ classId }: { classId: string }) {
  const qc = useQueryClient();
  const fetchSched = useServerFn(listSchedules);
  const fetchCS = useServerFn(listClassSubjects);
  const sched = useQuery({ queryKey: ["sched", classId], queryFn: () => fetchSched({ data: { class_id: classId } }) });
  const cs = useQuery({ queryKey: ["cs", classId], queryFn: () => fetchCS({ data: { class_id: classId } }) });
  const up = useServerFn(upsertSchedule); const del = useServerFn(deleteSchedule);

  const [csId, setCsId] = useState(""); const [day, setDay] = useState(1);
  const [start, setStart] = useState("07:00"); const [end, setEnd] = useState("08:30"); const [room, setRoom] = useState("");
  const add = useMutation({
    mutationFn: () => up({ data: { class_subject_id: csId, day_of_week: day, start_time: start, end_time: end, room: room || null } }),
    onSuccess: () => { toast.success("Jadwal ditambah"); qc.invalidateQueries({ queryKey: ["sched", classId] }); },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });
  const remove = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["sched", classId] }) });

  return (
    <Card><CardHeader><CardTitle>Jadwal Mingguan</CardTitle></CardHeader><CardContent className="space-y-4">
      {sched.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
        <Table>
          <TableHeader><TableRow><TableHead>Hari</TableHead><TableHead>Jam</TableHead><TableHead>Mata Pelajaran</TableHead><TableHead>Guru</TableHead><TableHead>Ruang</TableHead><TableHead className="w-[50px]" /></TableRow></TableHeader>
          <TableBody>
            {(sched.data ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{DAYS[r.day_of_week]}</TableCell>
                <TableCell className="font-mono">{r.start_time}–{r.end_time}</TableCell>
                <TableCell>{r.class_subjects?.subjects?.name}</TableCell>
                <TableCell>{r.class_subjects?.staff?.full_name ?? "—"}</TableCell>
                <TableCell>{r.room ?? "—"}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="grid grid-cols-6 gap-2 items-end pt-3 border-t">
        <div className="col-span-2"><Label>Mapel</Label>
          <Select value={csId} onValueChange={setCsId}>
            <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
            <SelectContent>{(cs.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.subjects?.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Hari</Label>
          <Select value={String(day)} onValueChange={(v) => setDay(parseInt(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{[1,2,3,4,5,6,7].map((d) => <SelectItem key={d} value={String(d)}>{DAYS[d]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Mulai</Label><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><Label>Selesai</Label><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        <div className="flex gap-2 items-end">
          <div className="flex-1"><Label>Ruang</Label><Input value={room} onChange={(e) => setRoom(e.target.value)} /></div>
          <Button onClick={() => add.mutate()} disabled={!csId || add.isPending}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
    </CardContent></Card>
  );
}
