import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { GraduationCap, Users, Wallet, BookOpen, CalendarCheck, TrendingUp } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { useActiveSchool } from "@/hooks/use-active-school";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/lib/finance.functions";
import { formatRupiah } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dasbor — SIMAT" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: user, isLoading } = useCurrentUser();
  const { schoolId } = useActiveSchool();
  const fetch = useServerFn(getDashboardStats);
  const stats = useQuery({
    queryKey: ["dashboard-stats", schoolId],
    queryFn: () => fetch({ data: { school_id: schoolId! } }),
    enabled: !!schoolId,
  });
  const s = stats.data;

  const cards = [
    { label: "Total Siswa", value: s ? String(s.studentsCount) : "—", icon: GraduationCap, hint: "Berstatus aktif" },
    { label: "Total Guru & Pegawai", value: s ? String(s.staffCount) : "—", icon: Users, hint: "Staf aktif" },
    { label: "Saldo Kas & Bank", value: s ? formatRupiah(s.cashBalance) : "Rp —", icon: Wallet, hint: "Seluruh akun" },
    { label: "Rombongan Belajar", value: s ? String(s.classesCount) : "—", icon: BookOpen, hint: "Kelas aktif" },
    { label: "Presensi Hari Ini", value: s?.attendanceRate != null ? `${s.attendanceRate.toFixed(1)}%` : "—", icon: CalendarCheck,
      hint: s?.attendanceRecorded ? `${s.attendanceRecorded} catatan` : "Belum ada catatan" },
    { label: "Tagihan Tertunggak", value: s ? formatRupiah(s.outstanding) : "Rp —", icon: TrendingUp, hint: "Outstanding SPP" },
  ];

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
                <Badge key={r} variant="outline">{ROLE_LABELS[r] ?? r}</Badge>
              ))
            )}
          </div>
        )}
      </div>

      {!schoolId && (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-muted-foreground">Pilih sekolah aktif di header untuk melihat statistik.</p>
            <Button asChild><Link to="/setup">Mulai Setup</Link></Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Pintasan</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/keuangan/tagihan">Tagihan / SPP</Link></Button>
          <Button asChild variant="outline"><Link to="/keuangan/pembayaran">Catat Pembayaran</Link></Button>
          <Button asChild variant="outline"><Link to="/keuangan/kas-bank">Kas & Bank</Link></Button>
          <Button asChild variant="outline"><Link to="/akuntansi/laporan">Laporan Keuangan</Link></Button>
          <Button asChild variant="outline"><Link to="/akademik/siswa">Data Siswa</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
