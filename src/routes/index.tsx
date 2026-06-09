import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SIMAT — Sistem Informasi Manajemen At-Tauhid" },
      {
        name: "description",
        content:
          "Platform ERP & manajemen sekolah terpadu Yayasan At-Tauhid: akademik, keuangan, akuntansi, PPDB, dan pelaporan.",
      },
    ],
  }),
  component: IndexRedirect,
});

function IndexRedirect() {
  const [target, setTarget] = useState<"/dashboard" | "/auth" | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setTarget(data.session ? "/dashboard" : "/auth");
    });
  }, []);
  if (!target) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-muted-foreground text-sm">Memuat SIMAT…</div>
      </div>
    );
  }
  return <Navigate to={target} replace />;
}
