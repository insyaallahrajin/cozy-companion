
-- Enums
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('UNPAID','PARTIAL','PAID','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE cash_account_type AS ENUM ('CASH','BANK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE cash_tx_kind AS ENUM ('IN','OUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('TUNAI','TRANSFER','QRIS','VA','LAINNYA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE fee_recurrence AS ENUM ('ONCE','MONTHLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fee categories
CREATE TABLE public.fee_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  default_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_categories TO authenticated;
GRANT ALL ON public.fee_categories TO service_role;
ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY fc_all ON public.fee_categories FOR ALL TO authenticated
  USING (user_can_access_school(auth.uid(), school_id))
  WITH CHECK (user_can_access_school(auth.uid(), school_id));
CREATE TRIGGER fc_upd BEFORE UPDATE ON public.fee_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Fee plans
CREATE TABLE public.fee_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name text NOT NULL,
  grade_level integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_plans TO authenticated;
GRANT ALL ON public.fee_plans TO service_role;
ALTER TABLE public.fee_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY fp_all ON public.fee_plans FOR ALL TO authenticated
  USING (user_can_access_school(auth.uid(), school_id))
  WITH CHECK (user_can_access_school(auth.uid(), school_id));
CREATE TRIGGER fp_upd BEFORE UPDATE ON public.fee_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Fee plan items
CREATE TABLE public.fee_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_plan_id uuid NOT NULL REFERENCES public.fee_plans(id) ON DELETE CASCADE,
  fee_category_id uuid NOT NULL REFERENCES public.fee_categories(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL,
  recurrence fee_recurrence NOT NULL DEFAULT 'MONTHLY',
  due_day integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_plan_items TO authenticated;
GRANT ALL ON public.fee_plan_items TO service_role;
ALTER TABLE public.fee_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY fpi_all ON public.fee_plan_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.fee_plans p WHERE p.id = fee_plan_id AND user_can_access_school(auth.uid(), p.school_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.fee_plans p WHERE p.id = fee_plan_id AND user_can_access_school(auth.uid(), p.school_id)));

-- Cash accounts
CREATE TABLE public.cash_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  type cash_account_type NOT NULL DEFAULT 'CASH',
  bank_name text,
  account_number text,
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_accounts TO authenticated;
GRANT ALL ON public.cash_accounts TO service_role;
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY ca_all ON public.cash_accounts FOR ALL TO authenticated
  USING (user_can_access_school(auth.uid(), school_id))
  WITH CHECK (user_can_access_school(auth.uid(), school_id));
CREATE TRIGGER ca_upd BEFORE UPDATE ON public.cash_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  invoice_no text NOT NULL,
  period_label text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'UNPAID',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, invoice_no)
);
CREATE INDEX idx_invoices_student ON public.invoices(student_id);
CREATE INDEX idx_invoices_school_status ON public.invoices(school_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_all ON public.invoices FOR ALL TO authenticated
  USING (user_can_access_school(auth.uid(), school_id))
  WITH CHECK (user_can_access_school(auth.uid(), school_id));
CREATE TRIGGER inv_upd BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Invoice items
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
CREATE POLICY ii_all ON public.invoice_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND user_can_access_school(auth.uid(), i.school_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND user_can_access_school(auth.uid(), i.school_id)));

-- Journal entries
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  entry_no text NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  source text NOT NULL DEFAULT 'MANUAL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, entry_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY je_all ON public.journal_entries FOR ALL TO authenticated
  USING (user_can_access_school(auth.uid(), school_id))
  WITH CHECK (user_can_access_school(auth.uid(), school_id));
CREATE TRIGGER je_upd BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Journal lines
CREATE TABLE public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_code text NOT NULL,
  account_name text NOT NULL,
  debit numeric(14,2) NOT NULL DEFAULT 0,
  credit numeric(14,2) NOT NULL DEFAULT 0,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_lines TO authenticated;
GRANT ALL ON public.journal_lines TO service_role;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY jl_all ON public.journal_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND user_can_access_school(auth.uid(), je.school_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND user_can_access_school(auth.uid(), je.school_id)));

-- Payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  cash_account_id uuid NOT NULL REFERENCES public.cash_accounts(id) ON DELETE RESTRICT,
  payment_no text NOT NULL,
  amount numeric(14,2) NOT NULL,
  method payment_method NOT NULL DEFAULT 'TUNAI',
  reference text,
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, payment_no)
);
CREATE INDEX idx_payments_school_date ON public.payments(school_id, paid_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY pay_all ON public.payments FOR ALL TO authenticated
  USING (user_can_access_school(auth.uid(), school_id))
  WITH CHECK (user_can_access_school(auth.uid(), school_id));
CREATE TRIGGER pay_upd BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cash transactions
CREATE TABLE public.cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  cash_account_id uuid NOT NULL REFERENCES public.cash_accounts(id) ON DELETE CASCADE,
  kind cash_tx_kind NOT NULL,
  amount numeric(14,2) NOT NULL,
  category text,
  description text NOT NULL,
  occurred_at date NOT NULL DEFAULT CURRENT_DATE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ctx_school_date ON public.cash_transactions(school_id, occurred_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_transactions TO authenticated;
GRANT ALL ON public.cash_transactions TO service_role;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ctx_all ON public.cash_transactions FOR ALL TO authenticated
  USING (user_can_access_school(auth.uid(), school_id))
  WITH CHECK (user_can_access_school(auth.uid(), school_id));
CREATE TRIGGER ctx_upd BEFORE UPDATE ON public.cash_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
