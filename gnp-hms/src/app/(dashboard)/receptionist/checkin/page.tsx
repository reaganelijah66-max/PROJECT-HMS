"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ReadableId } from "@/components/shared/ReadableId";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format, isToday } from "date-fns";
import {
  ClipboardCheck,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarDays,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

interface Appointment {
  id: string;
  readable_id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
  scheduled_at: string;
  appointment_type: string;
  status: AppointmentStatus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isActionable(status: AppointmentStatus) {
  return status === "scheduled" || status === "confirmed";
}

function formatTime(iso: string) {
  return format(new Date(iso), "HH:mm");
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  return format(d, "d MMM yyyy");
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 shadow-sm">
      <span
        className="text-xl font-semibold font-mono leading-none"
        style={{ color }}
      >
        {value}
      </span>
      <span className="text-xs text-[#64748B]">{label}</span>
    </div>
  );
}

// ─── Row action buttons ───────────────────────────────────────────────────────

function RowActions({
  appt,
  onUpdate,
}: {
  appt: Appointment;
  onUpdate: (id: string, status: AppointmentStatus) => Promise<void>;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handle(status: AppointmentStatus) {
    setLoading(status);
    await onUpdate(appt.id, status);
    setLoading(null);
  }

  if (!isActionable(appt.status)) {
    return (
      <span className="text-xs text-[#94A3B8] italic">
        {appt.status === "checked_in" ? "Checked in" : "—"}
      </span>
    );
  }

  return (
    <div className="inline-flex gap-1.5">
      <Button
        size="sm"
        className="h-7 px-3 text-xs gap-1.5 hover:opacity-90 transition-opacity"
        style={{ backgroundColor: "#0E7C6E", color: "#fff" }}
        disabled={!!loading}
        onClick={() => handle("checked_in")}
      >
        <CheckCircle2 size={11} />
        {loading === "checked_in" ? "…" : "Check in"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs gap-1 text-red-500 hover:text-red-600 hover:border-red-300"
        disabled={!!loading}
        onClick={() => handle("no_show")}
      >
        <XCircle size={11} />
        {loading === "no_show" ? "…" : "No show"}
      </Button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CheckInPage() {
  const supabase = createClient();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">(
    "all"
  );

  // ── Fetch today's appointments ─────────────────────────────────────────────

  const fetchAppointments = useCallback(async () => {
    setLoading(true);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        id,
        readable_id,
        scheduled_at,
        appointment_type,
        status,
        patients ( id, full_name, phone ),
        doctors ( users ( full_name ) )
      `
      )
      .gte("scheduled_at", todayStart.toISOString())
      .lte("scheduled_at", todayEnd.toISOString())
      .order("scheduled_at", { ascending: true });

    if (error) {
      toast.error("Failed to load appointments");
      setLoading(false);
      return;
    }

    setAppointments(
      (data ?? []).map((row: any) => ({
        id: row.id,
        readable_id: row.readable_id ?? "",
        patient_id: row.patients?.id ?? "",
        patient_name: row.patients?.full_name ?? "—",
        patient_phone: row.patients?.phone ?? "—",
        doctor_name: row.doctors?.users?.full_name ?? "—",
        scheduled_at: row.scheduled_at,
        appointment_type: row.appointment_type ?? "",
        status: row.status as AppointmentStatus,
      }))
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ── Update status ──────────────────────────────────────────────────────────

  async function handleStatusUpdate(
    id: string,
    newStatus: AppointmentStatus
  ) {
    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Could not update appointment status");
      return;
    }

    const label =
      newStatus === "checked_in" ? "Patient checked in" : "Marked as no-show";
    toast.success(label);

    // Optimistic update
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const total = appointments.length;
  const waiting = appointments.filter((a) =>
    ["scheduled", "confirmed"].includes(a.status)
  ).length;
  const checkedIn = appointments.filter(
    (a) => a.status === "checked_in"
  ).length;
  const noShow = appointments.filter((a) => a.status === "no_show").length;

  // ── Filtered list ──────────────────────────────────────────────────────────

  const visible = appointments.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      a.patient_name.toLowerCase().includes(q) ||
      a.patient_phone.includes(q) ||
      a.readable_id.toLowerCase().includes(q) ||
      a.doctor_name.toLowerCase().includes(q);

    const matchStatus =
      statusFilter === "all" || a.status === statusFilter;

    return matchSearch && matchStatus;
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0F172A]">Check-in</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {format(new Date(), "EEEE, d MMMM yyyy")} · Today&apos;s
            appointments
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAppointments}
          disabled={loading}
          className="gap-2 text-xs"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <StatPill label="Total today" value={total} color="#0F172A" />
        <StatPill label="Waiting" value={waiting} color="#F59E0B" />
        <StatPill label="Checked in" value={checkedIn} color="#0E7C6E" />
        <StatPill label="No-show" value={noShow} color="#EF4444" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
          />
          <Input
            placeholder="Search patient, doctor, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as AppointmentStatus | "all")
          }
        >
          <SelectTrigger className="w-44 text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="checked_in">Checked in</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="no_show">No-show</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Appointment list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl border border-[#E2E8F0] bg-white animate-pulse"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-[#E2E8F0] bg-white py-16">
          <EmptyState
            icon={CalendarDays}
            title="No appointments found"
            description={
              search || statusFilter !== "all"
                ? "Try adjusting your search or filter."
                : "No appointments are scheduled for today."
            }
          />
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((appt) => {
            const actionable = isActionable(appt.status);
            return (
              <div
                key={appt.id}
                className={`rounded-xl border bg-white shadow-sm transition-colors ${
                  actionable
                    ? "border-[#E2E8F0] hover:border-[#0E7C6E]/30"
                    : "border-[#F1F5F9] opacity-75"
                }`}
              >
                <div className="flex items-center gap-4 px-5 py-3.5">
                  {/* Time block */}
                  <div className="flex flex-col items-center w-12 shrink-0">
                    <span className="text-sm font-mono font-semibold text-[#0F172A]">
                      {formatTime(appt.scheduled_at)}
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">
                      {formatDateLabel(appt.scheduled_at)}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-10 bg-[#E2E8F0] shrink-0" />

                  {/* Patient info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6F4F2] text-[#0E7C6E] text-sm font-semibold">
                      {appt.patient_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">
                        {appt.patient_name}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <ReadableId id={appt.readable_id} />
                        <span className="text-[#CBD5E1] text-xs">·</span>
                        <span className="text-xs text-[#64748B]">
                          {appt.appointment_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor */}
                  <div className="hidden md:flex flex-col min-w-0 w-40 shrink-0">
                    <span className="text-xs text-[#94A3B8]">Doctor</span>
                    <span className="text-sm text-[#0F172A] truncate">
                      Dr. {appt.doctor_name}
                    </span>
                  </div>

                  {/* Status badge */}
                  <div className="hidden sm:block shrink-0">
                    <StatusBadge type="appointment" status={appt.status} />
                  </div>

                  {/* Actions */}
                  <div className="shrink-0">
                    <RowActions appt={appt} onUpdate={handleStatusUpdate} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {!loading && visible.length > 0 && (
        <p className="text-xs text-[#94A3B8]">
          Showing {visible.length} of {total} appointments
        </p>
      )}
    </div>
  );
}