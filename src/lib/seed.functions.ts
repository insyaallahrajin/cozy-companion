import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuper(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "SUPERADMIN");
  if (!data?.length) throw new Error("Forbidden: hanya SUPERADMIN dapat menjalankan seed.");
}

const FIRST_NAMES_M = ["Ahmad","Muhammad","Abdul","Rizky","Faisal","Hafiz","Ibrahim","Yusuf","Ilham","Reza","Bayu","Aldi","Dimas","Fajar","Hadi"];
const FIRST_NAMES_F = ["Aisyah","Siti","Nur","Fatimah","Khadijah","Maryam","Zahra","Putri","Salma","Anisa","Dewi","Indah","Mawar","Lestari","Sari"];
const LAST_NAMES = ["Pratama","Saputra","Rahman","Wibowo","Hidayat","Nugroho","Putra","Setiawan","Maulana","Ramadhan","Hasanah","Khairani","Anggraini","Permata","Aulia"];

const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuper(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Foundation
    const { data: f, error: fe } = await supabaseAdmin.from("foundations")
      .upsert({ code: "YAT", name: "Yayasan At-Tauhid", legal_name: "Yayasan Pendidikan At-Tauhid", city: "Bandung", province: "Jawa Barat", status: "ACTIVE" }, { onConflict: "code" })
      .select("id").single();
    if (fe) throw new Error(fe.message);

    // 2. School
    const { data: s, error: se } = await supabaseAdmin.from("schools")
      .upsert({ foundation_id: f.id, code: "SMPAT", name: "SMP At-Tauhid", level: "SMP", npsn: "20200001", city: "Bandung", province: "Jawa Barat", principal_name: "H. Abdul Hakim, M.Pd.", status: "ACTIVE" }, { onConflict: "foundation_id,code" })
      .select("id").single();
    if (se) throw new Error(se.message);

    // 3. Academic Year
    const { data: ay, error: aye } = await supabaseAdmin.from("academic_years")
      .upsert({ school_id: s.id, name: "2025/2026", start_date: "2025-07-15", end_date: "2026-06-30", is_active: true }, { onConflict: "school_id,name" })
      .select("id").single();
    if (aye) throw new Error(aye.message);

    // 4. Terms
    await supabaseAdmin.from("academic_terms").upsert([
      { academic_year_id: ay.id, name: "Semester Ganjil", ordinal: 1, start_date: "2025-07-15", end_date: "2025-12-20", is_active: true },
      { academic_year_id: ay.id, name: "Semester Genap", ordinal: 2, start_date: "2026-01-05", end_date: "2026-06-30", is_active: false },
    ], { onConflict: "academic_year_id,ordinal" });

    // 5. Subjects
    const subjects = [
      { code: "PAI", name: "Pendidikan Agama Islam", subject_group: "AGAMA", kkm: 75 },
      { code: "PKN", name: "Pendidikan Kewarganegaraan", subject_group: "UMUM", kkm: 70 },
      { code: "BIN", name: "Bahasa Indonesia", subject_group: "BAHASA", kkm: 72 },
      { code: "ENG", name: "Bahasa Inggris", subject_group: "BAHASA", kkm: 70 },
      { code: "MAT", name: "Matematika", subject_group: "MATEMATIKA", kkm: 70 },
      { code: "IPA", name: "Ilmu Pengetahuan Alam", subject_group: "IPA", kkm: 70 },
      { code: "IPS", name: "Ilmu Pengetahuan Sosial", subject_group: "IPS", kkm: 70 },
      { code: "SBK", name: "Seni Budaya", subject_group: "SENI", kkm: 75 },
      { code: "PJK", name: "Pendidikan Jasmani", subject_group: "OLAHRAGA", kkm: 75 },
    ];
    await supabaseAdmin.from("subjects").upsert(
      subjects.map((x) => ({ ...x, school_id: s.id })),
      { onConflict: "school_id,code" },
    );

    // 6. Staff (teachers)
    const teachers = [
      { full_name: "H. Abdul Hakim, M.Pd.", nip: "T001", position: "Kepala Sekolah", is_teacher: true, gender: "L" },
      { full_name: "Ibu Aminah, S.Pd.", nip: "T002", position: "Guru PAI", is_teacher: true, gender: "P" },
      { full_name: "Bapak Surya, S.Pd.", nip: "T003", position: "Guru Matematika", is_teacher: true, gender: "L" },
      { full_name: "Ibu Lestari, S.S.", nip: "T004", position: "Guru Bahasa Indonesia", is_teacher: true, gender: "P" },
      { full_name: "Bapak Iqbal, M.Sc.", nip: "T005", position: "Guru IPA", is_teacher: true, gender: "L" },
      { full_name: "Ibu Maya, S.Pd.", nip: "T006", position: "Guru IPS", is_teacher: true, gender: "P" },
      { full_name: "Bapak Reza, S.Pd.", nip: "T007", position: "Guru Bahasa Inggris", is_teacher: true, gender: "L" },
      { full_name: "Ibu Dewi, S.Pd.", nip: "T008", position: "Guru PJK / Wali Kelas 7A", is_teacher: true, gender: "P" },
    ];
    await supabaseAdmin.from("staff").upsert(
      teachers.map((t) => ({ ...t, school_id: s.id, employment_type: "TETAP_YAYASAN", status: "ACTIVE" })),
      { onConflict: "school_id,nip" },
    );
    const { data: staffRows } = await supabaseAdmin.from("staff").select("id, full_name, nip").eq("school_id", s.id);

    // 7. Classes
    const wali = staffRows?.find((x) => x.nip === "T008");
    const classes = [
      { name: "7A", grade_level: 7, capacity: 30, room: "R-7A", homeroom_teacher_id: wali?.id ?? null },
      { name: "7B", grade_level: 7, capacity: 30, room: "R-7B", homeroom_teacher_id: null },
      { name: "8A", grade_level: 8, capacity: 30, room: "R-8A", homeroom_teacher_id: null },
      { name: "9A", grade_level: 9, capacity: 30, room: "R-9A", homeroom_teacher_id: null },
    ];
    await supabaseAdmin.from("classes").upsert(
      classes.map((c) => ({ ...c, school_id: s.id, academic_year_id: ay.id })),
      { onConflict: "academic_year_id,name" },
    );
    const { data: classRows } = await supabaseAdmin.from("classes").select("id, name, grade_level").eq("academic_year_id", ay.id);

    // 8. Students (10 per class)
    const { data: existing } = await supabaseAdmin.from("students").select("id").eq("school_id", s.id).limit(1);
    let createdStudents = 0;
    if (!existing?.length) {
      for (const cls of classRows ?? []) {
        const rows = Array.from({ length: 10 }).map((_, i) => {
          const g = Math.random() < 0.5 ? "L" : "P";
          const first = g === "L" ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
          const last = pick(LAST_NAMES);
          const year = 2010 + (9 - cls.grade_level);
          const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
          const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
          const seq = String(i + 1).padStart(3, "0");
          return {
            foundation_id: f.id,
            school_id: s.id,
            full_name: `${first} ${last}`,
            nick_name: first,
            gender: g,
            religion: "ISLAM",
            birth_place: "Bandung",
            birth_date: `${year}-${month}-${day}`,
            nisn: `00${year}${cls.grade_level}${seq}`,
            nis: `${cls.name}-${seq}`,
            city: "Bandung", province: "Jawa Barat",
            status: "AKTIF",
          };
        });
        const { data: inserted, error } = await supabaseAdmin.from("students").insert(rows).select("id");
        if (error) throw new Error(error.message);
        createdStudents += inserted?.length ?? 0;
        // enroll
        const enr = (inserted ?? []).map((st, idx) => ({
          student_id: st.id, class_id: cls.id, academic_year_id: ay.id,
          roll_number: idx + 1, status: "AKTIF",
        }));
        await supabaseAdmin.from("student_enrollments").insert(enr);
        // parents
        const parents = (inserted ?? []).map((st) => ({
          student_id: st.id, relation: "AYAH", full_name: `Bapak ${pick(FIRST_NAMES_M)} ${pick(LAST_NAMES)}`,
          occupation: pick(["Wiraswasta","Karyawan Swasta","PNS","Petani","Guru","Pedagang"]),
          phone: `0812${Math.floor(10000000 + Math.random() * 89999999)}`,
          is_primary: true,
        }));
        await supabaseAdmin.from("student_parents").insert(parents);
      }
    }

    return { ok: true, foundation_id: f.id, school_id: s.id, academic_year_id: ay.id, students_created: createdStudents };
  });
