import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listUsers,
  assignRole,
  revokeRole,
  listSchools,
  setSchoolAccess,
} from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings2, X, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/roles";
import type { AppRole } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated/sistem/pengguna")({
  head: () => ({ meta: [{ title: "Pengguna & Peran — SIMAT" }] }),
  component: UsersPage,
});

const ALL_ROLES: AppRole[] = [
  "SUPERADMIN","FOUNDATION_ADMIN","PRINCIPAL","FINANCE","ACCOUNTING",
  "ADMIN_STAFF","HR","TEACHER","HOMEROOM_TEACHER","LIBRARIAN",
  "STUDENT","PARENT","AUDITOR",
];

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string;
  roles: { role: AppRole; school_id: string | null }[];
  schools: string[];
};

function UsersPage() {
  const fetchUsers = useServerFn(listUsers);
  const q = useQuery<UserRow[]>({ queryKey: ["users"], queryFn: () => fetchUsers() as never });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengguna & Peran</h1>
        <p className="text-muted-foreground">
          Atur peran (role) dan akses sekolah untuk setiap pengguna.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>Daftar Pengguna</CardTitle></CardHeader>
        <CardContent>
          {q.isLoading ? (
            <div className="py-12 grid place-items-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Akses Sekolah</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(q.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Belum ada pengguna.
                    </TableCell>
                  </TableRow>
                )}
                {(q.data ?? []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.full_name ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 && (
                          <span className="text-xs text-muted-foreground">Tidak ada</span>
                        )}
                        {u.roles.map((r, i) => (
                          <Badge
                            key={i}
                            variant={r.role === "SUPERADMIN" ? "default" : "outline"}
                            className="gap-1"
                          >
                            {r.role === "SUPERADMIN" && <ShieldCheck className="h-3 w-3" />}
                            {ROLE_LABELS[r.role]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.schools.length} sekolah
                    </TableCell>
                    <TableCell className="text-right">
                      <ManageUserDialog user={u} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ManageUserDialog({ user }: { user: UserRow }) {
  const [open, setOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<AppRole | "">("");
  const qc = useQueryClient();
  const fetchSchools = useServerFn(listSchools);
  const schools = useQuery({
    queryKey: ["schools"],
    queryFn: () => fetchSchools(),
    enabled: open,
  });

  const assign = useServerFn(assignRole);
  const revoke = useServerFn(revokeRole);
  const access = useServerFn(setSchoolAccess);

  const refresh = () => qc.invalidateQueries({ queryKey: ["users"] });

  const assignMut = useMutation({
    mutationFn: (role: AppRole) => assign({ data: { user_id: user.id, role } }),
    onSuccess: () => { toast.success("Peran ditambahkan"); refresh(); setPendingRole(""); },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });
  const revokeMut = useMutation({
    mutationFn: ({ role, school_id }: { role: AppRole; school_id: string | null }) =>
      revoke({ data: { user_id: user.id, role, school_id } }),
    onSuccess: () => { toast.success("Peran dicabut"); refresh(); },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });
  const accessMut = useMutation({
    mutationFn: (ids: string[]) => access({ data: { user_id: user.id, school_ids: ids } }),
    onSuccess: () => { toast.success("Akses sekolah disimpan"); refresh(); },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  const [selected, setSelected] = useState<string[]>(user.schools);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setSelected(user.schools); }}>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <Settings2 className="h-4 w-4" />
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{user.full_name ?? user.email}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="mb-2 block">Peran aktif</Label>
            <div className="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">
              {user.roles.length === 0 && (
                <span className="text-xs text-muted-foreground">Belum ada peran.</span>
              )}
              {user.roles.map((r, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {ROLE_LABELS[r.role]}
                  <button
                    onClick={() => revokeMut.mutate({ role: r.role, school_id: r.school_id })}
                    className="ml-1 hover:text-destructive"
                    aria-label="Cabut"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={pendingRole} onValueChange={(v) => setPendingRole(v as AppRole)}>
                <SelectTrigger><SelectValue placeholder="Pilih peran untuk ditambahkan..." /></SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.filter((r) => !user.roles.some((ur) => ur.role === r && !ur.school_id)).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => pendingRole && assignMut.mutate(pendingRole)}
                disabled={!pendingRole || assignMut.isPending}
              >
                Tambah
              </Button>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Akses sekolah</Label>
            <div className="border rounded-md max-h-48 overflow-auto divide-y">
              {schools.isLoading && (
                <div className="p-4 text-sm text-muted-foreground">Memuat...</div>
              )}
              {(schools.data ?? []).length === 0 && !schools.isLoading && (
                <div className="p-4 text-sm text-muted-foreground">Belum ada sekolah.</div>
              )}
              {(schools.data ?? []).map((s: { id: string; name: string; code: string }) => (
                <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer">
                  <Checkbox
                    checked={selected.includes(s.id)}
                    onCheckedChange={(c) =>
                      setSelected((prev) => (c ? [...prev, s.id] : prev.filter((x) => x !== s.id)))
                    }
                  />
                  <span className="text-sm flex-1">{s.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{s.code}</span>
                </label>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => accessMut.mutate(selected)}
              disabled={accessMut.isPending}
            >
              {accessMut.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Simpan akses
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
