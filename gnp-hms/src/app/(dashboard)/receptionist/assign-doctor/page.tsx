"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ReadableId } from "@/components/shared/ReadableId";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Stethoscope,
  Search,
  RefreshCw,
  UserCheck,
  CalendarDays,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Appointment {
  id: string;
  readable_id: string;
  patient_name: string;
  patient_phone: string;
  doctor_id: string | null;
  doctor_name: string | null;
  scheduled_at: string;
  appointment_type: string;
  status: string;
}

interface Doctor {
  id: string;
  full_name: string;
  specialization: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return format(new Date(iso), "d MMM yyyy, HH:mm");
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AssignDoctorPage() {
  const supabase = createClient();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Reassign dialog
  const [dialog, setDialog] = useState<{
    open: boolean;
    appt: Appointment | null;
  }>({ open: false, appt: null });
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [apptRes, docRes] = await Promise.all([
      supabase
        .from("appointments")
        .select(
          `
          id,
          readable_id,
          scheduled_at,
          appointment_type,
          status,
          doctor_id,
          patients ( full_name, phone ),
          doctors ( id, specialization, users ( full_name ) )
        `
        )
        .in("status", ["scheduled", "confirmed", "checked_in"])
        .order("scheduled_at", { ascending: true })
        .limit(50),

      supabase
        .from("doctors")
        .select("id, specialization, users ( full_name )")
        .order("users(full_name)", { ascending: true }),
    ]);

    if (apptRes.error) {
      toast.error("Failed to load appointments");
    } else {
      setAppointments(
        (apptRes.data ?? []).map((row: any) => ({
          id: row.id,
          readable_id: row.readable_id ?? "",
          patient_name: row.patients?.full_name ?? "—",
          patient_phone: row.patients?.phone ?? "—",
          doctor_id: row.doctor_id ?? null,
          doctor_name: row.doctors?.users?.full_name ?? null,
          scheduled_at: row.scheduled_at,
          appointment_type: row.appointment_type ?? "",
          status: row.status,
        }))
      );
    }

    if (!docRes.error) {
      setDoctors(
        (docRes.data ?? []).map((d: any) => ({
          id: d.id ?? "",
          full_name: d.users?.full_name ?? "Unknown",
          specialization: d.specialization ?? null,
        }))
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Open dialog ────────────────────────────────────────────────────────────

  function openDialog(appt: Appointment) {
    setSelectedDoctor(appt.doctor_id ?? "");
    setDialog({ open: true, appt });
  }

  function closeDialog() {
    setDialog({ open: false, appt: null });
    setSelectedDoctor("");
  }

  // ── Assign ─────────────────────────────────────────────────────────────────

  async function handleAssign() {
    if (!dialog.appt || !selectedDoctor) {
      toast.error("Please select a doctor.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("appointments")
      .update({ doctor_id: selectedDoctor })
      .eq("id", dialog.appt.id);

    setSaving(false);

    if (error) {
      toast.error("Could not assign doctor.");
      return;
    }

    const doc = doctors.find((d) => d.id === selectedDoctor);
    toast.success(
      `Dr. ${doc?.full_name ?? "Doctor"} assigned to ${dialog.appt.patient_name}`
    );

    // Optimistic update
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === dialog.appt!.id
          ? {
              ...a,
              doctor_id: selectedDoctor,
              doctor_name: doc?.full_name ?? null,
            }
          : a
      )
    );

    closeDialog();
  }

  // ── Filtered ───────────────────────────────────────────────────────────────

  const unassigned = appointments.filter((a) => !a.doctor_id);
  const assigned = appointments.filter((a) => !!a.doctor_id);

  const filterAppts = (list: Appointment[]) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (a) =>
        a.patient_name.toLowerCase().includes(q) ||
        a.readable_id.toLowerCase().includes(q) ||
        (a.doctor_name ?? "").toLowerCase().includes(q)
    );
  };

  const visibleUnassigned = filterAppts(unassigned);
  const visibleAssigned = filterAppts(assigned);

  // ── Row ────────────────────────────────────────────────────────────────────

  function AppointmentRow({
    appt,
    highlight,
  }: {
    appt: Appointment;
    highlight?: boolean;
  }) {
    return (
      <div
        className={`flex items-center gap-4 rounded-xl border bg-white px-5 py-3.5 shadow-sm transition-colors ${
          highlight
            ? "border-amber-200 bg-amber-50/40"
            : "border-[#E2E8F0] hover:border-[#0E7C6E]/30"
        }`}
      >
        {/* Patient avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6F4F2] text-[#0E7C6E] text-sm font-semibold">
          {appt.patient_name.charAt(0).toUpperCase()}
        </div>

        {/* Patient info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#0F172A] truncate">
            {appt.patient_name}
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <ReadableId id={appt.readable_id} />
            <span className="text-[#CBD5E1] text-xs">·</span>
            <span className="text-xs text-[#64748B]">
              {appt.appointment_type}
            </span>
          </div>
        </div>

        {/* Scheduled time */}
        <div className="hidden sm:flex flex-col w-36 shrink-0">
          <span className="text-xs text-[#94A3B8]">Scheduled</span>
          <span className="text-xs font-mono text-[#0F172A]">
            {formatDateTime(appt.scheduled_at)}
          </span>
        </div>

        {/* Doctor */}
        <div className="hidden md:flex flex-col w-40 shrink-0">
          <span className="text-xs text-[#94A3B8]">Doctor</span>
          <span
            className={`text-sm truncate ${
              appt.doctor_name ? "text-[#0F172A]" : "text-amber-500 italic"
            }`}
          >
            {appt.doctor_name ? `Dr. ${appt.doctor_name}` : "Unassigned"}
          </span>
        </div>

        {/* Status */}
        <div className="hidden sm:block shrink-0">
          <StatusBadge type="appointment" status={appt.status} />
        </div>

        {/* Action */}
        <div className="shrink-0">
          <Button
            size="sm"
            variant={appt.doctor_name ? "outline" : "default"}
            className={`h-7 px-3 text-xs gap-1.5 ${
              !appt.doctor_name
                ? "hover:opacity-90 transition-opacity"
                : ""
            }`}
            style={
              !appt.doctor_name
                ? { backgroundColor: "#0E7C6E", color: "#fff" }
                : {}
            }
            onClick={() => openDialog(appt)}
          >
            <UserCheck size={11} />
            {appt.doctor_name ? "Reassign" : "Assign"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0F172A]">
            Assign doctor
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Assign or reassign doctors to active appointments
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="gap-2 text-xs"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
          <span className="text-lg font-semibold font-mono text-amber-600">
            {unassigned.length}
          </span>
          <span className="text-xs text-amber-700">Unassigned</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5">
          <span className="text-lg font-semibold font-mono text-[#0E7C6E]">
            {assigned.length}
          </span>
          <span className="text-xs text-[#64748B]">Assigned</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
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

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl border border-[#E2E8F0] bg-white animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Unassigned section */}
          {visibleUnassigned.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                Needs assignment ({visibleUnassigned.length})
              </h2>
              {visibleUnassigned.map((a) => (
                <AppointmentRow key={a.id} appt={a} highlight />
              ))}
            </div>
          )}

          {/* Assigned section */}
          {visibleAssigned.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#0E7C6E]" />
                Assigned ({visibleAssigned.length})
              </h2>
              {visibleAssigned.map((a) => (
                <AppointmentRow key={a.id} appt={a} />
              ))}
            </div>
          )}

          {/* Empty */}
          {visibleUnassigned.length === 0 && visibleAssigned.length === 0 && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white py-16">
              <EmptyState
                icon={CalendarDays}
                title="No appointments found"
                description={
                  search
                    ? "Try a different search term."
                    : "No active appointments to display."
                }
              />
            </div>
          )}
        </>
      )}

      {/* Assign / Reassign Dialog */}
      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {dialog.appt?.doctor_id ? "Reassign doctor" : "Assign doctor"}
            </DialogTitle>
          </DialogHeader>

          {dialog.appt && (
            <div className="space-y-4 py-1">
              {/* Appointment context */}
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm space-y-1">
                <p className="font-medium text-[#0F172A]">
                  {dialog.appt.patient_name}
                </p>
                <p className="text-xs text-[#64748B]">
                  {dialog.appt.appointment_type} ·{" "}
                  {formatDateTime(dialog.appt.scheduled_at)}
                </p>
                {dialog.appt.doctor_name && (
                  <p className="text-xs text-[#64748B]">
                    Currently:{" "}
                    <span className="font-medium text-[#0F172A]">
                      Dr. {dialog.appt.doctor_name}
                    </span>
                  </p>
                )}
              </div>

              {/* Doctor select */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Select doctor <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedDoctor}
                  onValueChange={(v) => setSelectedDoctor(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="font-medium">Dr. {d.full_name}</span>
                        {d.specialization && (
                          <span className="text-[#64748B] ml-1.5 text-xs">
                            · {d.specialization}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAssign}
              disabled={saving || !selectedDoctor}
              style={{ backgroundColor: "#0E7C6E", color: "#fff" }}
              className="gap-1.5 hover:opacity-90 transition-opacity"
            >
              <Stethoscope size={13} />
              {saving ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}