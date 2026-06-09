import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole =
  | "SUPERADMIN"
  | "FOUNDATION_ADMIN"
  | "PRINCIPAL"
  | "FINANCE"
  | "ACCOUNTING"
  | "ADMIN_STAFF"
  | "HR"
  | "TEACHER"
  | "HOMEROOM_TEACHER"
  | "LIBRARIAN"
  | "STUDENT"
  | "PARENT"
  | "AUDITOR";

export interface CurrentUser {
  id: string;
  email: string | null;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    foundation_id: string | null;
  } | null;
  roles: AppRole[];
}

export const getCurrentUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CurrentUser> => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, avatar_url, phone, foundation_id, email")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const roles = Array.from(
      new Set((roleRows ?? []).map((r) => r.role as AppRole)),
    );

    return {
      id: userId,
      email: profile?.email ?? null,
      profile: profile
        ? {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            phone: profile.phone,
            foundation_id: profile.foundation_id,
          }
        : null,
      roles,
    };
  });
