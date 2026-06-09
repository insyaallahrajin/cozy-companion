import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();
const statusEnum = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);
const gender = z.enum(["L", "P"]);
const religion = z.enum(["ISLAM","KRISTEN","KATOLIK","HINDU","BUDDHA","KONGHUCU","LAINNYA"]);
const relation = z.enum(["AYAH","IBU","WALI"]);
const studentStatus = z.enum(["AKTIF","LULUS","PINDAH","KELUAR","CUTI"]);
const employmentType = z.enum(["PNS","PPPK","TETAP_YAYASAN","HONORER","KONTRAK","MAGANG"]);
const subjectGroup = z.enum(["UMUM","AGAMA","BAHASA","MATEMATIKA","IPA","IPS","SENI","OLAHRAGA","KEJURUAN","MUATAN_LOKAL"]);
const attendanceStatus = z.enum(["HADIR","SAKIT","IZIN","ALPA","TERLAMBAT"]);
const assessmentType = z.enum(["TUGAS","ULANGAN_HARIAN","UTS","UAS","PRAKTIK","PROYEK","SIKAP"]);

// ============== ACADEMIC YEARS ==============
export const listAcademicYears = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ school_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("academic_years")
      .select("*")
      .eq("school_id", data.school_id)
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertAcademicYear = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: uuid.optional(),
      school_id: uuid,
      name: z.string().min(1).max(64),
      start_date: z.string(),
      end_date: z.string(),
      is_active: z.boolean().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.is_active) {
      await context.supabase.from("academic_years")
        .update({ is_active: false }).eq("school_id", data.school_id);
    }
    const payload = { ...data };
    if (data.id) {
      const { error } = await context.supabase.from("academic_years").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("academic_years").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteAcademicYear = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("academic_years").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== TERMS ==============
export const listTerms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ academic_year_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("academic_terms").select("*")
      .eq("academic_year_id", data.academic_year_id)
      .order("ordinal");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: uuid.optional(),
      academic_year_id: uuid,
      name: z.string().min(1).max(64),
      ordinal: z.number().int().min(1).max(4),
      start_date: z.string(),
      end_date: z.string(),
      is_active: z.boolean().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.is_active) {
      await context.supabase.from("academic_terms")
        .update({ is_active: false }).eq("academic_year_id", data.academic_year_id);
    }
    if (data.id) {
      const { error } = await context.supabase.from("academic_terms").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("academic_terms").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("academic_terms").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== SUBJECTS ==============
export const listSubjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ school_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("subjects").select("*").eq("school_id", data.school_id).order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: uuid.optional(),
      school_id: uuid,
      code: z.string().min(1).max(32),
      name: z.string().min(1).max(120),
      subject_group: subjectGroup.default("UMUM"),
      kkm: z.number().int().min(0).max(100).default(70),
      description: z.string().max(500).nullable().optional(),
      status: statusEnum.default("ACTIVE"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase.from("subjects").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("subjects").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("subjects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== STAFF ==============
export const listStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ school_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("staff").select("*").eq("school_id", data.school_id).order("full_name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: uuid.optional(),
      school_id: uuid,
      nip: z.string().max(32).nullable().optional(),
      full_name: z.string().min(1).max(255),
      gender: gender.nullable().optional(),
      birth_place: z.string().max(120).nullable().optional(),
      birth_date: z.string().nullable().optional(),
      email: z.string().email().nullable().optional().or(z.literal("")),
      phone: z.string().max(32).nullable().optional(),
      address: z.string().max(500).nullable().optional(),
      employment_type: employmentType.default("TETAP_YAYASAN"),
      position: z.string().max(120).nullable().optional(),
      is_teacher: z.boolean().default(true),
      joined_at: z.string().nullable().optional(),
      status: statusEnum.default("ACTIVE"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const payload = { ...data, email: data.email || null };
    if (data.id) {
      const { error } = await context.supabase.from("staff").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("staff").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("staff").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== CLASSES ==============
export const listClasses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ school_id: uuid, academic_year_id: uuid.nullable().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("classes")
      .select("*, staff:homeroom_teacher_id(id, full_name), academic_years(name)")
      .eq("school_id", data.school_id);
    if (data.academic_year_id) q = q.eq("academic_year_id", data.academic_year_id);
    const { data: rows, error } = await q.order("grade_level").order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: uuid.optional(),
      school_id: uuid,
      academic_year_id: uuid,
      grade_level: z.number().int().min(1).max(13),
      name: z.string().min(1).max(64),
      homeroom_teacher_id: uuid.nullable().optional(),
      capacity: z.number().int().min(1).max(100).default(32),
      room: z.string().max(64).nullable().optional(),
      status: statusEnum.default("ACTIVE"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase.from("classes").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("classes").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("classes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== CLASS-SUBJECTS ==============
export const listClassSubjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ class_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("class_subjects")
      .select("*, subjects(id, code, name, kkm), staff:teacher_id(id, full_name)")
      .eq("class_id", data.class_id);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertClassSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: uuid.optional(),
      class_id: uuid,
      subject_id: uuid,
      teacher_id: uuid.nullable().optional(),
      weekly_hours: z.number().int().min(1).max(20).default(2),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase.from("class_subjects").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("class_subjects").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteClassSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("class_subjects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== SCHEDULES ==============
export const listSchedules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ class_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("schedules")
      .select("*, class_subjects!inner(id, class_id, subjects(name), staff:teacher_id(full_name))")
      .eq("class_subjects.class_id", data.class_id)
      .order("day_of_week").order("start_time");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: uuid.optional(),
      class_subject_id: uuid,
      day_of_week: z.number().int().min(1).max(7),
      start_time: z.string(),
      end_time: z.string(),
      room: z.string().max(64).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase.from("schedules").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("schedules").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("schedules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== STUDENTS ==============
export const listStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ school_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("students")
      .select("*, enrollments:student_enrollments(id, class_id, academic_year_id, status, classes(name, grade_level))")
      .eq("school_id", data.school_id)
      .order("full_name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("students")
      .select("*, parents:student_parents(*), enrollments:student_enrollments(*, classes(name, grade_level), academic_years(name))")
      .eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return row;
  });

const studentInput = z.object({
  id: uuid.optional(),
  foundation_id: uuid,
  school_id: uuid,
  nisn: z.string().max(32).nullable().optional(),
  nis: z.string().max(32).nullable().optional(),
  full_name: z.string().min(1).max(255),
  nick_name: z.string().max(120).nullable().optional(),
  gender: gender.default("L"),
  birth_place: z.string().max(120).nullable().optional(),
  birth_date: z.string().nullable().optional(),
  religion: religion.default("ISLAM"),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  province: z.string().max(120).nullable().optional(),
  postal_code: z.string().max(16).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  enrollment_date: z.string().nullable().optional(),
  status: studentStatus.default("AKTIF"),
  notes: z.string().max(1000).nullable().optional(),
});

export const enrollStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      student: studentInput,
      class_id: uuid.nullable().optional(),
      academic_year_id: uuid.nullable().optional(),
      roll_number: z.number().int().nullable().optional(),
      parent: z.object({
        relation: relation,
        full_name: z.string().min(1).max(255),
        nik: z.string().max(32).nullable().optional(),
        occupation: z.string().max(120).nullable().optional(),
        phone: z.string().max(32).nullable().optional(),
        email: z.string().email().nullable().optional().or(z.literal("")),
        address: z.string().max(500).nullable().optional(),
        is_primary: z.boolean().default(true),
      }).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const s = { ...data.student, email: data.student.email || null };
    let studentId = data.student.id;
    if (studentId) {
      const { error } = await context.supabase.from("students").update(s).eq("id", studentId);
      if (error) throw new Error(error.message);
    } else {
      const { data: ins, error } = await context.supabase.from("students").insert(s).select("id").single();
      if (error) throw new Error(error.message);
      studentId = ins.id;
    }
    if (data.class_id && data.academic_year_id && studentId) {
      const { error } = await context.supabase.from("student_enrollments").upsert({
        student_id: studentId,
        class_id: data.class_id,
        academic_year_id: data.academic_year_id,
        roll_number: data.roll_number ?? null,
        status: "AKTIF" as const,
      }, { onConflict: "student_id,academic_year_id" });
      if (error) throw new Error(error.message);
    }
    if (data.parent && studentId) {
      const p = { ...data.parent, student_id: studentId, email: data.parent.email || null };
      const { error } = await context.supabase.from("student_parents").insert(p);
      if (error) throw new Error(error.message);
    }
    return { ok: true, id: studentId };
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("students").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== ATTENDANCE ==============
export const listAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ class_id: uuid, date: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Get enrolled students in this class
    const { data: enr, error: e1 } = await context.supabase
      .from("student_enrollments")
      .select("student_id, students(id, full_name, nisn)")
      .eq("class_id", data.class_id)
      .eq("status", "AKTIF");
    if (e1) throw new Error(e1.message);

    const { data: att, error: e2 } = await context.supabase
      .from("attendance")
      .select("*")
      .eq("class_id", data.class_id)
      .eq("attendance_date", data.date);
    if (e2) throw new Error(e2.message);

    return {
      students: (enr ?? []).map((e) => e.students).filter(Boolean),
      attendance: att ?? [],
    };
  });

export const saveAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      class_id: uuid,
      date: z.string(),
      records: z.array(z.object({
        student_id: uuid,
        status: attendanceStatus,
        note: z.string().max(500).nullable().optional(),
      })).max(200),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const rows = data.records.map((r) => ({
      class_id: data.class_id,
      student_id: r.student_id,
      attendance_date: data.date,
      status: r.status,
      note: r.note ?? null,
      recorded_by: context.userId,
    }));
    const { error } = await context.supabase
      .from("attendance")
      .upsert(rows, { onConflict: "class_id,student_id,attendance_date" });
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });

// ============== GRADES ==============
export const listGrades = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ class_subject_id: uuid, term_id: uuid }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: cs, error: e0 } = await context.supabase
      .from("class_subjects").select("class_id, subjects(name, kkm)").eq("id", data.class_subject_id).single();
    if (e0) throw new Error(e0.message);
    const { data: enr, error: e1 } = await context.supabase
      .from("student_enrollments")
      .select("student_id, students(id, full_name, nisn)")
      .eq("class_id", cs.class_id).eq("status", "AKTIF");
    if (e1) throw new Error(e1.message);
    const { data: grades, error: e2 } = await context.supabase
      .from("grades").select("*")
      .eq("class_subject_id", data.class_subject_id).eq("term_id", data.term_id);
    if (e2) throw new Error(e2.message);
    return {
      students: (enr ?? []).map((e) => e.students).filter(Boolean),
      grades: grades ?? [],
      subject: cs.subjects,
    };
  });

export const saveGrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: uuid.optional(),
      class_subject_id: uuid,
      student_id: uuid,
      term_id: uuid,
      assessment_type: assessmentType,
      title: z.string().max(120).nullable().optional(),
      score: z.number().min(0).max(100),
      weight: z.number().min(0).max(10).default(1),
      note: z.string().max(500).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const payload = { ...data, recorded_by: context.userId };
    if (data.id) {
      const { error } = await context.supabase.from("grades").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("grades").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteGrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("grades").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== BULK IMPORT: CLASSES ==============
const classRow = z.object({
  grade_level: z.number().int().min(1).max(13),
  name: z.string().min(1).max(64),
  capacity: z.number().int().min(1).max(100).default(32),
  room: z.string().max(64).nullable().optional(),
  homeroom_teacher_name: z.string().max(255).nullable().optional(),
});

export const bulkImportClasses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      school_id: uuid,
      academic_year_id: uuid,
      rows: z.array(classRow).min(1).max(500),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: staff } = await context.supabase
      .from("staff").select("id, full_name").eq("school_id", data.school_id);
    const teacherByName = new Map<string, string>();
    (staff ?? []).forEach((s: any) => teacherByName.set(s.full_name.toLowerCase().trim(), s.id));

    const payload = data.rows.map((r) => ({
      school_id: data.school_id,
      academic_year_id: data.academic_year_id,
      grade_level: r.grade_level,
      name: r.name,
      capacity: r.capacity ?? 32,
      room: r.room ?? null,
      homeroom_teacher_id: r.homeroom_teacher_name
        ? teacherByName.get(r.homeroom_teacher_name.toLowerCase().trim()) ?? null
        : null,
      status: "ACTIVE" as const,
    }));
    const { error, count } = await context.supabase
      .from("classes").insert(payload, { count: "exact" });
    if (error) throw new Error(error.message);
    return { ok: true, inserted: count ?? payload.length };
  });

// ============== BULK IMPORT: STUDENTS ==============
const studentRow = z.object({
  nisn: z.string().max(32).nullable().optional(),
  nis: z.string().max(32).nullable().optional(),
  full_name: z.string().min(1).max(255),
  gender: gender,
  birth_place: z.string().max(120).nullable().optional(),
  birth_date: z.string().nullable().optional(),
  religion: religion.default("ISLAM"),
  phone: z.string().max(32).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  class_name: z.string().max(64).nullable().optional(),
  parent_name: z.string().max(255).nullable().optional(),
  parent_relation: relation.nullable().optional(),
  parent_phone: z.string().max(32).nullable().optional(),
});

export const bulkImportStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      school_id: uuid,
      foundation_id: uuid,
      academic_year_id: uuid.nullable().optional(),
      rows: z.array(studentRow).min(1).max(1000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const classByName = new Map<string, string>();
    if (data.academic_year_id) {
      const { data: cls } = await context.supabase
        .from("classes").select("id, name")
        .eq("school_id", data.school_id)
        .eq("academic_year_id", data.academic_year_id);
      (cls ?? []).forEach((c: any) => classByName.set(c.name.toLowerCase().trim(), c.id));
    }
    let inserted = 0;
    const errors: { row: number; message: string }[] = [];
    for (let i = 0; i < data.rows.length; i++) {
      const r = data.rows[i];
      try {
        const { data: ins, error } = await context.supabase
          .from("students").insert({
            foundation_id: data.foundation_id,
            school_id: data.school_id,
            nisn: r.nisn || null, nis: r.nis || null,
            full_name: r.full_name, gender: r.gender,
            birth_place: r.birth_place || null, birth_date: r.birth_date || null,
            religion: r.religion,
            phone: r.phone || null, address: r.address || null,
            status: "AKTIF" as const,
          }).select("id").single();
        if (error) throw new Error(error.message);
        if (r.class_name && data.academic_year_id) {
          const classId = classByName.get(r.class_name.toLowerCase().trim());
          if (classId) {
            await context.supabase.from("student_enrollments").insert({
              student_id: ins.id, class_id: classId,
              academic_year_id: data.academic_year_id, status: "AKTIF",
            });
          }
        }
        if (r.parent_name) {
          await context.supabase.from("student_parents").insert({
            student_id: ins.id,
            relation: r.parent_relation ?? "WALI",
            full_name: r.parent_name, phone: r.parent_phone || null,
            is_primary: true,
          });
        }
        inserted++;
      } catch (e: any) {
        errors.push({ row: i + 1, message: e.message ?? String(e) });
      }
    }
    return { ok: true, inserted, errors };
  });

// ============== GRADE REPORT (per class + year) ==============
export const getGradeReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ class_id: uuid, academic_year_id: uuid }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: klass, error: ek } = await context.supabase
      .from("classes")
      .select("id, name, grade_level, room, school_id, academic_year_id, staff:homeroom_teacher_id(full_name), academic_years(name), schools(name)")
      .eq("id", data.class_id).single();
    if (ek) throw new Error(ek.message);
    const { data: terms } = await context.supabase
      .from("academic_terms").select("id, name, ordinal")
      .eq("academic_year_id", data.academic_year_id).order("ordinal");
    const { data: cs } = await context.supabase
      .from("class_subjects")
      .select("id, subjects(id, code, name, kkm), staff:teacher_id(full_name)")
      .eq("class_id", data.class_id);
    const { data: enr } = await context.supabase
      .from("student_enrollments")
      .select("roll_number, students(id, full_name, nisn, nis)")
      .eq("class_id", data.class_id)
      .eq("academic_year_id", data.academic_year_id)
      .eq("status", "AKTIF");
    const csIds = (cs ?? []).map((x: any) => x.id);
    const gradesRes = csIds.length
      ? await context.supabase.from("grades")
          .select("class_subject_id, student_id, term_id, score, weight")
          .in("class_subject_id", csIds)
      : { data: [] as any[] };
    return {
      klass, terms: terms ?? [], class_subjects: cs ?? [],
      students: (enr ?? []).map((e: any) => ({ ...e.students, roll_number: e.roll_number }))
        .filter(Boolean)
        .sort((a: any, b: any) => (a.roll_number ?? 999) - (b.roll_number ?? 999) || a.full_name.localeCompare(b.full_name)),
      grades: gradesRes.data ?? [],
    };
  });
