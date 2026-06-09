
-- =========================================================
-- 1. Finance access helper (write/manage role gate)
-- =========================================================
CREATE OR REPLACE FUNCTION public.user_can_manage_finance(_uid uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_superadmin(_uid)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      LEFT JOIN public.schools s ON s.id = _school_id
      WHERE ur.user_id = _uid
        AND ur.role IN ('FOUNDATION_ADMIN','PRINCIPAL','FINANCE','ACCOUNTING','ADMIN_STAFF')
        AND (
          ur.school_id = _school_id
          OR (ur.role = 'FOUNDATION_ADMIN' AND (ur.foundation_id IS NULL OR ur.foundation_id = s.foundation_id))
          OR ur.school_id IS NULL AND ur.foundation_id IS NULL AND public.user_can_access_school(_uid, _school_id)
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_manage_finance(uuid, uuid) TO authenticated, service_role;

-- =========================================================
-- 2. Replace blanket "ALL" finance policies with split read/write
-- =========================================================

-- ===== invoices =====
DROP POLICY IF EXISTS inv_all ON public.invoices;
CREATE POLICY inv_select ON public.invoices FOR SELECT TO authenticated
  USING (public.user_can_access_school(auth.uid(), school_id));
CREATE POLICY inv_insert ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_finance(auth.uid(), school_id));
CREATE POLICY inv_update ON public.invoices FOR UPDATE TO authenticated
  USING (public.user_can_manage_finance(auth.uid(), school_id))
  WITH CHECK (public.user_can_manage_finance(auth.uid(), school_id));
CREATE POLICY inv_delete ON public.invoices FOR DELETE TO authenticated
  USING (public.user_can_manage_finance(auth.uid(), school_id));

-- ===== invoice_items =====
DROP POLICY IF EXISTS ii_all ON public.invoice_items;
CREATE POLICY ii_select ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.user_can_access_school(auth.uid(), i.school_id)));
CREATE POLICY ii_write ON public.invoice_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.user_can_manage_finance(auth.uid(), i.school_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.user_can_manage_finance(auth.uid(), i.school_id)));

-- ===== payments =====
DROP POLICY IF EXISTS pay_all ON public.payments;
CREATE POLICY pay_select ON public.payments FOR SELECT TO authenticated
  USING (public.user_can_access_school(auth.uid(), school_id));
CREATE POLICY pay_insert ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_finance(auth.uid(), school_id));
CREATE POLICY pay_update ON public.payments FOR UPDATE TO authenticated
  USING (public.user_can_manage_finance(auth.uid(), school_id))
  WITH CHECK (public.user_can_manage_finance(auth.uid(), school_id));
CREATE POLICY pay_delete ON public.payments FOR DELETE TO authenticated
  USING (public.user_can_manage_finance(auth.uid(), school_id));

-- ===== cash_accounts =====
DROP POLICY IF EXISTS ca_all ON public.cash_accounts;
CREATE POLICY ca_select ON public.cash_accounts FOR SELECT TO authenticated
  USING (public.user_can_access_school(auth.uid(), school_id));
CREATE POLICY ca_write ON public.cash_accounts FOR ALL TO authenticated
  USING (public.user_can_manage_finance(auth.uid(), school_id))
  WITH CHECK (public.user_can_manage_finance(auth.uid(), school_id));

-- ===== cash_transactions =====
DROP POLICY IF EXISTS ctx_all ON public.cash_transactions;
CREATE POLICY ctx_select ON public.cash_transactions FOR SELECT TO authenticated
  USING (public.user_can_access_school(auth.uid(), school_id));
CREATE POLICY ctx_write ON public.cash_transactions FOR ALL TO authenticated
  USING (public.user_can_manage_finance(auth.uid(), school_id))
  WITH CHECK (public.user_can_manage_finance(auth.uid(), school_id));

-- ===== journal_entries =====
DROP POLICY IF EXISTS je_all ON public.journal_entries;
CREATE POLICY je_select ON public.journal_entries FOR SELECT TO authenticated
  USING (public.user_can_access_school(auth.uid(), school_id));
CREATE POLICY je_write ON public.journal_entries FOR ALL TO authenticated
  USING (public.user_can_manage_finance(auth.uid(), school_id))
  WITH CHECK (public.user_can_manage_finance(auth.uid(), school_id));

-- ===== journal_lines =====
DROP POLICY IF EXISTS jl_all ON public.journal_lines;
CREATE POLICY jl_select ON public.journal_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.journal_entries j WHERE j.id = journal_entry_id AND public.user_can_access_school(auth.uid(), j.school_id)));
CREATE POLICY jl_write ON public.journal_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.journal_entries j WHERE j.id = journal_entry_id AND public.user_can_manage_finance(auth.uid(), j.school_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.journal_entries j WHERE j.id = journal_entry_id AND public.user_can_manage_finance(auth.uid(), j.school_id)));

-- ===== fee_categories =====
DROP POLICY IF EXISTS fc_all ON public.fee_categories;
CREATE POLICY fc_select ON public.fee_categories FOR SELECT TO authenticated
  USING (public.user_can_access_school(auth.uid(), school_id));
CREATE POLICY fc_write ON public.fee_categories FOR ALL TO authenticated
  USING (public.user_can_manage_finance(auth.uid(), school_id))
  WITH CHECK (public.user_can_manage_finance(auth.uid(), school_id));

-- ===== fee_plans =====
DROP POLICY IF EXISTS fp_all ON public.fee_plans;
CREATE POLICY fp_select ON public.fee_plans FOR SELECT TO authenticated
  USING (public.user_can_access_school(auth.uid(), school_id));
CREATE POLICY fp_write ON public.fee_plans FOR ALL TO authenticated
  USING (public.user_can_manage_finance(auth.uid(), school_id))
  WITH CHECK (public.user_can_manage_finance(auth.uid(), school_id));

-- ===== fee_plan_items =====
DROP POLICY IF EXISTS fpi_all ON public.fee_plan_items;
CREATE POLICY fpi_select ON public.fee_plan_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.fee_plans p WHERE p.id = fee_plan_id AND public.user_can_access_school(auth.uid(), p.school_id)));
CREATE POLICY fpi_write ON public.fee_plan_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.fee_plans p WHERE p.id = fee_plan_id AND public.user_can_manage_finance(auth.uid(), p.school_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.fee_plans p WHERE p.id = fee_plan_id AND public.user_can_manage_finance(auth.uid(), p.school_id)));

-- =========================================================
-- 3. Idempotency
-- =========================================================
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS client_request_id text;
CREATE UNIQUE INDEX IF NOT EXISTS payments_client_request_uniq
  ON public.payments (school_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

-- one journal per payment
CREATE UNIQUE INDEX IF NOT EXISTS payments_journal_entry_uniq
  ON public.payments (journal_entry_id)
  WHERE journal_entry_id IS NOT NULL;

-- one cash transaction per payment
CREATE UNIQUE INDEX IF NOT EXISTS cash_tx_payment_uniq
  ON public.cash_transactions (payment_id)
  WHERE payment_id IS NOT NULL;

-- guard: no duplicate non-cancelled invoice per (school, student, period)
CREATE UNIQUE INDEX IF NOT EXISTS invoices_period_uniq
  ON public.invoices (school_id, student_id, period_label)
  WHERE period_label IS NOT NULL AND status <> 'CANCELLED';

-- =========================================================
-- 4. Realtime publication for live dashboard
-- =========================================================
DO $$
BEGIN
  PERFORM 1 FROM pg_publication WHERE pubname = 'supabase_realtime';
  IF FOUND THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.students; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payments; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
