"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ReadableId } from "@/components/shared/ReadableId";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CreditCard,
  Search,
  RefreshCw,
  Receipt,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bill {
  id: string;
  readable_id: string;
  patient_id: string;
  patient_name: string;
  patient_readable_id: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
  created_at: string;
}

interface PaymentForm {
  amount: string;
  payment_method: string;
  reference: string;
}

const PAYMENT_METHODS = [
  "Cash",
  "Mobile money",
  "Bank transfer",
  "Credit card",
  "Insurance",
  "Cheque",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUGX(amount: number) {
  return `UGX ${amount.toLocaleString("en-UG")}`;
}

function formatDate(iso: string) {
  return format(new Date(iso), "d MMM yyyy, HH:mm");
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white px-5 py-4 flex items-center gap-4 shadow-sm">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: accent + "18", color: accent }}
      >
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#0F172A] leading-none">
          {value}
        </p>
        <p className="text-xs text-[#64748B] mt-1">{label}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReceptionistPaymentsPage() {
  const supabase = createClient();

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("unpaid");

  // Payment dialog
  const [dialog, setDialog] = useState<{ open: boolean; bill: Bill | null }>({
    open: false,
    bill: null,
  });
  const [form, setForm] = useState<PaymentForm>({
    amount: "",
    payment_method: "",
    reference: "",
  });
  const [saving, setSaving] = useState(false);

  // Success state
  const [lastPayment, setLastPayment] = useState<{
    patientName: string;
    amount: number;
    method: string;
  } | null>(null);

  // ── Fetch bills ────────────────────────────────────────────────────────────

  const fetchBills = useCallback(async () => {
    setLoading(true);

    // Always query bill_totals VIEW — never calculate client-side (Rule #1)
    const { data, error } = await supabase
      .from("bill_totals")
      .select(
        `
        id,
        readable_id,
        patient_id,
        status,
        created_at,
        total_amount,
        paid_amount,
        balance,
        patients ( full_name, readable_id )
      `
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast.error("Failed to load bills");
      setLoading(false);
      return;
    }

    setBills(
      (data ?? []).map((row: any) => ({
        id: row.id,
        readable_id: row.readable_id ?? "",
        patient_id: row.patient_id,
        patient_name: row.patients?.full_name ?? "—",
        patient_readable_id: row.patients?.readable_id ?? "",
        total_amount: row.total_amount ?? 0,
        paid_amount: row.paid_amount ?? 0,
        balance: row.balance ?? 0,
        status: row.status,
        created_at: row.created_at,
      }))
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // ── Open dialog ────────────────────────────────────────────────────────────

  function openDialog(bill: Bill) {
    setForm({
      amount: bill.balance > 0 ? String(bill.balance) : "",
      payment_method: "",
      reference: "",
    });
    setDialog({ open: true, bill });
    setLastPayment(null);
  }

  function closeDialog() {
    setDialog({ open: false, bill: null });
    setForm({ amount: "", payment_method: "", reference: "" });
  }

  // ── Validate ───────────────────────────────────────────────────────────────

  function validate(): string | null {
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0)
      return "Enter a valid payment amount.";
    if (dialog.bill && amt > dialog.bill.balance)
      return `Amount cannot exceed outstanding balance of ${formatUGX(dialog.bill.balance)}.`;
    if (!form.payment_method) return "Select a payment method.";
    return null;
  }

  // ── Submit payment — INSERT only, no edits (Rule #4) ──────────────────────

  async function handlePayment() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setSaving(true);

    const amt = parseFloat(form.amount);

    // Payments are INSERT-only — never update existing payment records
    const { error } = await supabase.from("payments").insert({
      bill_id: dialog.bill!.id,
      amount: amt,
      payment_method: form.payment_method,
      reference: form.reference.trim() || null,
      paid_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      toast.error("Could not record payment. Please try again.");
      return;
    }

    setLastPayment({
      patientName: dialog.bill!.patient_name,
      amount: amt,
      method: form.payment_method,
    });

    toast.success(`Payment of ${formatUGX(amt)} recorded`);
    closeDialog();
    fetchBills(); // Refresh totals from VIEW
  }

  // ── Filtered bills ─────────────────────────────────────────────────────────

  const visible = bills.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      b.patient_name.toLowerCase().includes(q) ||
      b.readable_id.toLowerCase().includes(q) ||
      b.patient_readable_id.toLowerCase().includes(q);

    const matchStatus =
      statusFilter === "all" ||
      b.status === statusFilter;

    return matchSearch && matchStatus;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalOutstanding = bills
    .filter((b) => b.balance > 0)
    .reduce((sum, b) => sum + b.balance, 0);
  const unpaidCount = bills.filter((b) => b.status === "unpaid").length;
  const partialCount = bills.filter((b) => b.status === "partial").length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0F172A]">Payments</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Record patient bill payments
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchBills}
          disabled={loading}
          className="gap-2 text-xs"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {/* Last payment toast banner */}
      {lastPayment && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800">
            <span className="font-medium">{formatUGX(lastPayment.amount)}</span>{" "}
            recorded via {lastPayment.method} for{" "}
            <span className="font-medium">{lastPayment.patientName}</span>
          </p>
          <button
            className="ml-auto text-emerald-500 hover:text-emerald-700 text-xs"
            onClick={() => setLastPayment(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total outstanding"
          value={formatUGX(totalOutstanding)}
          icon={AlertCircle}
          accent="#EF4444"
        />
        <StatCard
          label="Unpaid bills"
          value={String(unpaidCount)}
          icon={Receipt}
          accent="#F59E0B"
        />
        <StatCard
          label="Partially paid"
          value={String(partialCount)}
          icon={CreditCard}
          accent="#6366F1"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
          />
          <Input
            placeholder="Search patient or bill ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "all")}
        >
          <SelectTrigger className="w-44 text-sm">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All bills</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="partial">Partially paid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bills list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-[#E2E8F0] bg-white animate-pulse"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-[#E2E8F0] bg-white py-16">
          <EmptyState
            icon={Receipt}
            title="No bills found"
            description={
              search || statusFilter !== "all"
                ? "Try adjusting your search or filter."
                : "No bills have been created yet."
            }
          />
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((bill) => {
            const hasBalance = bill.balance > 0;
            return (
              <div
                key={bill.id}
                className="flex items-center gap-4 rounded-xl border border-[#E2E8F0] bg-white px-5 py-4 shadow-sm hover:border-[#0E7C6E]/30 transition-colors"
              >
                {/* Patient avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6F4F2] text-[#0E7C6E] text-sm font-semibold">
                  {bill.patient_name.charAt(0).toUpperCase()}
                </div>

                {/* Patient + bill ID */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0F172A] truncate">
                    {bill.patient_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <ReadableId id={bill.readable_id} />
                    <span className="text-[#CBD5E1] text-xs">·</span>
                    <span className="text-xs text-[#64748B]">
                      {formatDate(bill.created_at)}
                    </span>
                  </div>
                </div>

                {/* Amounts */}
                <div className="hidden sm:flex flex-col items-end w-36 shrink-0">
                  <p className="text-sm font-semibold text-[#0F172A] font-mono">
                    {formatUGX(bill.total_amount)}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    Paid:{" "}
                    <span className="font-mono text-[#0E7C6E]">
                      {formatUGX(bill.paid_amount)}
                    </span>
                  </p>
                </div>

                {/* Balance */}
                <div className="hidden md:flex flex-col items-end w-32 shrink-0">
                  <p
                    className={`text-sm font-semibold font-mono ${
                      bill.balance > 0 ? "text-red-600" : "text-[#0E7C6E]"
                    }`}
                  >
                    {formatUGX(bill.balance)}
                  </p>
                  <p className="text-xs text-[#94A3B8]">Balance</p>
                </div>

                {/* Status */}
                <div className="hidden sm:block shrink-0">
                  <StatusBadge type="bill" status={bill.status} />
                </div>

                {/* Action */}
                <div className="shrink-0">
                  {hasBalance ? (
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs gap-1.5 hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: "#0E7C6E", color: "#fff" }}
                      onClick={() => openDialog(bill)}
                    >
                      <CreditCard size={11} />
                      Pay
                    </Button>
                  ) : (
                    <span className="text-xs text-[#94A3B8] italic">
                      Settled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {!loading && visible.length > 0 && (
        <p className="text-xs text-[#94A3B8]">
          Showing {visible.length} of {bills.length} bills
        </p>
      )}

      {/* Payment dialog */}
      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Record payment</DialogTitle>
          </DialogHeader>

          {dialog.bill && (
            <div className="space-y-4 py-1">
              {/* Bill summary */}
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">Patient</span>
                  <span className="font-medium text-[#0F172A]">
                    {dialog.bill.patient_name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">Total bill</span>
                  <span className="font-mono text-[#0F172A]">
                    {formatUGX(dialog.bill.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">Already paid</span>
                  <span className="font-mono text-[#0E7C6E]">
                    {formatUGX(dialog.bill.paid_amount)}
                  </span>
                </div>
                <div className="h-px bg-[#E2E8F0]" />
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-[#64748B]">Balance due</span>
                  <span className="font-mono text-red-600">
                    {formatUGX(dialog.bill.balance)}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Amount (UGX) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={dialog.bill.balance}
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  className="font-mono"
                />
                {form.amount &&
                  !isNaN(parseFloat(form.amount)) &&
                  parseFloat(form.amount) > 0 && (
                    <p className="text-xs text-[#64748B]">
                      Remaining after payment:{" "}
                      <span
                        className={`font-mono font-semibold ${
                          dialog.bill.balance - parseFloat(form.amount) <= 0
                            ? "text-[#0E7C6E]"
                            : "text-red-500"
                        }`}
                      >
                        {formatUGX(
                          Math.max(
                            0,
                            dialog.bill.balance - parseFloat(form.amount)
                          )
                        )}
                      </span>
                    </p>
                  )}
              </div>

              {/* Payment method */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Payment method <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.payment_method}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, payment_method: v ?? "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reference */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Reference{" "}
                  <span className="text-[#94A3B8] font-normal">(optional)</span>
                </Label>
                <Input
                  placeholder="e.g. transaction ID, receipt number"
                  value={form.reference}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reference: e.target.value }))
                  }
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handlePayment}
              disabled={saving}
              style={{ backgroundColor: "#0E7C6E", color: "#fff" }}
              className="gap-1.5 hover:opacity-90 transition-opacity min-w-[120px]"
            >
              <CreditCard size={13} />
              {saving ? "Recording…" : "Record payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}