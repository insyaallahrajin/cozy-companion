import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { GraduationCap, Users, Wallet, BookOpen, CalendarCheck, TrendingUp } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dasbor — SIMAT" }] }),
  component: DashboardPage,
});

const stats = [
  { label: "Total Siswa", value: "—", icon: GraduationCap, hint: "Aktif tahun ajaran berjalan" },
  { label: "Total Guru & Pegawai", value: "—", icon: Users, hint: "Termasuk staf yayasan" },
  { label: "Saldo Kas & Bank", value: "Rp —", icon: Wallet, hint: "Konsolidasi seluruh sekolah" },
  { label: "Rombongan Belajar", value: "—", icon: BookOpen, hint: "Kelas aktif" },
  { label: "Presensi Hari Ini", value: "—", icon: CalendarCheck, hint: "Rata-rata kehadiran" },
  { label: "Tagihan Tertunda", value: "Rp —", icon: TrendingUp, hint: "Outstanding SPP" },
];

function DashboardPage() {
  const { data: user, isLoading } = useCurrentUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Selamat datang{user?.profile?.full_name ? `, ${user.profile.full_name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          Ringkasan operasional Sistem Informasi Manajemen At-Tauhid (SIMAT).
        </p>
        {!isLoading && user && (
          <div className="mt-3 flex flex-wrap gap-2">
            {user.roles.length === 0 ? (
              <Badge variant="secondary">Belum ada peran ditetapkan</Badge>
            ) : (
              user.roles.map((r) => (
                <Badge key={r} variant="outline">
                  {ROLE_LABELS[r] ?? r}
                </Badge>
              ))
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modul tersedia</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Modul Akademik, Keuangan & Akuntansi, SDM/Payroll, PPDB, Perpustakaan,
          Aset, dan Pelaporan ISAK 35 / PSAK 118 akan ditambahkan secara
          bertahap pada iterasi berikutnya sesuai PRD SIMAT.
        </CardContent>
      </Card>
    </div>
  );
}
