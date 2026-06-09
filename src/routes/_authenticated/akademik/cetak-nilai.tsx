import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listClasses, listAcademicYears, getGradeReport,
} from "@/lib/academic.functions";
import { RequireActiveSchool } from "@/components/require-active-school";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/akademik/cetak-nilai")({
  head: () => ({ meta: [{ title: "Cetak Rekap Nilai — SIMAT" }] }),
  component: () => <RequireActiveSchool>{(s) => <Page schoolId={s} />}</RequireActiveSchool>,
});

function Page({ schoolId }: { schoolId: string }) {
  const fetchYears = useServerFn(listAcademicYears);
  const years = useQuery({ queryKey: ["years", schoolId], queryFn: () => fetchYears({ data: { school_id: schoolId } }) });
  const [yearId, setYearId] = useState("");
  const effYear = yearId || years.data?.find((y: any) => y.is_active)?.id || "";
  const fetchClasses = useServerFn(listClasses);
  const classes = useQuery({
    queryKey: ["classes", schoolId, effYear],
    queryFn: () => fetchClasses({ data: { school_id: schoolId, academic_year_id: effYear } }),
    enabled: !!effYear,
  });
  const [classId, setClassId] = useState("");

  const fetchReport = useServerFn(getGradeReport);
  const report = useQuery({
    queryKey: ["gradeReport", classId, effYear],
    queryFn: () => fetchReport({ data: { class_id: classId, academic_year_id: effYear } }),
    enabled: !!classId && !!effYear,
  });

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold tracking-tight">Cetak Rekap Nilai</h1>
        <p className="text-muted-foreground">Pilih kelas & tahun ajaran, lalu cetak / simpan sebagai PDF.</p>
      </div>
      <Card className="print:hidden"><CardContent className="pt-6 grid grid-cols-3 gap-3 items-end">
        <div><Label>Tahun Ajaran</Label>
          <Select value={effYear} onValueChange={setYearId}>
            <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
            <SelectContent>{(years.data ?? []).map((y: any) => <SelectItem key={y.id} value={y.id}>{y.name}{y.is_active && " (aktif)"}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Kelas</Label>
          <Select value={classId} onValueChange={setClassId} disabled={!effYear}>
            <SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
            <SelectContent>{(classes.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} (Tingkat {c.grade_level})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Button disabled={!report.data} onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Cetak / PDF</Button></div>
      </CardContent></Card>

      {report.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
      {report.data && <ReportView data={report.data} />}
    </div>
  );
}

function ReportView({ data }: { data: any }) {
  const { klass, terms, class_subjects, students, grades } = data;
  // weighted average per student × class_subject × term
  const avg = useMemo(() => {
    const m = new Map<string, { sum: number; w: number }>();
    for (const g of grades) {
      const k = `${g.student_id}|${g.class_subject_id}|${g.term_id}`;
      const cur = m.get(k) ?? { sum: 0, w: 0 };
      cur.sum += Number(g.score) * Number(g.weight); cur.w += Number(g.weight);
      m.set(k, cur);
    }
    return m;
  }, [grades]);
  const fmt = (v: number | null) => v == null ? "—" : v.toFixed(1);

  return (
    <div className="bg-white text-black p-6 rounded-lg border print:border-0 print:p-0">
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } body { background: white; } }`}</style>
      <div className="text-center mb-4">
        <div className="text-lg font-bold uppercase">{klass.schools?.name}</div>
        <div className="text-xl font-bold">REKAP NILAI SISWA</div>
        <div className="text-sm">Kelas {klass.name} (Tingkat {klass.grade_level}) • Tahun Ajaran {klass.academic_years?.name}</div>
        <div className="text-xs text-muted-foreground">Wali Kelas: {klass.staff?.full_name ?? "—"}</div>
      </div>
      {terms.map((t: any) => (
        <div key={t.id} className="mb-6 break-inside-avoid">
          <div className="font-semibold text-sm mb-1">Semester: {t.name}</div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left w-8">No</th>
                <th className="border px-2 py-1 text-left w-24">NISN</th>
                <th className="border px-2 py-1 text-left">Nama Siswa</th>
                {class_subjects.map((cs: any) => (
                  <th key={cs.id} className="border px-2 py-1 text-center" title={`KKM ${cs.subjects?.kkm}`}>
                    {cs.subjects?.code || cs.subjects?.name}
                  </th>
                ))}
                <th className="border px-2 py-1 text-center">Rata²</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr><td colSpan={4 + class_subjects.length} className="border px-2 py-3 text-center text-muted-foreground">Tidak ada siswa.</td></tr>
              )}
              {students.map((s: any, i: number) => {
                const scores = class_subjects.map((cs: any) => {
                  const v = avg.get(`${s.id}|${cs.id}|${t.id}`);
                  return v && v.w > 0 ? v.sum / v.w : null;
                });
                const present = scores.filter((x: number | null) => x != null) as number[];
                const overall = present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
                return (
                  <tr key={s.id}>
                    <td className="border px-2 py-1">{s.roll_number ?? i + 1}</td>
                    <td className="border px-2 py-1 font-mono">{s.nisn ?? "—"}</td>
                    <td className="border px-2 py-1">{s.full_name}</td>
                    {scores.map((v: number | null, j: number) => {
                      const kkm = class_subjects[j].subjects?.kkm ?? 70;
                      const below = v != null && v < kkm;
                      return <td key={j} className={`border px-2 py-1 text-center ${below ? "text-red-600 font-semibold" : ""}`}>{fmt(v)}</td>;
                    })}
                    <td className="border px-2 py-1 text-center font-semibold">{fmt(overall)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-4 mt-8 text-xs">
        <div></div>
        <div className="text-center">
          <div>Mengetahui,</div>
          <div className="mb-12">Wali Kelas</div>
          <div className="border-t pt-1">{klass.staff?.full_name ?? "( ......................... )"}</div>
        </div>
      </div>
    </div>
  );
}
