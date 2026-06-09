import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { listSchools } from "@/lib/admin.functions";
import { useActiveSchool } from "@/hooks/use-active-school";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { School } from "lucide-react";

type SchoolRow = { id: string; name: string; code: string; level: string };

export function SchoolContextSelector() {
  const { schoolId, setSchoolId } = useActiveSchool();
  const fetchSchools = useServerFn(listSchools);
  const q = useQuery<SchoolRow[]>({
    queryKey: ["schools-context"],
    queryFn: () => fetchSchools() as never,
  });

  useEffect(() => {
    if (!schoolId && q.data && q.data.length > 0) setSchoolId(q.data[0].id);
  }, [schoolId, q.data, setSchoolId]);

  return (
    <div className="flex items-center gap-2 min-w-[220px]">
      <School className="h-4 w-4 text-muted-foreground" />
      <Select value={schoolId ?? ""} onValueChange={(v) => setSchoolId(v)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Pilih sekolah..." />
        </SelectTrigger>
        <SelectContent>
          {(q.data ?? []).map((s) => (
            <SelectItem key={s.id} value={s.id}>
              <span className="font-medium">{s.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">[{s.level}]</span>
            </SelectItem>
          ))}
          {(q.data ?? []).length === 0 && !q.isLoading && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Belum ada sekolah</div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
