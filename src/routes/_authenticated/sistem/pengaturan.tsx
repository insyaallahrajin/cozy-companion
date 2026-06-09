import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/sistem/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan — SIMAT" }] }),
  component: () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground">Konfigurasi sistem dan preferensi.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Segera hadir</CardTitle>
          <CardDescription>
            Halaman pengaturan akan mencakup konfigurasi tahun ajaran aktif, parameter penilaian,
            jadwal default, pengaturan email, dan integrasi gerbang pembayaran.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Modul ini akan ditambahkan pada iterasi berikutnya.
        </CardContent>
      </Card>
    </div>
  ),
});
