import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listFoundations,
  upsertFoundation,
  deleteFoundation,
  listSchools,
  upsertSchool,
  deleteSchool,
} from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sistem/sekolah")({
  head: () => ({ meta: [{ title: "Yayasan & Sekolah — SIMAT" }] }),
  component: SchoolsPage,
});

const LEVELS = ["TK", "SD", "SMP", "SMA", "SMK", "PESANTREN", "OTHER"] as const;
const STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;

function SchoolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Yayasan & Sekolah</h1>
        <p className="text-muted-foreground">
          Kelola entitas yayasan dan unit sekolah yang berada di bawahnya.
        </p>
      </div>
      <Tabs defaultValue="foundations">
        <TabsList>
          <TabsTrigger value="foundations">Yayasan</TabsTrigger>
          <TabsTrigger value="schools">Sekolah</TabsTrigger>
        </TabsList>
        <TabsContent value="foundations" className="mt-4">
          <FoundationsTab />
        </TabsContent>
        <TabsContent value="schools" className="mt-4">
          <SchoolsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- FOUNDATIONS ---------------- */

function FoundationsTab() {
  const fetchFn = useServerFn(listFoundations);
  const q = useQuery({ queryKey: ["foundations"], queryFn: () => fetchFn() });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Daftar Yayasan</CardTitle>
        <FoundationDialog />
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <Loader />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Belum ada yayasan. Klik "Tambah Yayasan" untuk membuat.
                  </TableCell>
                </TableRow>
              )}
              {(q.data ?? []).map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.code}</TableCell>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell>{f.city ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={f.status === "ACTIVE" ? "default" : "secondary"}>
                      {f.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <FoundationDialog initial={f} />
                    <DeleteFoundationButton id={f.id} name={f.name} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function FoundationDialog({ initial }: { initial?: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const editing = !!initial?.id;
  const qc = useQueryClient();
  const upsert = useServerFn(upsertFoundation);
  const mut = useMutation({
    mutationFn: (data: Record<string, unknown>) => upsert({ data: data as never }),
    onSuccess: () => {
      toast.success(editing ? "Yayasan diperbarui" : "Yayasan ditambahkan");
      qc.invalidateQueries({ queryKey: ["foundations"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><Plus className="h-4 w-4 mr-1" />Tambah Yayasan</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Ubah Yayasan" : "Tambah Yayasan"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const payload: Record<string, unknown> = Object.fromEntries(fd);
            if (editing) payload.id = initial!.id;
            mut.mutate(payload);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kode *" name="code" defaultValue={initial?.code as string} required />
            <Field label="Status" name="status" type="select" options={STATUSES} defaultValue={(initial?.status as string) ?? "ACTIVE"} />
          </div>
          <Field label="Nama *" name="name" defaultValue={initial?.name as string} required />
          <Field label="Nama Legal" name="legal_name" defaultValue={initial?.legal_name as string} />
          <Field label="Alamat" name="address" defaultValue={initial?.address as string} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kota" name="city" defaultValue={initial?.city as string} />
            <Field label="Provinsi" name="province" defaultValue={initial?.province as string} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telepon" name="phone" defaultValue={initial?.phone as string} />
            <Field label="Email" name="email" type="email" defaultValue={initial?.email as string} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Website" name="website" defaultValue={initial?.website as string} />
            <Field label="NPWP" name="npwp" defaultValue={initial?.npwp as string} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteFoundationButton({ id, name }: { id: string; name: string }) {
  const qc = useQueryClient();
  const del = useServerFn(deleteFoundation);
  const mut = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Yayasan dihapus");
      qc.invalidateQueries({ queryKey: ["foundations"] });
    },
    onError: (e: Error) => toast.error("Gagal menghapus", { description: e.message }),
  });
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        if (confirm(`Hapus yayasan "${name}"? Semua sekolah dan data terkait akan ikut terhapus.`))
          mut.mutate();
      }}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}

/* ---------------- SCHOOLS ---------------- */

function SchoolsTab() {
  const fetchFn = useServerFn(listSchools);
  const q = useQuery({ queryKey: ["schools"], queryFn: () => fetchFn() });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Daftar Sekolah</CardTitle>
        <SchoolDialog />
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <Loader />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Jenjang</TableHead>
                <TableHead>Yayasan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Belum ada sekolah. Pastikan ada yayasan terlebih dulu.
                  </TableCell>
                </TableRow>
              )}
              {(q.data ?? []).map((s: Record<string, unknown> & { foundations?: { name: string } }) => (
                <TableRow key={s.id as string}>
                  <TableCell className="font-mono text-xs">{s.code as string}</TableCell>
                  <TableCell className="font-medium">{s.name as string}</TableCell>
                  <TableCell><Badge variant="outline">{s.level as string}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{s.foundations?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "ACTIVE" ? "default" : "secondary"}>
                      {s.status as string}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <SchoolDialog initial={s} />
                    <DeleteSchoolButton id={s.id as string} name={s.name as string} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function SchoolDialog({ initial }: { initial?: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const editing = !!initial?.id;
  const qc = useQueryClient();
  const fetchFoundations = useServerFn(listFoundations);
  const foundations = useQuery({
    queryKey: ["foundations"],
    queryFn: () => fetchFoundations(),
    enabled: open,
  });

  const upsert = useServerFn(upsertSchool);
  const mut = useMutation({
    mutationFn: (d: Record<string, unknown>) => upsert({ data: d as never }),
    onSuccess: () => {
      toast.success(editing ? "Sekolah diperbarui" : "Sekolah ditambahkan");
      qc.invalidateQueries({ queryKey: ["schools"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><Plus className="h-4 w-4 mr-1" />Tambah Sekolah</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Ubah Sekolah" : "Tambah Sekolah"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const payload: Record<string, unknown> = Object.fromEntries(fd);
            if (editing) payload.id = initial!.id;
            mut.mutate(payload);
          }}
          className="space-y-3"
        >
          <Field
            label="Yayasan *"
            name="foundation_id"
            type="select"
            required
            defaultValue={initial?.foundation_id as string}
            options={(foundations.data ?? []).map((f) => ({ value: f.id, label: f.name }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kode *" name="code" defaultValue={initial?.code as string} required />
            <Field
              label="Jenjang *"
              name="level"
              type="select"
              options={LEVELS}
              defaultValue={(initial?.level as string) ?? "OTHER"}
              required
            />
          </div>
          <Field label="Nama *" name="name" defaultValue={initial?.name as string} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="NPSN" name="npsn" defaultValue={initial?.npsn as string} />
            <Field
              label="Status"
              name="status"
              type="select"
              options={STATUSES}
              defaultValue={(initial?.status as string) ?? "ACTIVE"}
            />
          </div>
          <Field label="Alamat" name="address" defaultValue={initial?.address as string} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kota" name="city" defaultValue={initial?.city as string} />
            <Field label="Provinsi" name="province" defaultValue={initial?.province as string} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telepon" name="phone" defaultValue={initial?.phone as string} />
            <Field label="Email" name="email" type="email" defaultValue={initial?.email as string} />
          </div>
          <Field label="Nama Kepala Sekolah" name="principal_name" defaultValue={initial?.principal_name as string} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSchoolButton({ id, name }: { id: string; name: string }) {
  const qc = useQueryClient();
  const del = useServerFn(deleteSchool);
  const mut = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Sekolah dihapus");
      qc.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (e: Error) => toast.error("Gagal menghapus", { description: e.message }),
  });
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => { if (confirm(`Hapus sekolah "${name}"?`)) mut.mutate(); }}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}

/* ---------------- shared ---------------- */

function Loader() {
  return (
    <div className="py-12 grid place-items-center text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: "text" | "email" | "select";
  required?: boolean;
  defaultValue?: string;
  options?: readonly string[] | { value: string; label: string }[];
};

function Field({ label, name, type = "text", required, defaultValue, options }: FieldProps) {
  const id = useMemo(() => `f-${name}-${Math.random().toString(36).slice(2, 8)}`, [name]);
  if (type === "select") {
    const opts = (options ?? []).map((o) =>
      typeof o === "string" ? { value: o, label: o } : o,
    );
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Select name={name} defaultValue={defaultValue} required={required}>
          <SelectTrigger id={id}><SelectValue placeholder="Pilih..." /></SelectTrigger>
          <SelectContent>
            {opts.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} required={required} defaultValue={defaultValue ?? ""} />
    </div>
  );
}
