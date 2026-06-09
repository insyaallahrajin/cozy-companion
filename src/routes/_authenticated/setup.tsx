import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listFoundations, upsertFoundation, listSchools, upsertSchool,
} from "@/lib/admin.functions";
import { upsertAcademicYear, upsertTerm } from "@/lib/academic.functions";
import { seedDemoData } from "@/lib/seed.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Sparkles, Building2, School, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { useActiveSchool } from "@/hooks/use-active-school";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({ meta: [{ title: "Setup Awal — SIMAT" }] }),
  component: SetupWizard,
});

const LEVELS = ["TK","SD","SMP","SMA","SMK","PESANTREN","OTHER"] as const;

function SetupWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { setSchoolId } = useActiveSchool();
  const [step, setStep] = useState(1);
  const [foundationId, setFoundationId] = useState<string | null>(null);
  const [schoolId, setLocalSchoolId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);

  const fetchFoundations = useServerFn(listFoundations);
  const fetchSchools = useServerFn(listSchools);
  const foundations = useQuery({ queryKey: ["foundations"], queryFn: () => fetchFoundations() });
  const schools = useQuery({ queryKey: ["schools"], queryFn: () => fetchSchools(), enabled: !!foundationId });

  // Foundation form
  const [fName, setFName] = useState("");
  const [fCode, setFCode] = useState("");
  const [fCity, setFCity] = useState("");
  const upF = useServerFn(upsertFoundation);
  const createFoundation = useMutation({
    mutationFn: () => upF({ data: { code: fCode, name: fName, city: fCity, status: "ACTIVE" } }),
    onSuccess: async () => {
      toast.success("Yayasan dibuat");
      const res = await qc.fetchQuery({ queryKey: ["foundations"], queryFn: () => fetchFoundations() });
      const found = res.find((f) => f.code === fCode);
      if (found) setFoundationId(found.id);
      setStep(2);
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  // School form
  const [sName, setSName] = useState("");
  const [sCode, setSCode] = useState("");
  const [sLevel, setSLevel] = useState<typeof LEVELS[number]>("SMP");
  const [sNpsn, setSNpsn] = useState("");
  const upS = useServerFn(upsertSchool);
  const createSchool = useMutation({
    mutationFn: () => upS({ data: { foundation_id: foundationId!, code: sCode, name: sName, level: sLevel, npsn: sNpsn, status: "ACTIVE" } }),
    onSuccess: async () => {
      toast.success("Sekolah dibuat");
      const res = await qc.fetchQuery({ queryKey: ["schools"], queryFn: () => fetchSchools() });
      const found = res.find((s) => s.code === sCode && s.foundation_id === foundationId);
      if (found) { setLocalSchoolId(found.id); setSchoolId(found.id); }
      setStep(3);
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  // Year + terms
  const [yName, setYName] = useState("2025/2026");
  const [yStart, setYStart] = useState("2025-07-15");
  const [yEnd, setYEnd] = useState("2026-06-30");
  const upY = useServerFn(upsertAcademicYear);
  const upT = useServerFn(upsertTerm);
  const createYear = useMutation({
    mutationFn: async () => {
      await upY({ data: { school_id: schoolId!, name: yName, start_date: yStart, end_date: yEnd, is_active: true } });
      // we don't have id back; fetch
      const { listAcademicYears } = await import("@/lib/academic.functions");
      const years = await listAcademicYears({ data: { school_id: schoolId! } });
      const found = years.find((y) => y.name === yName);
      if (!found) throw new Error("Tahun ajaran tidak ditemukan");
      setAcademicYearId(found.id);
      await upT({ data: { academic_year_id: found.id, name: "Semester Ganjil", ordinal: 1, start_date: yStart, end_date: "2025-12-20", is_active: true } });
      await upT({ data: { academic_year_id: found.id, name: "Semester Genap", ordinal: 2, start_date: "2026-01-05", end_date: yEnd, is_active: false } });
    },
    onSuccess: () => { toast.success("Tahun ajaran & semester dibuat"); setStep(4); },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  const seed = useServerFn(seedDemoData);
  const seedMut = useMutation({
    mutationFn: () => seed(),
    onSuccess: (r) => {
      toast.success("Data demo dimuat", { description: `${r.students_created} siswa baru dibuat` });
      if (r.school_id) setSchoolId(r.school_id);
      navigate({ to: "/akademik/siswa" });
    },
    onError: (e: Error) => toast.error("Gagal seed", { description: e.message }),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Setup Awal SIMAT</h1>
        <p className="text-muted-foreground">Buat yayasan, sekolah, dan tahun ajaran dalam beberapa langkah, atau muat data demo siap pakai.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Jalan Pintas: Data Demo</CardTitle>
          <CardDescription>Membuat Yayasan At-Tauhid + SMP At-Tauhid + Tahun Ajaran 2025/2026 + 9 mapel + 8 guru + 4 kelas + 40 siswa (dengan orang tua) sekaligus.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => seedMut.mutate({})} disabled={seedMut.isPending} variant="default">
            {seedMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Muat Data Demo Sekarang
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center text-sm text-muted-foreground py-1">— atau setup manual —</div>

      <div className="flex items-center gap-2 text-sm">
        {[
          { n: 1, label: "Yayasan", icon: Building2 },
          { n: 2, label: "Sekolah", icon: School },
          { n: 3, label: "Tahun Ajaran", icon: CalendarDays },
          { n: 4, label: "Selesai", icon: Check },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <Badge variant={step >= s.n ? "default" : "outline"} className="h-7 w-7 rounded-full grid place-items-center p-0">
              {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}
            </Badge>
            <span className={step >= s.n ? "font-medium" : "text-muted-foreground"}>{s.label}</span>
            {i < 3 && <div className="w-8 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>1. Buat Yayasan</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(foundations.data ?? []).length > 0 && (
              <div className="space-y-2">
                <Label>Atau pilih yayasan yang sudah ada</Label>
                <Select value={foundationId ?? ""} onValueChange={(v) => { setFoundationId(v); setStep(2); }}>
                  <SelectTrigger><SelectValue placeholder="Pilih yayasan..." /></SelectTrigger>
                  <SelectContent>
                    {(foundations.data ?? []).map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name} ({f.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">— atau isi form di bawah untuk membuat baru —</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kode *</Label><Input value={fCode} onChange={(e) => setFCode(e.target.value)} placeholder="YAT" /></div>
              <div><Label>Nama *</Label><Input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Yayasan At-Tauhid" /></div>
              <div className="col-span-2"><Label>Kota</Label><Input value={fCity} onChange={(e) => setFCity(e.target.value)} placeholder="Bandung" /></div>
            </div>
            <Button onClick={() => createFoundation.mutate({})} disabled={!fName || !fCode || createFoundation.isPending}>
              {createFoundation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Buat Yayasan & Lanjut
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && foundationId && (
        <Card>
          <CardHeader><CardTitle>2. Buat Sekolah</CardTitle><CardDescription>di bawah yayasan terpilih</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kode *</Label><Input value={sCode} onChange={(e) => setSCode(e.target.value)} placeholder="SMPAT" /></div>
              <div><Label>Nama *</Label><Input value={sName} onChange={(e) => setSName(e.target.value)} placeholder="SMP At-Tauhid" /></div>
              <div><Label>Jenjang *</Label>
                <Select value={sLevel} onValueChange={(v) => setSLevel(v as typeof LEVELS[number])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>NPSN</Label><Input value={sNpsn} onChange={(e) => setSNpsn(e.target.value)} /></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Kembali</Button>
              <Button onClick={() => createSchool.mutate({})} disabled={!sName || !sCode || createSchool.isPending}>
                {createSchool.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Buat Sekolah & Lanjut
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && schoolId && (
        <Card>
          <CardHeader><CardTitle>3. Tahun Ajaran Pertama</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Nama *</Label><Input value={yName} onChange={(e) => setYName(e.target.value)} /></div>
              <div><Label>Mulai *</Label><Input type="date" value={yStart} onChange={(e) => setYStart(e.target.value)} /></div>
              <div><Label>Selesai *</Label><Input type="date" value={yEnd} onChange={(e) => setYEnd(e.target.value)} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Dua semester (Ganjil & Genap) akan dibuat otomatis.</p>
            <Button onClick={() => createYear.mutate({})} disabled={createYear.isPending}>
              {createYear.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Buat & Selesai
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Setup Selesai</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Sekarang Anda dapat menambah mata pelajaran, guru, kelas, dan siswa.</p>
            <div className="flex gap-2">
              <Button onClick={() => navigate({ to: "/akademik/mata-pelajaran" })}>Mata Pelajaran</Button>
              <Button variant="outline" onClick={() => navigate({ to: "/akademik/guru" })}>Guru</Button>
              <Button variant="outline" onClick={() => navigate({ to: "/akademik/kelas" })}>Kelas</Button>
              <Button variant="outline" onClick={() => navigate({ to: "/akademik/siswa" })}>Siswa</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
