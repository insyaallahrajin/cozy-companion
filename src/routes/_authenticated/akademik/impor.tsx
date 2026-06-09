import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  bulkImportStudents, bulkImportClasses,
  listAcademicYears,
} from "@/lib/academic.functions";
import { listSchools } from "@/lib/admin.functions";
import { RequireActiveSchool } from "@/components/require-active-school";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/akademik/impor")({
  head: () => ({ meta: [{ title: "Impor Data — SIMAT" }] }),
  component: () => <RequireActiveSchool>{(s) => <Page schoolId={s} />}</RequireActiveSchool>,
});

const STUDENT_HEADERS = [
  "nisn","nis","full_name","gender","birth_place","birth_date","religion",
  "phone","address","class_name","parent_name","parent_relation","parent_phone",
];
const STUDENT_TEMPLATE =
  STUDENT_HEADERS.join(",") + "\n" +
  "1234567890,001,Budi Santoso,L,Jakarta,2010-05-12,ISLAM,081200000001,Jl. Mawar 1,7A,Ahmad Santoso,AYAH,081200000010\n" +
  ",002,Siti Aminah,P,Bandung,2010-08-20,ISLAM,,,7A,Halimah,IBU,\n";

const CLASS_HEADERS = ["grade_level","name","capacity","room","homeroom_teacher_name"];
const CLASS_TEMPLATE =
  CLASS_HEADERS.join(",") + "\n" +
  "7,7A,32,R-101,Pak Hasan\n" +
  "7,7B,32,R-102,\n" +
  "8,8A,30,R-201,Bu Sari\n";

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const parse = (line: string) => {
    const out: string[] = []; let cur = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else {
        if (c === '"') q = true;
        else if (c === ',') { out.push(cur); cur = ""; }
        else cur += c;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = parse(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map(parse);
  return { headers, rows };
}

function downloadCSV(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function Page({ schoolId }: { schoolId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Impor Data (CSV)</h1>
        <p className="text-muted-foreground">Tempel atau unggah CSV untuk menambah Siswa atau Kelas secara massal.</p>
      </div>
      <Tabs defaultValue="siswa">
        <TabsList>
          <TabsTrigger value="siswa">Siswa</TabsTrigger>
          <TabsTrigger value="kelas">Kelas</TabsTrigger>
        </TabsList>
        <TabsContent value="siswa"><StudentImport schoolId={schoolId} /></TabsContent>
        <TabsContent value="kelas"><ClassImport schoolId={schoolId} /></TabsContent>
      </Tabs>
    </div>
  );
}

function CSVEditor({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  return (
    <Textarea rows={10} value={value} onChange={(e) => onChange(e.target.value)}
      className="font-mono text-xs" placeholder="header1,header2,...&#10;val1,val2,..." />
  );
}

function StudentImport({ schoolId }: { schoolId: string }) {
  const fetchSchools = useServerFn(listSchools);
  const schoolsQ = useQuery({ queryKey: ["schools-all"], queryFn: () => fetchSchools() });
  const school = (schoolsQ.data ?? []).find((s: any) => s.id === schoolId);
  const fetchYears = useServerFn(listAcademicYears);
  const years = useQuery({ queryKey: ["years", schoolId], queryFn: () => fetchYears({ data: { school_id: schoolId } }) });
  const [yearId, setYearId] = useState("");
  const effYear = yearId || years.data?.find((y: any) => y.is_active)?.id || "";
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<{ inserted: number; errors: { row: number; message: string }[] } | null>(null);

  const parsed = useMemo(() => {
    if (!csv.trim()) return null;
    const { headers, rows } = parseCSV(csv);
    const missing = ["full_name","gender"].filter((h) => !headers.includes(h));
    const out: any[] = []; const issues: string[] = [];
    if (missing.length) issues.push(`Header wajib hilang: ${missing.join(", ")}`);
    rows.forEach((row, i) => {
      const obj: any = {};
      headers.forEach((h, j) => { obj[h] = row[j] ?? ""; });
      if (!obj.full_name) issues.push(`Baris ${i+1}: full_name kosong`);
      if (!["L","P"].includes(obj.gender)) issues.push(`Baris ${i+1}: gender harus L atau P`);
      out.push(obj);
    });
    return { rows: out, issues };
  }, [csv]);

  const fn = useServerFn(bulkImportStudents);
  const m = useMutation({
    mutationFn: () => fn({ data: {
      school_id: schoolId,
      foundation_id: school!.foundation_id,
      academic_year_id: effYear || null,
      rows: parsed!.rows,
    } }),
    onSuccess: (r) => { setResult(r); toast.success(`${r.inserted} siswa diimpor`); },
    onError: (e: Error) => toast.error("Gagal impor", { description: e.message }),
  });

  return (
    <Card>
      <CardHeader><CardTitle>Impor Siswa</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Sekolah</Label><div className="text-sm py-2">{school?.name ?? "—"}</div></div>
          <div><Label>Tahun Ajaran (untuk enrol kelas)</Label>
            <Select value={effYear} onValueChange={setYearId}>
              <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
              <SelectContent>{(years.data ?? []).map((y: any) => <SelectItem key={y.id} value={y.id}>{y.name}{y.is_active && " (aktif)"}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={() => downloadCSV("template-siswa.csv", STUDENT_TEMPLATE)}>
              <Download className="h-4 w-4 mr-1" />Template CSV
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Header: <code className="font-mono">{STUDENT_HEADERS.join(", ")}</code><br />
          <code>full_name</code> & <code>gender</code> (L/P) wajib. <code>class_name</code> harus persis sama dgn nama kelas yg sudah ada pada Tahun Ajaran terpilih.
        </div>
        <div>
          <Label>Data CSV</Label>
          <CSVEditor value={csv} onChange={setCsv} />
        </div>
        {parsed && parsed.issues.length > 0 && (
          <Alert variant="destructive"><AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">Periksa data:</div>
              <ul className="list-disc pl-4 text-xs">{parsed.issues.slice(0, 8).map((i, k) => <li key={k}>{i}</li>)}</ul>
              {parsed.issues.length > 8 && <div className="text-xs">+{parsed.issues.length - 8} lagi</div>}
            </AlertDescription>
          </Alert>
        )}
        {parsed && parsed.issues.length === 0 && (
          <Alert><CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Siap impor: {parsed.rows.length} baris.</AlertDescription>
          </Alert>
        )}
        <div className="flex justify-end gap-2">
          <Button disabled={!parsed || parsed.issues.length > 0 || m.isPending || !school} onClick={() => m.mutate()}>
            {m.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Impor {parsed?.rows.length ?? 0} siswa
          </Button>
        </div>
        {result && (
          <Alert>
            <AlertDescription>
              Berhasil: <b>{result.inserted}</b>. Gagal: <b>{result.errors.length}</b>.
              {result.errors.length > 0 && (
                <ul className="list-disc pl-4 text-xs mt-2">
                  {result.errors.slice(0, 10).map((e, k) => <li key={k}>Baris {e.row}: {e.message}</li>)}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function ClassImport({ schoolId }: { schoolId: string }) {
  const fetchYears = useServerFn(listAcademicYears);
  const years = useQuery({ queryKey: ["years", schoolId], queryFn: () => fetchYears({ data: { school_id: schoolId } }) });
  const [yearId, setYearId] = useState("");
  const effYear = yearId || years.data?.find((y: any) => y.is_active)?.id || "";
  const [csv, setCsv] = useState("");
  const [done, setDone] = useState<number | null>(null);

  const parsed = useMemo(() => {
    if (!csv.trim()) return null;
    const { headers, rows } = parseCSV(csv);
    const missing = ["grade_level","name"].filter((h) => !headers.includes(h));
    const out: any[] = []; const issues: string[] = [];
    if (missing.length) issues.push(`Header wajib hilang: ${missing.join(", ")}`);
    rows.forEach((row, i) => {
      const obj: any = {};
      headers.forEach((h, j) => { obj[h] = row[j] ?? ""; });
      const grade = parseInt(obj.grade_level);
      if (isNaN(grade) || grade < 1) issues.push(`Baris ${i+1}: grade_level tidak valid`);
      if (!obj.name) issues.push(`Baris ${i+1}: name kosong`);
      out.push({
        grade_level: grade,
        name: obj.name,
        capacity: obj.capacity ? parseInt(obj.capacity) : 32,
        room: obj.room || null,
        homeroom_teacher_name: obj.homeroom_teacher_name || null,
      });
    });
    return { rows: out, issues };
  }, [csv]);

  const fn = useServerFn(bulkImportClasses);
  const m = useMutation({
    mutationFn: () => fn({ data: { school_id: schoolId, academic_year_id: effYear, rows: parsed!.rows } }),
    onSuccess: (r) => { setDone(r.inserted); toast.success(`${r.inserted} kelas dibuat`); },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  return (
    <Card>
      <CardHeader><CardTitle>Impor Kelas</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Tahun Ajaran *</Label>
            <Select value={effYear} onValueChange={setYearId}>
              <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
              <SelectContent>{(years.data ?? []).map((y: any) => <SelectItem key={y.id} value={y.id}>{y.name}{y.is_active && " (aktif)"}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex items-end">
            <Button variant="outline" size="sm" onClick={() => downloadCSV("template-kelas.csv", CLASS_TEMPLATE)}>
              <Download className="h-4 w-4 mr-1" />Template CSV
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Header: <code className="font-mono">{CLASS_HEADERS.join(", ")}</code><br />
          <code>homeroom_teacher_name</code> harus cocok dgn nama guru yang sudah terdaftar; jika tidak cocok, dibiarkan kosong.
        </div>
        <div><Label>Data CSV</Label><CSVEditor value={csv} onChange={setCsv} /></div>
        {parsed && parsed.issues.length > 0 && (
          <Alert variant="destructive"><AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-4 text-xs">{parsed.issues.slice(0, 8).map((i, k) => <li key={k}>{i}</li>)}</ul>
            </AlertDescription>
          </Alert>
        )}
        {parsed && parsed.issues.length === 0 && (
          <Alert><CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Siap impor: {parsed.rows.length} kelas.</AlertDescription>
          </Alert>
        )}
        <div className="flex justify-end">
          <Button disabled={!parsed || parsed.issues.length > 0 || !effYear || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Impor {parsed?.rows.length ?? 0} kelas
          </Button>
        </div>
        {done !== null && <Alert><AlertDescription>Berhasil membuat {done} kelas.</AlertDescription></Alert>}
      </CardContent>
    </Card>
  );
}
