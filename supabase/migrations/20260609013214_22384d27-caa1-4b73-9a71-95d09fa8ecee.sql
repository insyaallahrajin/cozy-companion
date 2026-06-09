
-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ENUMS
CREATE TYPE public.app_role AS ENUM (
  'SUPERADMIN','FOUNDATION_ADMIN','PRINCIPAL','FINANCE','ACCOUNTING',
  'ADMIN_STAFF','HR','TEACHER','HOMEROOM_TEACHER','LIBRARIAN',
  'STUDENT','PARENT','AUDITOR'
);
CREATE TYPE public.school_level AS ENUM ('TK','SD','SMP','SMA','SMK','PESANTREN','OTHER');
CREATE TYPE public.entity_status AS ENUM ('ACTIVE','INACTIVE','ARCHIVED');

-- FOUNDATIONS
CREATE TABLE public.foundations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  legal_name TEXT, address TEXT, city TEXT, province TEXT, postal_code TEXT,
  phone TEXT, email TEXT, website TEXT, logo_url TEXT, npwp TEXT,
  status public.entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foundations TO authenticated;
GRANT ALL ON public.foundations TO service_role;
ALTER TABLE public.foundations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_foundations_updated BEFORE UPDATE ON public.foundations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SCHOOLS
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foundation_id UUID NOT NULL REFERENCES public.foundations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  level public.school_level NOT NULL DEFAULT 'OTHER',
  npsn TEXT, address TEXT, city TEXT, province TEXT, postal_code TEXT,
  phone TEXT, email TEXT, principal_name TEXT, logo_url TEXT,
  status public.entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(foundation_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_schools_updated BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_schools_foundation ON public.schools(foundation_id);

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  foundation_id UUID REFERENCES public.foundations(id) ON DELETE SET NULL,
  full_name TEXT, email TEXT, phone TEXT, avatar_url TEXT,
  locale TEXT NOT NULL DEFAULT 'id-ID',
  nip TEXT,
  status public.entity_status NOT NULL DEFAULT 'ACTIVE',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  foundation_id UUID REFERENCES public.foundations(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_user_roles_scope ON public.user_roles (
  user_id, role,
  COALESCE(foundation_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- USER SCHOOL ACCESS
CREATE TABLE public.user_school_access (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, school_id)
);
GRANT SELECT ON public.user_school_access TO authenticated;
GRANT ALL ON public.user_school_access TO service_role;
ALTER TABLE public.user_school_access ENABLE ROW LEVEL SECURITY;

-- HELPERS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles));
$$;
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'SUPERADMIN');
$$;
CREATE OR REPLACE FUNCTION public.has_role_in_school(_user_id UUID, _role public.app_role, _school_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
      AND (school_id IS NULL OR school_id = _school_id)
  );
$$;
CREATE OR REPLACE FUNCTION public.current_user_school_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.user_school_access WHERE user_id = auth.uid();
$$;
CREATE OR REPLACE FUNCTION public.current_user_foundation_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT foundation_id FROM public.user_roles
   WHERE user_id = auth.uid() AND foundation_id IS NOT NULL
  UNION
  SELECT DISTINCT s.foundation_id FROM public.user_school_access usa
   JOIN public.schools s ON s.id = usa.school_id
   WHERE usa.user_id = auth.uid();
$$;

-- AUDIT LOG
CREATE TABLE public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  foundation_id UUID REFERENCES public.foundations(id) ON DELETE SET NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  before_data JSONB, after_data JSONB,
  ip_address INET, user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.audit_logs_id_seq TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_entity ON public.audit_logs(entity, entity_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- RLS POLICIES
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_superadmin(auth.uid()) OR public.has_role(auth.uid(),'FOUNDATION_ADMIN'));
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()) OR public.has_role(auth.uid(),'FOUNDATION_ADMIN'))
  WITH CHECK (public.is_superadmin(auth.uid()) OR public.has_role(auth.uid(),'FOUNDATION_ADMIN'));

CREATE POLICY "foundations_select_member" ON public.foundations FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR id IN (SELECT public.current_user_foundation_ids()));
CREATE POLICY "foundations_modify_super" ON public.foundations FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "foundations_update_fnd_admin" ON public.foundations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'FOUNDATION_ADMIN') AND id IN (SELECT public.current_user_foundation_ids()))
  WITH CHECK (public.has_role(auth.uid(),'FOUNDATION_ADMIN') AND id IN (SELECT public.current_user_foundation_ids()));

CREATE POLICY "schools_select_member" ON public.schools FOR SELECT TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR foundation_id IN (SELECT public.current_user_foundation_ids())
    OR id IN (SELECT public.current_user_school_ids())
  );
CREATE POLICY "schools_modify_admin" ON public.schools FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (public.has_role(auth.uid(),'FOUNDATION_ADMIN') AND foundation_id IN (SELECT public.current_user_foundation_ids())))
  WITH CHECK (public.is_superadmin(auth.uid()) OR (public.has_role(auth.uid(),'FOUNDATION_ADMIN') AND foundation_id IN (SELECT public.current_user_foundation_ids())));

CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_superadmin(auth.uid()) OR public.has_role(auth.uid(),'FOUNDATION_ADMIN'));
CREATE POLICY "user_roles_admin_modify" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()) OR public.has_role(auth.uid(),'FOUNDATION_ADMIN'))
  WITH CHECK (public.is_superadmin(auth.uid()) OR public.has_role(auth.uid(),'FOUNDATION_ADMIN'));

CREATE POLICY "usa_select_self_or_admin" ON public.user_school_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_superadmin(auth.uid()) OR public.has_role(auth.uid(),'FOUNDATION_ADMIN'));
CREATE POLICY "usa_admin_modify" ON public.user_school_access FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()) OR public.has_role(auth.uid(),'FOUNDATION_ADMIN'))
  WITH CHECK (public.is_superadmin(auth.uid()) OR public.has_role(auth.uid(),'FOUNDATION_ADMIN'));

CREATE POLICY "audit_insert_any_authenticated" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());
CREATE POLICY "audit_select_admin_auditor" ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['FOUNDATION_ADMIN','AUDITOR','PRINCIPAL','ACCOUNTING']::public.app_role[])
  );
