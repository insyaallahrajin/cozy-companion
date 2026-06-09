import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listStudents, enrollStudent, deleteStudent,
  listClasses, listAcademicYears,
} from "@/lib/academic.functions";
import { listSchools } from "@/lib/admin.functions";
import { RequireActiveSchool } from "@/components/require-active-school";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/akademik/siswa")({
  head: () => ({ meta: [{ title: "Siswa — SIMAT" }] }),
  component: () => <RequireActiveSchool>{(s) => <Page schoolId={s} />}</RequireActiveSchool>,
});

function Page({ schoolId }: { schoolId: string }) {
  const fetch = useServerFn(listStudents);
  const q = useQuery({ queryKey: ["students", schoolId], queryFn: () => fetch({ data: { school_id: schoolId } }) });
  const [search, setSearch] = useState("");
  const rows = (q.data ?? []).filter((s: any) =>
    !search || s.full_name?.toLowerCase().includes(search.toLowerCase())
      || s.nisn?.toLowerCase().includes(search.toLowerCase()) || s.nis?.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Siswa</h1><p className="text-muted-foreground">Daftar dan kelola siswa, lengkap dengan penempatan kelas & orang tua.</p></div>
        <EnrollDialog schoolId={schoolId} />
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Daftar Siswa</CardTitle>
            <Input placeholder="Cari nama / NISN / NIS..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          </div>
        </CardHeader>
        <CardContent>
          {q.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>NISN</TableHead><TableHead>NIS</TableHead><TableHead>Nama</TableHead>
                <TableHead>L/P</TableHead><TableHead>Kelas Aktif</TableHead>
                <TableHead>Status</TableHead><TableHead className="w-[60px]" />
              </TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada siswa.</TableCell></TableRow>}
                {rows.map((s: any) => {
                  const active = s.enrollments?.find((e: any) => e.status === "AKTIF");
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono">{s.nisn ?? "—"}</TableCell>
                      <TableCell className="font-mono">{s.nis ?? "—"}</TableCell>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell>{s.gender}</TableCell>
                      <TableCell>{active?.classes ? <Badge variant="outline">{active.classes.name}</Badge> : <span className="text-muted-foreground text-xs">Belum terdaftar</span>}</TableCell>
                      <TableCell><Badge>{s.status}</Badge></TableCell>
                      <TableCell><DelBtn id={s.id} schoolId={schoolId} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DelBtn({ id, schoolId }: { id: string; schoolId: string }) {
  const qc = useQueryClient(); const del = useServerFn(deleteStudent);
  const m = useMutation({ mutationFn: () => del({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["students", schoolId] }); } });
  return <Button size="icon" variant="ghost" onClick={() => confirm("Hapus siswa?") && m.mutate()}><Trash2 className="h-4 w-4" /></Button>;
}

const RELIGIONS = ["ISLAM","KRISTEN","KATOLIK","HINDU","BUDDHA","KONGHUCU","LAINNYA"] as const;

function EnrollDialog({ schoolId }: { schoolId: string }) {
  const [open, setOpen] = useState(false); const qc = useQueryClient();
  const fetchSchools = useServerFn(listSchools);
  const fetchYears = useServerFn(listAcademicYears);
  const fetchClasses = useServerFn(listClasses);
  const schoolsQ = useQuery({ queryKey: ["schools-all"], queryFn: () => fetchSchools(), enabled: open });
  const school = (schoolsQ.data ?? []).find((x: any) => x.id === schoolId);
  const years = useQuery({ queryKey: ["years", schoolId], queryFn: () => fetchYears({ data: { school_id: schoolId } }), enabled: open });
  const [yearId, setYearId] = useState("");
  const effYear = yearId || years.data?.find((y) => y.is_active)?.id || "";
  const classes = useQuery({
    queryKey: ["classes", schoolId, effYear],
    queryFn: () => fetchClasses({ data: { school_id: schoolId, academic_year_id: effYear } }),
    enabled: open && !!effYear,
  });

  const [s, setS] = useState({
    full_name: "", nick_name: "", nisn: "", nis: "",
    gender: "L" as "L"|"P", religion: "ISLAM" as typeof RELIGIONS[number],
    birth_place: "", birth_date: "", phone: "", email: "",
    address: "", city: "", province: "", notes: "",
  });
  const [classId, setClassId] = useState(""); const [roll, setRoll] = useState<number | "">("");
  const [p, setP] = useState({
    relation: "AYAH" as "AYAH"|"IBU"|"WALI", full_name: "", nik: "",
    occupation: "", phone: "", email: "", address: "", is_primary: true,
  });

  const fn = useServerFn(enrollStudent);
  const m = useMutation({
    mutationFn: () => fn({
      data: {
        student: { ...s, foundation_id: school!.foundation_id, school_id: schoolId },
        class_id: classId || null,
        academic_year_id: effYear || null,
        roll_number: typeof roll === "number" ? roll : null,
        parent: p.full_name ? p : null,
      },
    }),
    onSuccess: () => {
      toast.success("Siswa terdaftar");
      qc.invalidateQueries({ queryKey: ["students", schoolId] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><UserPlus className="h-4 w-4 mr-1" />Daftar Siswa</Button></DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Pendaftaran Siswa Baru</DialogTitle></DialogHeader>
        <div className="space-y-5">
          <div>
            <h3 className="font-semibold mb-2 text-sm">Identitas Siswa</h3>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>NISN</Label><Input value={s.nisn} onChange={(e) => setS({...s, nisn: e.target.value})} /></div>
              <div><Label>NIS</Label><Input value={s.nis} onChange={(e) => setS({...s, nis: e.target.value})} /></div>
              <div><Label>Jenis Kelamin *</Label>
                <Select value={s.gender} onValueChange={(v) => setS({...s, gender: v as "L"|"P"})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Nama Lengkap *</Label><Input value={s.full_name} onChange={(e) => setS({...s, full_name: e.target.value})} /></div>
              <div><Label>Panggilan</Label><Input value={s.nick_name} onChange={(e) => setS({...s, nick_name: e.target.value})} /></div>
              <div><Label>Tempat Lahir</Label><Input value={s.birth_place} onChange={(e) => setS({...s, birth_place: e.target.value})} /></div>
              <div><Label>Tanggal Lahir</Label><Input type="date" value={s.birth_date} onChange={(e) => setS({...s, birth_date: e.target.value})} /></div>
              <div><Label>Agama</Label>
                <Select value={s.religion} onValueChange={(v) => setS({...s, religion: v as typeof RELIGIONS[number]})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RELIGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-3"><Label>Alamat</Label><Textarea rows={2} value={s.address} onChange={(e) => setS({...s, address: e.target.value})} /></div>
              <div><Label>Kota</Label><Input value={s.city} onChange={(e) => setS({...s, city: e.target.value})} /></div>
              <div><Label>Provinsi</Label><Input value={s.province} onChange={(e) => setS({...s, province: e.target.value})} /></div>
              <div><Label>Telepon</Label><Input value={s.phone} onChange={(e) => setS({...s, phone: e.target.value})} /></div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-sm">Penempatan Kelas</h3>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Sekolah</Label><Input value={school?.name ?? ""} disabled /></div>
              <div><Label>Tahun Ajaran</Label>
                <Select value={effYear} onValueChange={setYearId}>
                  <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                  <SelectContent>{(years.data ?? []).map((y) => <SelectItem key={y.id} value={y.id}>{y.name}{y.is_active && " (aktif)"}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Kelas</Label>
                <Select value={classId} onValueChange={setClassId} disabled={!effYear}>
                  <SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
                  <SelectContent>{(classes.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} (Tingkat {c.grade_level})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>No. Absen</Label><Input type="number" value={roll} onChange={(e) => setRoll(e.target.value ? parseInt(e.target.value) : "")} /></div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-sm">Orang Tua / Wali</h3>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Relasi</Label>
                <Select value={p.relation} onValueChange={(v) => setP({...p, relation: v as "AYAH"|"IBU"|"WALI"})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="AYAH">Ayah</SelectItem><SelectItem value="IBU">Ibu</SelectItem><SelectItem value="WALI">Wali</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Nama Lengkap</Label><Input value={p.full_name} onChange={(e) => setP({...p, full_name: e.target.value})} /></div>
              <div><Label>NIK</Label><Input value={p.nik} onChange={(e) => setP({...p, nik: e.target.value})} /></div>
              <div><Label>Pekerjaan</Label><Input value={p.occupation} onChange={(e) => setP({...p, occupation: e.target.value})} /></div>
              <div><Label>Telepon</Label><Input value={p.phone} onChange={(e) => setP({...p, phone: e.target.value})} /></div>
              <div><Label>Email</Label><Input type="email" value={p.email} onChange={(e) => setP({...p, email: e.target.value})} /></div>
              <div className="col-span-2"><Label>Alamat</Label><Input value={p.address} onChange={(e) => setP({...p, address: e.target.value})} /></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Kosongkan jika belum mengisi data orang tua.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => m.mutate()} disabled={!s.full_name || m.isPending}>
            {m.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Simpan & Daftarkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
