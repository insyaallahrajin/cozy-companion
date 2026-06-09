import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listJournalEntries } from "@/lib/finance.functions";
import { RequireActiveSchool } from "@/components/require-active-school";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatRupiah } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/akuntansi/jurnal")({
  head: () => ({ meta: [{ title: "Jurnal — SIMAT" }] }),
  component: () => <RequireActiveSchool>{(s) => <Page schoolId={s} />}</RequireActiveSchool>,
});

function Page({ schoolId }: { schoolId: string }) {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const fetch = useServerFn(listJournalEntries);
  const q = useQuery({ queryKey: ["journal", schoolId, from, to], queryFn: () => fetch({ data: { school_id: schoolId, from, to } }) });
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">COA & Jurnal</h1>
        <p className="text-muted-foreground">Jurnal akuntansi otomatis dari pembayaran & mutasi kas.</p></div>
      <Card>
        <CardHeader>
          <div className="flex items-end gap-2 flex-wrap">
            <div><Label>Dari</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label>Sampai</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          {q.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <div className="space-y-4">
              {(q.data ?? []).length === 0 && <div className="text-center text-muted-foreground py-8">Belum ada jurnal.</div>}
              {(q.data ?? []).map((j: any) => {
                const lines = (j.journal_lines ?? []) as any[];
                const totalD = lines.reduce((s, l) => s + Number(l.debit), 0);
                return (
                  <div key={j.id} className="border rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{j.entry_no}</span>
                        <span className="text-sm text-muted-foreground">{j.entry_date}</span>
                        <Badge variant="outline">{j.source}</Badge>
                      </div>
                      <span className="text-sm font-medium">{formatRupiah(totalD)}</span>
                    </div>
                    <div className="text-sm mb-2">{j.description}</div>
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="w-24">Kode</TableHead><TableHead>Akun</TableHead>
                        <TableHead className="text-right w-32">Debit</TableHead>
                        <TableHead className="text-right w-32">Kredit</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {lines.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell className="font-mono">{l.account_code}</TableCell>
                            <TableCell>{l.account_name}</TableCell>
                            <TableCell className="text-right">{Number(l.debit) > 0 ? formatRupiah(l.debit) : "—"}</TableCell>
                            <TableCell className="text-right">{Number(l.credit) > 0 ? formatRupiah(l.credit) : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
