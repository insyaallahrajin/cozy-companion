import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listClasses, listAcademicYears, listAttendance, saveAttendance,
} from "@/lib/academic.functions";
import { RequireActiveSchool } from "@/components/require-active-school";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/akademik/presensi")({
  head: () => ({ meta: [{ title: "Presensi — SIMAT" }] }),
  component: () => <RequireActiveSchool>{(s) => <Page schoolId={s} />}</RequireActiveSchool>,
});

const STATUSES = ["HADIR","SAKIT","IZIN","ALPA","TERLAMBAT"] as const;

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
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Presensi</h1><p className="text-muted-foreground">Catat presensi harian per kelas.</p></div>
      <Card><CardContent className="pt-6 flex items-end gap-3">
        <div className="flex-1 max-w-xs"><Label>Kelas</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
            <SelectContent>{(classes.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="max-w-[200px]"><Label>Tanggal</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </CardContent></Card>
      {classId && <AttendancePanel classId={classId} date={date} />}
    </div>
  );
}

function AttendancePanel({ classId, date }: { classId: string; date: string }) {
  const qc = useQueryClient();
  const fetch = useServerFn(listAttendance);
  const save = useServerFn(saveAttendance);
  const q = useQuery({ queryKey: ["att", classId, date], queryFn: () => fetch({ data: { class_id: classId, date } }) });
  const [records, setRecords] = useState<Record<string, { status: typeof STATUSES[number]; note: string }>>({});

  useEffect(() => {
    if (!q.data) return;
    const init: typeof records = {};
    q.data.students.forEach((s: any) => {
      const ex = q.data.attendance.find((a: any) => a.student_id === s.id);
      init[s.id] = { status: ex?.status ?? "HADIR", note: ex?.note ?? "" };
    });
    setRecords(init);
  }, [q.data]);

  const m = useMutation({
    mutationFn: () => save({ data: { class_id: classId, date, records: Object.entries(records).map(([student_id, r]) => ({ student_id, status: r.status, note: r.note || null })) } }),
    onSuccess: (r) => { toast.success(`${r.count} presensi tersimpan`); qc.invalidateQueries({ queryKey: ["att", classId, date] }); },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  if (q.isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  const students = q.data?.students ?? [];

  return (
    <Card><CardHeader><div className="flex items-center justify-between">
      <CardTitle>Presensi Kelas — {date}</CardTitle>
      <Button onClick={() => m.mutate()} disabled={m.isPending}><Save className="h-4 w-4 mr-1" />Simpan Semua</Button>
    </div></CardHeader><CardContent>
      {students.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada siswa terdaftar di kelas ini.</p> : (
        <Table>
          <TableHeader><TableRow><TableHead className="w-[40px]">#</TableHead><TableHead>Nama</TableHead><TableHead className="w-[160px]">Status</TableHead><TableHead>Catatan</TableHead></TableRow></TableHeader>
          <TableBody>
            {students.map((s: any, i: number) => (
              <TableRow key={s.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{s.full_name}</TableCell>
                <TableCell>
                  <Select value={records[s.id]?.status ?? "HADIR"} onValueChange={(v) => setRecords({...records, [s.id]: { ...records[s.id], status: v as typeof STATUSES[number] }})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Input value={records[s.id]?.note ?? ""} onChange={(e) => setRecords({...records, [s.id]: { ...records[s.id], note: e.target.value }})} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent></Card>
  );
}
