import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listStaff, upsertStaff, deleteStaff } from "@/lib/academic.functions";
import { RequireActiveSchool } from "@/components/require-active-school";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/akademik/guru")({
  head: () => ({ meta: [{ title: "Guru & Pegawai — SIMAT" }] }),
  component: () => <RequireActiveSchool>{(s) => <Page schoolId={s} />}</RequireActiveSchool>,
});

const ETYPES = ["PNS","PPPK","TETAP_YAYASAN","HONORER","KONTRAK","MAGANG"] as const;

type Staff = {
  id: string; school_id: string; nip: string | null; full_name: string;
  gender: "L"|"P"|null; phone: string | null; email: string | null;
  employment_type: typeof ETYPES[number]; position: string | null;
  is_teacher: boolean; status: string;
};

function Page({ schoolId }: { schoolId: string }) {
  const fetch = useServerFn(listStaff);
  const q = useQuery({ queryKey: ["staff", schoolId], queryFn: () => fetch({ data: { school_id: schoolId } }) });
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Guru & Pegawai</h1><p className="text-muted-foreground">Kelola data guru dan pegawai sekolah.</p></div>
        <StaffDialog schoolId={schoolId} />
      </div>
      <Card><CardHeader><CardTitle>Daftar Pegawai</CardTitle></CardHeader><CardContent>
        {q.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>NIP</TableHead><TableHead>Nama</TableHead><TableHead>Jabatan</TableHead>
              <TableHead>Tipe</TableHead><TableHead>Guru?</TableHead><TableHead className="w-[100px]" />
            </TableRow></TableHeader>
            <TableBody>
              {(q.data ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada pegawai.</TableCell></TableRow>}
              {(q.data ?? []).map((s: Staff) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono">{s.nip ?? "—"}</TableCell>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell>{s.position ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{s.employment_type}</Badge></TableCell>
                  <TableCell>{s.is_teacher && <Badge>Guru</Badge>}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <StaffDialog schoolId={schoolId} staff={s} />
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
  const qc = useQueryClient(); const del = useServerFn(deleteStaff);
  const m = useMutation({ mutationFn: () => del({ data: { id } }), onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["staff", schoolId] }); } });
  return <Button size="icon" variant="ghost" onClick={() => confirm("Hapus?") && m.mutate()}><Trash2 className="h-4 w-4" /></Button>;
}

function StaffDialog({ schoolId, staff }: { schoolId: string; staff?: Staff }) {
  const [open, setOpen] = useState(false); const qc = useQueryClient();
  const [data, setData] = useState({
    nip: staff?.nip ?? "", full_name: staff?.full_name ?? "",
    gender: (staff?.gender ?? "L") as "L"|"P",
    phone: staff?.phone ?? "", email: staff?.email ?? "",
    position: staff?.position ?? "",
    employment_type: (staff?.employment_type ?? "TETAP_YAYASAN") as typeof ETYPES[number],
    is_teacher: staff?.is_teacher ?? true,
  });
  const fn = useServerFn(upsertStaff);
  const m = useMutation({
    mutationFn: () => fn({ data: { id: staff?.id, school_id: schoolId, ...data, status: "ACTIVE" } }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["staff", schoolId] }); setOpen(false); },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{staff ? <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button> : <Button><Plus className="h-4 w-4 mr-1" />Pegawai</Button>}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{staff ? "Ubah" : "Tambah"} Pegawai</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>NIP</Label><Input value={data.nip} onChange={(e) => setData({...data, nip: e.target.value})} /></div>
          <div><Label>Nama Lengkap *</Label><Input value={data.full_name} onChange={(e) => setData({...data, full_name: e.target.value})} /></div>
          <div><Label>Jenis Kelamin</Label>
            <Select value={data.gender} onValueChange={(v) => setData({...data, gender: v as "L"|"P"})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Jabatan</Label><Input value={data.position} onChange={(e) => setData({...data, position: e.target.value})} /></div>
          <div><Label>Telepon</Label><Input value={data.phone} onChange={(e) => setData({...data, phone: e.target.value})} /></div>
          <div><Label>Email</Label><Input type="email" value={data.email} onChange={(e) => setData({...data, email: e.target.value})} /></div>
          <div><Label>Jenis Kepegawaian</Label>
            <Select value={data.employment_type} onValueChange={(v) => setData({...data, employment_type: v as typeof ETYPES[number]})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ETYPES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2"><Switch checked={data.is_teacher} onCheckedChange={(v) => setData({...data, is_teacher: v})} /><Label>Tercatat sebagai guru</Label></div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button onClick={() => m.mutate()} disabled={!data.full_name || m.isPending}>Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
