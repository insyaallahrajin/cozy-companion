import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = [
  "SUPERADMIN","FOUNDATION_ADMIN","PRINCIPAL","FINANCE","ACCOUNTING",
  "ADMIN_STAFF","HR","TEACHER","HOMEROOM_TEACHER","LIBRARIAN",
  "STUDENT","PARENT","AUDITOR",
] as const;
const roleEnum = z.enum(ROLES);
const levelEnum = z.enum(["TK","SD","SMP","SMA","SMK","PESANTREN","OTHER"]);
const statusEnum = z.enum(["ACTIVE","INACTIVE","ARCHIVED"]);

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["SUPERADMIN", "FOUNDATION_ADMIN"]);
  if (!data || data.length === 0) {
    throw new Error("Forbidden: hanya SUPERADMIN / FOUNDATION_ADMIN");
  }
  return {
    isSuper: data.some((r) => r.role === "SUPERADMIN"),
  };
}

// ============== FOUNDATIONS ==============
export const listFoundations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("foundations")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const foundationInput = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(255),
  legal_name: z.string().max(255).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  province: z.string().max(120).nullable().optional(),
  postal_code: z.string().max(16).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  website: z.string().max(255).nullable().optional(),
  npwp: z.string().max(32).nullable().optional(),
  status: statusEnum.default("ACTIVE"),
});

export const upsertFoundation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => foundationInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const payload = { ...data, email: data.email || null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin.from("foundations").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("foundations").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteFoundation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { isSuper } = await assertAdmin(context.userId);
    if (!isSuper) throw new Error("Forbidden: hanya SUPERADMIN dapat menghapus yayasan");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("foundations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== SCHOOLS ==============
export const listSchools = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("schools")
      .select("*, foundations(name, code)")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const schoolInput = z.object({
  id: z.string().uuid().optional(),
  foundation_id: z.string().uuid(),
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(255),
  level: levelEnum,
  npsn: z.string().max(32).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  province: z.string().max(120).nullable().optional(),
  postal_code: z.string().max(16).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  principal_name: z.string().max(255).nullable().optional(),
  status: statusEnum.default("ACTIVE"),
});

export const upsertSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schoolInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const payload = { ...data, email: data.email || null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin.from("schools").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("schools").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("schools").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== USERS & ROLES ==============
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }, { data: access, error: aErr }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, full_name, email, phone, status, created_at, foundation_id")
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("user_roles").select("user_id, role, school_id, foundation_id"),
        supabaseAdmin.from("user_school_access").select("user_id, school_id"),
      ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);
    if (aErr) throw new Error(aErr.message);

    return (profiles ?? []).map((p) => ({
      ...p,
      roles: (roles ?? []).filter((r) => r.user_id === p.id),
      schools: (access ?? []).filter((a) => a.user_id === p.id).map((a) => a.school_id),
    }));
  });

export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        role: roleEnum,
        foundation_id: z.string().uuid().nullable().optional(),
        school_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { isSuper } = await assertAdmin(context.userId);
    if (data.role === "SUPERADMIN" && !isSuper)
      throw new Error("Forbidden: hanya SUPERADMIN dapat menetapkan SUPERADMIN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").insert({
      user_id: data.user_id,
      role: data.role,
      foundation_id: data.foundation_id ?? null,
      school_id: data.school_id ?? null,
      granted_by: context.userId,
    });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), role: roleEnum, school_id: z.string().uuid().nullable().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { isSuper } = await assertAdmin(context.userId);
    if (data.role === "SUPERADMIN" && !isSuper)
      throw new Error("Forbidden: hanya SUPERADMIN dapat mencabut SUPERADMIN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", data.role);
    q = data.school_id ? q.eq("school_id", data.school_id) : q.is("school_id", null);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setSchoolAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), school_ids: z.array(z.string().uuid()) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delErr } = await supabaseAdmin
      .from("user_school_access")
      .delete()
      .eq("user_id", data.user_id);
    if (delErr) throw new Error(delErr.message);
    if (data.school_ids.length) {
      const rows = data.school_ids.map((sid) => ({ user_id: data.user_id, school_id: sid }));
      const { error } = await supabaseAdmin.from("user_school_access").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ============== AUDIT LOG ==============
export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ limit: z.number().int().min(1).max(200).default(50), offset: z.number().int().min(0).default(0) })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows, error, count } = await context.supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error(error.message);
    const serialized = (rows ?? []).map((r) => ({
      ...r,
      ip_address: r.ip_address == null ? null : String(r.ip_address),
    }));
    return { rows: serialized, total: count ?? 0 };
  });
