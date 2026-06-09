import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLogs } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sistem/audit")({
  head: () => ({ meta: [{ title: "Jejak Audit — SIMAT" }] }),
  component: AuditPage,
});

const PAGE = 50;

function AuditPage() {
  const [offset, setOffset] = useState(0);
  const fetchFn = useServerFn(listAuditLogs);
  const q = useQuery({
    queryKey: ["audit", offset],
    queryFn: () => fetchFn({ data: { limit: PAGE, offset } }),
  });

  const total = q.data?.total ?? 0;
  const rows = q.data?.rows ?? [];
  const page = Math.floor(offset / PAGE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Jejak Audit</h1>
        <p className="text-muted-foreground">
          Catatan seluruh aktivitas penting pada sistem (tampilan baca-saja).
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Aktivitas terbaru</CardTitle>
          <div className="text-xs text-muted-foreground">Total: {total}</div>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <div className="py-12 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[170px]">Waktu</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Entitas</TableHead>
                    <TableHead>ID Aktor</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Belum ada catatan audit.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((r: Record<string, unknown>) => (
                    <TableRow key={r.id as number}>
                      <TableCell className="text-xs font-mono">
                        {new Date(r.created_at as string).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.action as string}</Badge></TableCell>
                      <TableCell>
                        <div className="text-sm">{r.entity as string}</div>
                        {!!r.entity_id && <div className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{r.entity_id as string}</div>}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[140px]">
                        {(r.actor_id as string) ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{(r.ip_address as string) ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-muted-foreground">Halaman {page} / {totalPages}</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
                    <ChevronLeft className="h-4 w-4" /> Sebelumnya
                  </Button>
                  <Button variant="outline" size="sm" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>
                    Berikutnya <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
