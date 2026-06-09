import type { AppRole } from "./auth.functions";

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPERADMIN: "Super Administrator",
  FOUNDATION_ADMIN: "Admin Yayasan",
  PRINCIPAL: "Kepala Sekolah",
  FINANCE: "Bendahara / Keuangan",
  ACCOUNTING: "Staf Akuntansi",
  ADMIN_STAFF: "Tata Usaha",
  HR: "Staf SDM",
  TEACHER: "Guru",
  HOMEROOM_TEACHER: "Wali Kelas",
  LIBRARIAN: "Pustakawan",
  STUDENT: "Siswa",
  PARENT: "Orang Tua / Wali",
  AUDITOR: "Auditor",
};
