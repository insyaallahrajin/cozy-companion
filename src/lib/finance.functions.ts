import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();
const money = z.number().nonnegative();

// ============ FEE CATEGORIES ============
export const listFeeCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ school_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("fee_categories").select("*").eq("school_id", data.school_id).order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertFeeCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: uuid.optional(),
    school_id: uuid,
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional().nullable(),
    default_amount: money.default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase.from("fee_categories").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("fee_categories").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteFeeCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("fee_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ CASH ACCOUNTS ============
export const listCashAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ school_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("cash_accounts").select("*").eq("school_id", data.school_id).order("name");
    if (error) throw new Error(error.message);
    // compute balance
    const ids = (rows ?? []).map((r: any) => r.id);
    const balances: Record<string, number> = {};
    if (ids.length) {
      const { data: tx } = await context.supabase
        .from("cash_transactions").select("cash_account_id,kind,amount").in("cash_account_id", ids);
      (tx ?? []).forEach((t: any) => {
        balances[t.cash_account_id] = (balances[t.cash_account_id] ?? 0) +
          (t.kind === "IN" ? Number(t.amount) : -Number(t.amount));
      });
    }
    return (rows ?? []).map((r: any) => ({ ...r, balance: Number(r.opening_balance) + (balances[r.id] ?? 0) }));
  });

export const upsertCashAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: uuid.optional(),
    school_id: uuid,
    name: z.string().min(1).max(120),
    type: z.enum(["CASH","BANK"]).default("CASH"),
    bank_name: z.string().max(120).optional().nullable(),
    account_number: z.string().max(64).optional().nullable(),
    opening_balance: money.default(0),
    is_active: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase.from("cash_accounts").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("cash_accounts").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ============ FEE PLANS ============
export const listFeePlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ school_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("fee_plans")
      .select("*, fee_plan_items(*, fee_categories(name)), academic_years(name)")
      .eq("school_id", data.school_id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertFeePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: uuid.optional(),
    school_id: uuid,
    academic_year_id: uuid,
    name: z.string().min(1).max(120),
    grade_level: z.number().int().nullable().optional(),
    notes: z.string().max(500).optional().nullable(),
    items: z.array(z.object({
      fee_category_id: uuid,
      amount: money,
      recurrence: z.enum(["ONCE","MONTHLY"]).default("MONTHLY"),
      due_day: z.number().int().min(1).max(28).default(10),
    })).default([]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { items, id, ...header } = data;
    let planId = id;
    if (planId) {
      const { error } = await context.supabase.from("fee_plans").update(header).eq("id", planId);
      if (error) throw new Error(error.message);
      await context.supabase.from("fee_plan_items").delete().eq("fee_plan_id", planId);
    } else {
      const { data: ins, error } = await context.supabase.from("fee_plans").insert(header).select("id").single();
      if (error) throw new Error(error.message);
      planId = ins!.id;
    }
    if (items.length) {
      const { error } = await context.supabase.from("fee_plan_items")
        .insert(items.map((it) => ({ ...it, fee_plan_id: planId })));
      if (error) throw new Error(error.message);
    }
    return { ok: true, id: planId };
  });

export const deleteFeePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("fee_plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ INVOICES ============
export const listInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    school_id: uuid,
    status: z.enum(["UNPAID","PARTIAL","PAID","CANCELLED"]).optional(),
    student_id: uuid.optional(),
    period: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("invoices")
      .select("*, students(full_name, nisn, nis), invoice_items(*)")
      .eq("school_id", data.school_id).order("issue_date", { ascending: false }).limit(500);
    if (data.status) q = q.eq("status", data.status);
    if (data.student_id) q = q.eq("student_id", data.student_id);
    if (data.period) q = q.eq("period_label", data.period);
    if (data.from) q = q.gte("issue_date", data.from);
    if (data.to) q = q.lte("issue_date", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

async function nextSeq(supabase: any, table: string, school_id: string, col: string, prefix: string) {
  const { data } = await supabase.from(table).select(col).eq("school_id", school_id)
    .like(col, `${prefix}%`).order(col, { ascending: false }).limit(1);
  const last = data?.[0]?.[col] as string | undefined;
  const n = last ? parseInt(last.replace(prefix, ""), 10) + 1 : 1;
  return `${prefix}${String(n).padStart(5, "0")}`;
}

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    school_id: uuid,
    student_id: uuid,
    academic_year_id: uuid.nullable().optional(),
    period_label: z.string().max(32).optional().nullable(),
    due_date: z.string(),
    notes: z.string().max(500).optional().nullable(),
    items: z.array(z.object({
      fee_category_id: uuid.optional(),
      description: z.string().min(1).max(200),
      amount: money,
    })).min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const total = data.items.reduce((s, i) => s + Number(i.amount), 0);
    const invoice_no = await nextSeq(context.supabase, "invoices", data.school_id, "invoice_no", "INV-");
    const { data: ins, error } = await context.supabase.from("invoices").insert({
      school_id: data.school_id, student_id: data.student_id,
      academic_year_id: data.academic_year_id ?? null,
      invoice_no, period_label: data.period_label ?? null,
      due_date: data.due_date, total_amount: total, notes: data.notes ?? null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    const { error: e2 } = await context.supabase.from("invoice_items")
      .insert(data.items.map((it) => ({ ...it, invoice_id: ins!.id })));
    if (e2) throw new Error(e2.message);
    return { ok: true, id: ins!.id, invoice_no };
  });

export const generateInvoicesFromPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    school_id: uuid,
    fee_plan_id: uuid,
    period_label: z.string().min(1).max(32),
    due_date: z.string(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: plan, error: pe } = await context.supabase
      .from("fee_plans").select("*, fee_plan_items(*, fee_categories(name))")
      .eq("id", data.fee_plan_id).single();
    if (pe || !plan) throw new Error(pe?.message ?? "Plan tidak ditemukan");

    // find students enrolled AKTIF in classes of this academic year (and grade if set)
    let cq = context.supabase.from("classes").select("id, grade_level")
      .eq("school_id", data.school_id).eq("academic_year_id", plan.academic_year_id);
    if (plan.grade_level != null) cq = cq.eq("grade_level", plan.grade_level);
    const { data: classes, error: ce } = await cq;
    if (ce) throw new Error(ce.message);
    const classIds = (classes ?? []).map((c: any) => c.id);
    if (classIds.length === 0) return { ok: true, created: 0, skipped: 0 };

    const { data: enrolls, error: ee } = await context.supabase
      .from("student_enrollments").select("student_id")
      .in("class_id", classIds).eq("status", "AKTIF");
    if (ee) throw new Error(ee.message);
    const studentIds = Array.from(new Set((enrolls ?? []).map((e: any) => e.student_id)));
    if (studentIds.length === 0) return { ok: true, created: 0, skipped: 0 };

    // skip students that already have invoice for this period
    const { data: existing } = await context.supabase.from("invoices")
      .select("student_id").eq("school_id", data.school_id)
      .eq("period_label", data.period_label).in("student_id", studentIds);
    const skip = new Set((existing ?? []).map((e: any) => e.student_id));

    const items = (plan as any).fee_plan_items as any[];
    const total = items.reduce((s, i) => s + Number(i.amount), 0);

    let created = 0;
    for (const sid of studentIds) {
      if (skip.has(sid)) continue;
      const invoice_no = await nextSeq(context.supabase, "invoices", data.school_id, "invoice_no", "INV-");
      const { data: inv, error } = await context.supabase.from("invoices").insert({
        school_id: data.school_id, student_id: sid,
        academic_year_id: plan.academic_year_id,
        invoice_no, period_label: data.period_label,
        due_date: data.due_date, total_amount: total,
        notes: `Auto dari paket: ${plan.name}`,
      }).select("id").single();
      if (error) continue;
      await context.supabase.from("invoice_items").insert(items.map((it: any) => ({
        invoice_id: inv!.id,
        fee_category_id: it.fee_category_id,
        description: it.fee_categories?.name ?? "Item",
        amount: it.amount,
      })));
      created += 1;
    }
    return { ok: true, created, skipped: studentIds.length - created };
  });

export const cancelInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("invoices")
      .update({ status: "CANCELLED" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ PAYMENTS ============
export const listPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    school_id: uuid,
    from: z.string().optional(),
    to: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("payments")
      .select("*, invoices(invoice_no, period_label), students(full_name), cash_accounts(name)")
      .eq("school_id", data.school_id).order("paid_at", { ascending: false }).limit(500);
    if (data.from) q = q.gte("paid_at", data.from);
    if (data.to) q = q.lte("paid_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    school_id: uuid,
    invoice_id: uuid.optional().nullable(),
    student_id: uuid.optional().nullable(),
    cash_account_id: uuid,
    amount: z.number().positive(),
    method: z.enum(["TUNAI","TRANSFER","QRIS","VA","LAINNYA"]).default("TUNAI"),
    reference: z.string().max(120).optional().nullable(),
    paid_at: z.string(),
    notes: z.string().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    // load cash account name
    const { data: acc, error: ae } = await sb.from("cash_accounts")
      .select("name, type").eq("id", data.cash_account_id).single();
    if (ae || !acc) throw new Error("Akun kas tidak ditemukan");

    const payment_no = await nextSeq(sb, "payments", data.school_id, "payment_no", "PAY-");
    const entry_no = await nextSeq(sb, "journal_entries", data.school_id, "entry_no", "JRN-");

    // create journal: Dr Kas/Bank, Cr Pendapatan SPP
    const { data: je, error: jee } = await sb.from("journal_entries").insert({
      school_id: data.school_id,
      entry_no, entry_date: data.paid_at,
      description: `Penerimaan pembayaran ${payment_no}`,
      source: "PAYMENT",
    }).select("id").single();
    if (jee) throw new Error(jee.message);
    const accCode = acc.type === "BANK" ? "1-1200" : "1-1100";
    const accName = acc.type === "BANK" ? `Bank — ${acc.name}` : `Kas — ${acc.name}`;
    await sb.from("journal_lines").insert([
      { journal_entry_id: je!.id, account_code: accCode, account_name: accName, debit: data.amount, credit: 0 },
      { journal_entry_id: je!.id, account_code: "4-1100", account_name: "Pendapatan SPP", debit: 0, credit: data.amount },
    ]);

    const { data: pay, error: pe } = await sb.from("payments").insert({
      school_id: data.school_id,
      invoice_id: data.invoice_id ?? null,
      student_id: data.student_id ?? null,
      cash_account_id: data.cash_account_id,
      payment_no, amount: data.amount,
      method: data.method, reference: data.reference ?? null,
      paid_at: data.paid_at, notes: data.notes ?? null,
      journal_entry_id: je!.id,
    }).select("id").single();
    if (pe) throw new Error(pe.message);

    await sb.from("cash_transactions").insert({
      school_id: data.school_id,
      cash_account_id: data.cash_account_id,
      kind: "IN", amount: data.amount,
      category: data.invoice_id ? "SPP" : "PENERIMAAN_LAIN",
      description: data.notes ?? `Pembayaran ${payment_no}`,
      occurred_at: data.paid_at,
      payment_id: pay!.id,
      journal_entry_id: je!.id,
    });

    if (data.invoice_id) {
      const { data: inv } = await sb.from("invoices").select("total_amount, paid_amount")
        .eq("id", data.invoice_id).single();
      if (inv) {
        const newPaid = Number(inv.paid_amount) + Number(data.amount);
        const status = newPaid >= Number(inv.total_amount) ? "PAID"
          : newPaid > 0 ? "PARTIAL" : "UNPAID";
        await sb.from("invoices").update({ paid_amount: newPaid, status })
          .eq("id", data.invoice_id);
      }
    }
    return { ok: true, id: pay!.id, payment_no };
  });

// ============ CASH TRANSACTIONS (manual) ============
export const listCashTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    school_id: uuid,
    from: z.string().optional(),
    to: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("cash_transactions")
      .select("*, cash_accounts(name, type)").eq("school_id", data.school_id)
      .order("occurred_at", { ascending: false }).limit(500);
    if (data.from) q = q.gte("occurred_at", data.from);
    if (data.to) q = q.lte("occurred_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createCashTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    school_id: uuid,
    cash_account_id: uuid,
    kind: z.enum(["IN","OUT"]),
    amount: z.number().positive(),
    category: z.string().max(64).optional().nullable(),
    description: z.string().min(1).max(300),
    occurred_at: z.string(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: acc } = await sb.from("cash_accounts").select("name, type").eq("id", data.cash_account_id).single();
    const entry_no = await nextSeq(sb, "journal_entries", data.school_id, "entry_no", "JRN-");
    const accCode = acc?.type === "BANK" ? "1-1200" : "1-1100";
    const accName = `${acc?.type === "BANK" ? "Bank" : "Kas"} — ${acc?.name ?? ""}`;
    const counterCode = data.kind === "IN" ? "4-9000" : "5-9000";
    const counterName = data.kind === "IN" ? `Pendapatan Lain — ${data.category ?? "Umum"}` : `Beban — ${data.category ?? "Umum"}`;

    const { data: je } = await sb.from("journal_entries").insert({
      school_id: data.school_id, entry_no, entry_date: data.occurred_at,
      description: data.description, source: "CASH",
    }).select("id").single();
    if (data.kind === "IN") {
      await sb.from("journal_lines").insert([
        { journal_entry_id: je!.id, account_code: accCode, account_name: accName, debit: data.amount, credit: 0 },
        { journal_entry_id: je!.id, account_code: counterCode, account_name: counterName, debit: 0, credit: data.amount },
      ]);
    } else {
      await sb.from("journal_lines").insert([
        { journal_entry_id: je!.id, account_code: counterCode, account_name: counterName, debit: data.amount, credit: 0 },
        { journal_entry_id: je!.id, account_code: accCode, account_name: accName, debit: 0, credit: data.amount },
      ]);
    }

    const { error } = await sb.from("cash_transactions").insert({
      ...data, journal_entry_id: je!.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ JOURNAL ============
export const listJournalEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    school_id: uuid,
    from: z.string().optional(),
    to: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("journal_entries")
      .select("*, journal_lines(*)").eq("school_id", data.school_id)
      .order("entry_date", { ascending: false }).limit(500);
    if (data.from) q = q.gte("entry_date", data.from);
    if (data.to) q = q.lte("entry_date", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============ REPORT ============
export const getFinanceReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    school_id: uuid, from: z.string(), to: z.string(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const [inv, pay, ctx, je] = await Promise.all([
      sb.from("invoices").select("total_amount, paid_amount, status, issue_date")
        .eq("school_id", data.school_id).gte("issue_date", data.from).lte("issue_date", data.to),
      sb.from("payments").select("amount, method, paid_at")
        .eq("school_id", data.school_id).gte("paid_at", data.from).lte("paid_at", data.to),
      sb.from("cash_transactions").select("kind, amount, occurred_at")
        .eq("school_id", data.school_id).gte("occurred_at", data.from).lte("occurred_at", data.to),
      sb.from("journal_entries").select("id, journal_lines(debit, credit, account_code, account_name)")
        .eq("school_id", data.school_id).gte("entry_date", data.from).lte("entry_date", data.to),
    ]);

    const invoices = inv.data ?? [];
    const payments = pay.data ?? [];
    const txs = ctx.data ?? [];
    const journals = je.data ?? [];

    const totalInvoiced = invoices.reduce((s: number, i: any) => s + Number(i.total_amount), 0);
    const totalPaidInvoices = invoices.reduce((s: number, i: any) => s + Number(i.paid_amount), 0);
    const outstanding = invoices.filter((i: any) => i.status !== "CANCELLED")
      .reduce((s: number, i: any) => s + (Number(i.total_amount) - Number(i.paid_amount)), 0);
    const totalPayments = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const cashIn = txs.filter((t: any) => t.kind === "IN").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const cashOut = txs.filter((t: any) => t.kind === "OUT").reduce((s: number, t: any) => s + Number(t.amount), 0);

    // ledger by account
    const ledger: Record<string, { code: string; name: string; debit: number; credit: number }> = {};
    journals.forEach((j: any) => {
      (j.journal_lines ?? []).forEach((l: any) => {
        const k = l.account_code;
        if (!ledger[k]) ledger[k] = { code: l.account_code, name: l.account_name, debit: 0, credit: 0 };
        ledger[k].debit += Number(l.debit);
        ledger[k].credit += Number(l.credit);
      });
    });

    return {
      summary: { totalInvoiced, totalPaidInvoices, outstanding, totalPayments, cashIn, cashOut, net: cashIn - cashOut },
      ledger: Object.values(ledger).sort((a, b) => a.code.localeCompare(b.code)),
      invoiceCount: invoices.length,
      paymentCount: payments.length,
    };
  });

// ============ DASHBOARD ============
export const getDashboardStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ school_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const today = new Date().toISOString().slice(0, 10);

    const [students, staff, classesCount, ay, classRows, invs, accs] = await Promise.all([
      sb.from("students").select("id", { count: "exact", head: true })
        .eq("school_id", data.school_id).eq("status", "AKTIF"),
      sb.from("staff").select("id", { count: "exact", head: true })
        .eq("school_id", data.school_id).eq("status", "ACTIVE"),
      sb.from("classes").select("id", { count: "exact", head: true })
        .eq("school_id", data.school_id).eq("status", "ACTIVE"),
      sb.from("academic_years").select("id").eq("school_id", data.school_id).eq("is_active", true).maybeSingle(),
      sb.from("classes").select("id").eq("school_id", data.school_id),
      sb.from("invoices").select("total_amount, paid_amount, status").eq("school_id", data.school_id),
      sb.from("cash_accounts").select("id, opening_balance").eq("school_id", data.school_id),
    ]);

    const classIds = (classRows.data ?? []).map((c: any) => c.id);
    let attRows: any[] = [];
    if (classIds.length) {
      const { data: ar } = await sb.from("attendance").select("status")
        .in("class_id", classIds).eq("attendance_date", today);
      attRows = ar ?? [];
    }
    const present = attRows.filter((a: any) => a.status === "HADIR" || a.status === "TERLAMBAT").length;
    const attendanceRate = attRows.length > 0 ? (present / attRows.length) * 100 : null;

    const outstanding = (invs.data ?? []).filter((i: any) => i.status !== "CANCELLED")
      .reduce((s: number, i: any) => s + (Number(i.total_amount) - Number(i.paid_amount)), 0);

    // cash balance
    let cashBalance = (accs.data ?? []).reduce((s: number, a: any) => s + Number(a.opening_balance), 0);
    const accIds = (accs.data ?? []).map((a: any) => a.id);
    if (accIds.length) {
      const { data: tx } = await sb.from("cash_transactions")
        .select("kind, amount").in("cash_account_id", accIds);
      (tx ?? []).forEach((t: any) => {
        cashBalance += t.kind === "IN" ? Number(t.amount) : -Number(t.amount);
      });
    }

    return {
      studentsCount: students.count ?? 0,
      staffCount: staff.count ?? 0,
      classesCount: classes.count ?? 0,
      attendanceRate,
      attendanceRecorded: attRows.length,
      outstanding,
      cashBalance,
      activeYearId: ay.data?.id ?? null,
    };
  });
