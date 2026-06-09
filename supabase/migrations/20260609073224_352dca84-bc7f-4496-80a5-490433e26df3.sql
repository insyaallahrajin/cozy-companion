
-- ============== ENUMS ==============
CREATE TYPE public.app_role AS ENUM ('SUPERADMIN','FOUNDATION_ADMIN','PRINCIPAL','FINANCE','ACCOUNTING','ADMIN_STAFF','HR','TEACHER','HOMEROOM_TEACHER','LIBRARIAN','STUDENT','PARENT','AUDITOR');
CREATE TYPE public.school_level AS ENUM ('TK','SD','SMP','SMA','SMK','PESANTREN','OTHER');
CREATE TYPE public.entity_status AS ENUM ('ACTIVE','INACTIVE','ARCHIVED');
CREATE TYPE public.gender_type AS ENUM ('L','P');
CREATE TYPE public.religion_type AS ENUM ('ISLAM','KRISTEN','KATOLIK','HINDU','BUDDHA','KONGHUCU','LAINNYA');
CREATE TYPE public.parent_relation AS ENUM ('AYAH','IBU','WALI');
CREATE TYPE public.student_status AS ENUM ('AKTIF','LULUS','PINDAH','KELUAR','CUTI');
CREATE TYPE public.employment_type AS ENUM ('PNS','PPPK','TETAP_YAYASAN','HONORER','KONTRAK','MAGANG');
CREATE TYPE public.subject_group AS ENUM ('UMUM','AGAMA','BAHASA','MATEMATIKA','IPA','IPS','SENI','OLAHRAGA','KEJURUAN','MUATAN_LOKAL');
CREATE TYPE public.attendance_status AS ENUM ('HADIR','SAKIT','IZIN','ALPA','TERLAMBAT');
CREATE TYPE public.assessment_type AS ENUM ('TUGAS','ULANGAN_HARIAN','UTS','UAS','PRAKTIK','PROYEK','SIKAP');
CREATE TYPE public.invoice_status AS ENUM ('UNPAID','PARTIAL','PAID','CANCELLED');
CREATE TYPE public.payment_method AS ENUM ('TUNAI','TRANSFER','QRIS','VA','LAINNYA');
CREATE TYPE public.cash_kind AS ENUM ('IN','OUT');
CREATE TYPE public.cash_account_type AS ENUM ('CASH','BANK');
CREATE TYPE public.fee_recurrence AS ENUM ('ONCE','MONTHLY');
CREATE TYPE public.journal_source AS ENUM ('PAYMENT','CASH','MANUAL','OTHER');

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============== FOUNDATIONS ==============
CREATE TABLE public.foundations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  legal_name text, address text, city text, province text, postal_code text,
  phone text, email text, website text, npwp text,
  status public.entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foundations TO authenticated;
GRANT ALL ON public.foundations TO service_role;
ALTER TABLE public.foundations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read foundations" ON public.foundations FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_foundations_updated BEFORE UPDATE ON public.foundations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== SCHOOLS ==============
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foundation_id uuid NOT NULL REFERENCES public.foundations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  level public.school_level NOT NULL,
  npsn text, address text, city text, province text, postal_code text,
  phone text, email text, principal_name text,
  status public.entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (foundation_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read schools" ON public.schools FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_schools_updated BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== PROFILES ==============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text, email text, phone text, avatar_url text,
  foundation_id uuid REFERENCES public.foundations(id) ON DELETE SET NULL,
  status public.entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== USER_ROLES ==============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  foundation_id uuid REFERENCES public.foundations(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX user_roles_unique ON public.user_roles (user_id, role, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function (after user_roles)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'SUPERADMIN') OR public.has_role(auth.uid(), 'FOUNDATION_ADMIN'));

-- ============== USER_SCHOOL_ACCESS ==============
CREATE TABLE public.user_school_access (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, school_id)
);
GRANT SELECT ON public.user_school_access TO authenticated;
GRANT ALL ON public.user_school_access TO service_role;
ALTER TABLE public.user_school_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own access" ON public.user_school_access FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'SUPERADMIN') OR public.has_role(auth.uid(), 'FOUNDATION_ADMIN'));

-- ============== AUDIT LOGS ==============
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text, entity_id uuid,
  ip_address inet, user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'SUPERADMIN') OR public.has_role(auth.uid(), 'FOUNDATION_ADMIN') OR public.has_role(auth.uid(), 'AUDITOR'));

-- ============== ACADEMIC YEARS / TERMS ==============
CREATE TABLE public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL, end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_years TO authenticated;
GRANT ALL ON public.academic_years TO service_role;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all academic_years" ON public.academic_years FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ay_updated BEFORE UPDATE ON public.academic_years FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.academic_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name text NOT NULL, ordinal int NOT NULL,
  start_date date NOT NULL, end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (academic_year_id, ordinal)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_terms TO authenticated;
GRANT ALL ON public.academic_terms TO service_role;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all academic_terms" ON public.academic_terms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_at_updated BEFORE UPDATE ON public.academic_terms FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== SUBJECTS ==============
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  code text NOT NULL, name text NOT NULL,
  subject_group public.subject_group NOT NULL DEFAULT 'UMUM',
  kkm int NOT NULL DEFAULT 70,
  description text,
  status public.entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all subjects" ON public.subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_subjects_updated BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== STAFF ==============
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  nip text, full_name text NOT NULL,
  gender public.gender_type,
  birth_place text, birth_date date,
  email text, phone text, address text,
  employment_type public.employment_type NOT NULL DEFAULT 'TETAP_YAYASAN',
  position text, is_teacher boolean NOT NULL DEFAULT true,
  joined_at date,
  status public.entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, nip)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all staff" ON public.staff FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_staff_updated BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== CLASSES ==============
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  grade_level int NOT NULL, name text NOT NULL,
  homeroom_teacher_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  capacity int NOT NULL DEFAULT 32,
  room text,
  status public.entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (academic_year_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all classes" ON public.classes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_classes_updated BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== CLASS_SUBJECTS ==============
CREATE TABLE public.class_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  weekly_hours int NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, subject_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_subjects TO authenticated;
GRANT ALL ON public.class_subjects TO service_role;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all class_subjects" ON public.class_subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cs_updated BEFORE UPDATE ON public.class_subjects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== SCHEDULES ==============
CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_subject_id uuid NOT NULL REFERENCES public.class_subjects(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time time NOT NULL, end_time time NOT NULL,
  room text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules TO authenticated;
GRANT ALL ON public.schedules TO service_role;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all schedules" ON public.schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sch_updated BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== STUDENTS ==============
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foundation_id uuid NOT NULL REFERENCES public.foundations(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  nisn text, nis text,
  full_name text NOT NULL, nick_name text,
  gender public.gender_type NOT NULL DEFAULT 'L',
  birth_place text, birth_date date,
  religion public.religion_type NOT NULL DEFAULT 'ISLAM',
  address text, city text, province text, postal_code text,
  phone text, email text,
  enrollment_date date,
  status public.student_status NOT NULL DEFAULT 'AKTIF',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all students" ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== STUDENT_PARENTS ==============
CREATE TABLE public.student_parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relation public.parent_relation NOT NULL,
  full_name text NOT NULL,
  nik text, occupation text, phone text, email text, address text,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_parents TO authenticated;
GRANT ALL ON public.student_parents TO service_role;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all student_parents" ON public.student_parents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sp_updated BEFORE UPDATE ON public.student_parents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== STUDENT_ENROLLMENTS ==============
CREATE TABLE public.student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  roll_number int,
  status public.student_status NOT NULL DEFAULT 'AKTIF',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, academic_year_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_enrollments TO authenticated;
GRANT ALL ON public.student_enrollments TO service_role;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all enrollments" ON public.student_enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_se_updated BEFORE UPDATE ON public.student_enrollments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== ATTENDANCE ==============
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  attendance_date date NOT NULL,
  status public.attendance_status NOT NULL,
  note text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id, attendance_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all attendance" ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_att_updated BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== GRADES ==============
CREATE TABLE public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_subject_id uuid NOT NULL REFERENCES public.class_subjects(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  assessment_type public.assessment_type NOT NULL,
  title text,
  score numeric(5,2) NOT NULL,
  weight numeric(5,2) NOT NULL DEFAULT 1,
  note text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grades TO authenticated;
GRANT ALL ON public.grades TO service_role;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all grades" ON public.grades FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_grades_updated BEFORE UPDATE ON public.grades FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== FEE CATEGORIES / PLANS ==============
CREATE TABLE public.fee_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  default_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_categories TO authenticated;
GRANT ALL ON public.fee_categories TO service_role;
ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all fee_categories" ON public.fee_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_fc_updated BEFORE UPDATE ON public.fee_categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.fee_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name text NOT NULL,
  grade_level int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_plans TO authenticated;
GRANT ALL ON public.fee_plans TO service_role;
ALTER TABLE public.fee_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all fee_plans" ON public.fee_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_fp_updated BEFORE UPDATE ON public.fee_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.fee_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_plan_id uuid NOT NULL REFERENCES public.fee_plans(id) ON DELETE CASCADE,
  fee_category_id uuid NOT NULL REFERENCES public.fee_categories(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL,
  recurrence public.fee_recurrence NOT NULL DEFAULT 'MONTHLY',
  due_day int NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_plan_items TO authenticated;
GRANT ALL ON public.fee_plan_items TO service_role;
ALTER TABLE public.fee_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all fee_plan_items" ON public.fee_plan_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============== CASH ACCOUNTS ==============
CREATE TABLE public.cash_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  type public.cash_account_type NOT NULL DEFAULT 'CASH',
  bank_name text, account_number text,
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_accounts TO authenticated;
GRANT ALL ON public.cash_accounts TO service_role;
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all cash_accounts" ON public.cash_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ca_updated BEFORE UPDATE ON public.cash_accounts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== JOURNAL ==============
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  entry_no text NOT NULL,
  entry_date date NOT NULL,
  description text,
  source public.journal_source NOT NULL DEFAULT 'MANUAL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, entry_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all journal_entries" ON public.journal_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_je_updated BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_code text NOT NULL,
  account_name text NOT NULL,
  debit numeric(14,2) NOT NULL DEFAULT 0,
  credit numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_lines TO authenticated;
GRANT ALL ON public.journal_lines TO service_role;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all journal_lines" ON public.journal_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============== INVOICES / PAYMENTS / CASH TX ==============
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  invoice_no text NOT NULL,
  period_label text,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'UNPAID',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, invoice_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_inv_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  fee_category_id uuid REFERENCES public.fee_categories(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all invoice_items" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  cash_account_id uuid NOT NULL REFERENCES public.cash_accounts(id) ON DELETE RESTRICT,
  payment_no text NOT NULL,
  amount numeric(14,2) NOT NULL,
  method public.payment_method NOT NULL DEFAULT 'TUNAI',
  reference text,
  paid_at date NOT NULL,
  notes text,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  client_request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, payment_no)
);
CREATE UNIQUE INDEX payments_idem ON public.payments (school_id, client_request_id) WHERE client_request_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_pay_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  cash_account_id uuid NOT NULL REFERENCES public.cash_accounts(id) ON DELETE RESTRICT,
  kind public.cash_kind NOT NULL,
  amount numeric(14,2) NOT NULL,
  category text,
  description text NOT NULL,
  occurred_at date NOT NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cash_tx_payment_unique ON public.cash_transactions (payment_id) WHERE payment_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_transactions TO authenticated;
GRANT ALL ON public.cash_transactions TO service_role;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all cash_transactions" ON public.cash_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ct_updated BEFORE UPDATE ON public.cash_transactions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== AUTH: auto-create profile + default role ==============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'STUDENT')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
