import type { AppRole } from "./auth.functions";

export type RolePreset = {
  id: string;
  label: string;
  description: string;
  roles: AppRole[];
  scope: "GLOBAL" | "FOUNDATION" | "SCHOOL";
};

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: "superadmin",
    label: "Super Administrator",
    description: "Akses penuh ke seluruh yayasan, sekolah, dan modul.",
    roles: ["SUPERADMIN"],
    scope: "GLOBAL",
  },
  {
    id: "admin_yayasan",
    label: "Admin Yayasan",
    description: "Mengelola yayasan, sekolah, pengguna, dan data master.",
    roles: ["FOUNDATION_ADMIN"],
    scope: "FOUNDATION",
  },
  {
    id: "kepala_sekolah",
    label: "Kepala Sekolah",
    description: "Memimpin satu sekolah, melihat semua modul akademik & keuangan.",
    roles: ["PRINCIPAL", "ADMIN_STAFF"],
    scope: "SCHOOL",
  },
  {
    id: "guru",
    label: "Guru",
    description: "Mengisi presensi, nilai, dan jadwal pelajaran kelas yang diampu.",
    roles: ["TEACHER"],
    scope: "SCHOOL",
  },
  {
    id: "wali_kelas",
    label: "Wali Kelas",
    description: "Guru dengan tanggung jawab tambahan sebagai wali kelas.",
    roles: ["TEACHER", "HOMEROOM_TEACHER"],
    scope: "SCHOOL",
  },
  {
    id: "tata_usaha",
    label: "Tata Usaha",
    description: "Mengelola data siswa, kelas, jadwal, dan administrasi sekolah.",
    roles: ["ADMIN_STAFF"],
    scope: "SCHOOL",
  },
  {
    id: "bendahara",
    label: "Bendahara / Keuangan",
    description: "Mengelola tagihan SPP, pembayaran, dan kas/bank.",
    roles: ["FINANCE"],
    scope: "SCHOOL",
  },
  {
    id: "akuntan",
    label: "Staf Akuntansi",
    description: "Mengelola COA, jurnal, dan laporan keuangan ISAK 35 / PSAK 118.",
    roles: ["ACCOUNTING"],
    scope: "FOUNDATION",
  },
  {
    id: "ortu",
    label: "Orang Tua / Wali",
    description: "Melihat data anak: nilai, presensi, dan tagihan.",
    roles: ["PARENT"],
    scope: "GLOBAL",
  },
  {
    id: "siswa",
    label: "Siswa",
    description: "Melihat jadwal, nilai, dan presensi pribadi.",
    roles: ["STUDENT"],
    scope: "GLOBAL",
  },
];
