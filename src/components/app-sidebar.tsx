import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CalendarCheck,
  ClipboardList,
  BookOpen,
  Wallet,
  Receipt,
  Landmark,
  FileBarChart,
  UserCog,
  Building2,
  Library,
  Boxes,
  Megaphone,
  ShieldCheck,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const groups: { label: string; items: Item[] }[] = [
  {
    label: "Beranda",
    items: [{ title: "Dasbor", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Akademik",
    items: [
      { title: "Siswa", url: "/akademik/siswa", icon: GraduationCap },
      { title: "Guru & Pegawai", url: "/akademik/guru", icon: Users },
      { title: "Kelas & Rombel", url: "/akademik/kelas", icon: BookOpen },
      { title: "Jadwal Pelajaran", url: "/akademik/jadwal", icon: CalendarCheck },
      { title: "Presensi", url: "/akademik/presensi", icon: ClipboardList },
      { title: "Nilai & Rapor", url: "/akademik/nilai", icon: FileBarChart },
      { title: "Cetak Rekap Nilai", url: "/akademik/cetak-nilai", icon: FileBarChart },
      { title: "Impor Data (CSV)", url: "/akademik/impor", icon: Boxes },
    ],
  },
  {
    label: "Keuangan",
    items: [
      { title: "Tagihan / SPP", url: "/keuangan/tagihan", icon: Receipt },
      { title: "Pembayaran", url: "/keuangan/pembayaran", icon: Wallet },
      { title: "Kas & Bank", url: "/keuangan/kas-bank", icon: Landmark },
      { title: "COA & Jurnal", url: "/akuntansi/jurnal", icon: FileBarChart },
      { title: "Laporan Keuangan", url: "/akuntansi/laporan", icon: FileBarChart },
    ],
  },
  {
    label: "Operasional",
    items: [
      { title: "PPDB", url: "/ppdb", icon: Building2 },
      { title: "SDM & Payroll", url: "/sdm", icon: UserCog },
      { title: "Perpustakaan", url: "/perpustakaan", icon: Library },
      { title: "Aset & Inventaris", url: "/aset", icon: Boxes },
      { title: "Pengumuman", url: "/pengumuman", icon: Megaphone },
    ],
  },
  {
    label: "Akademik (lanjutan)",
    items: [
      { title: "Tahun Ajaran", url: "/akademik/tahun-ajaran", icon: CalendarCheck },
      { title: "Mata Pelajaran", url: "/akademik/mata-pelajaran", icon: BookOpen },
    ],
  },
  {
    label: "Sistem",
    items: [
      { title: "Setup Awal", url: "/setup", icon: Settings },
      { title: "Sekolah & Yayasan", url: "/sistem/sekolah", icon: Building2 },
      { title: "Pengguna & Peran", url: "/sistem/pengguna", icon: ShieldCheck },
      { title: "Jejak Audit", url: "/sistem/audit", icon: ShieldCheck },
      { title: "Pengaturan", url: "/sistem/pengaturan", icon: Settings },
    ],
  },
];


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) =>
    url === "/dashboard" ? currentPath === url : currentPath.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
            S
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">SIMAT</span>
              <span className="text-[10px] text-muted-foreground">
                Yayasan At-Tauhid
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url as never} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
