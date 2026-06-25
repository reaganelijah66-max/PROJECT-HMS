"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import {
  CalendarPlus,
  ChevronLeft,
  CheckCircle2,
  Search,
  User,
  Stethoscope,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Patient {
  id: string;
  readable_id: string;
  full_name: string;
  phone: string;
}

interface Doctor {
  id: string;
  user_id: string;
  full_name: string;
  specialization: string | null;
}

interface AppointmentForm {
  patient_id: string;
  doctor_id: string;
  scheduled_date: string;
  scheduled_time: string;
  appointment_type: string;
  notes: string;
}

const EMPTY_FORM: AppointmentForm = {
  patient_id: "",
  doctor_id: "",
  scheduled_date: "",
  scheduled_time: "",
  appointment_type: "",
  notes: "",
};

const APPOINTMENT_TYPES = [
  "General consultation",
  "Follow-up",
  "Emergency",
  "Specialist referral",
  "Routine check-up",
  "Pre-operative",
  "Post-operative",
  "Antenatal",
];

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#F1F5F9] bg-[#F8FAFC]">
        <h2 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-[#0F172A]">
        {label}{" "}
        {required ? (
          <span className="text-red-500">*</span>
        ) : (
          <span className="text-[#94A3B8] font-normal">(optional)</span>
        )}
      </Label>
      {children}
    </div>
  );
}

// ─── Patient search ───────────────────────────────────────────────────────────

function PatientSearch({
  selected,
  onSelect,
  onClear,
}: {
  selected: Patient | null;
  onSelect: (p: Patient) => void;
  onClear: () => void;
}) {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("patients")
        .select("id, readable_id, full_name, phone")
        .or(
          `full_name.ilike.%${query}%,readable_id.ilike.%${query}%,phone.ilike.%${query}%`
        )
        .limit(6);
      setResults(data ?? []);
      setOpen(true);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[#0E7C6E] bg-[#E6F4F2] px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0E7C6E] text-white text-xs font-semibold">
          {selected.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#0F172A]">
            {selected.full_name}
          </p>
          <p className="text-xs text-[#64748B] font-mono">{selected.readable_id} · {selected.phone}</p>
        </div>
        <button
          onClick={onClear}
          className="shrink-0 text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
      />
      <Input
        placeholder="Search by name, ID, or phone…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-8 text-sm"
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {searching && (
        <p className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8]">
          Searching…
        </p>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white shadow-lg overflow-hidden">
          {results.map((p) => (
            <button
              key={p.id}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors text-left"
              onMouseDown={() => {
                onSelect(p);
                setQuery("");
                setOpen(false);
              }}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E6F4F2] text-[#0E7C6E] text-xs font-semibold">
                {p.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-[#0F172A]">
                  {p.full_name}
                </p>
                <p className="text-xs text-[#64748B] font-mono">
                  {p.readable_id} · {p.phone}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !searching && query.length >= 2 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white shadow-lg px-4 py-3">
          <p className="text-sm text-[#64748B]">No patients found for &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessState({
  patientName,
  doctorName,
  scheduledAt,
  readableId,
  onAnother,
  onDashboard,
}: {
  patientName: string;
  doctorName: string;
  scheduledAt: string;
  readableId: string;
  onAnother: () => void;
  onDashboard: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E6F4F2]">
        <CheckCircle2 size={32} className="text-[#0E7C6E]" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-[#0F172A]">
          Appointment booked
        </h2>
        <p className="text-sm text-[#64748B]">
          <span className="font-medium text-[#0F172A]">{patientName}</span> with{" "}
          <span className="font-medium text-[#0F172A]">Dr. {doctorName}</span>
        </p>
        <p className="text-sm text-[#64748B]">
          {format(new Date(scheduledAt), "EEEE, d MMMM yyyy 'at' HH:mm")}
        </p>
        <p className="text-xs font-mono text-[#0E7C6E] mt-2 bg-[#E6F4F2] inline-block px-3 py-1 rounded-full">
          {readableId}
        </p>
      </div>
      <div className="flex gap-3 mt-2">
        <Button variant="outline" size="sm" onClick={onDashboard}>
          Back to dashboard
        </Button>
        <Button
          size="sm"
          onClick={onAnother}
          style={{ backgroundColor: "#0E7C6E", color: "#fff" }}
          className="hover:opacity-90 transition-opacity"
        >
          Book another
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BookAppointmentPage() {
  const supabase = createClient();
  const router = useRouter();

  const [form, setForm] = useState<AppointmentForm>(EMPTY_FORM);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{
    patientName: string;
    doctorName: string;
    scheduledAt: string;
    readableId: string;
  } | null>(null);

  // ── Fetch doctors ──────────────────────────────────────────────────────────

  const fetchDoctors = useCallback(async () => {
    setLoadingDoctors(true);
    const { data } = await supabase
      .from("doctors")
      .select("id, specialization, users ( id, full_name )")
      .order("users(full_name)", { ascending: true });

    setDoctors(
      (data ?? []).map((d: any) => ({
        id: d.id ?? "",
        user_id: d.users?.id ?? "",
        full_name: d.users?.full_name ?? "Unknown",
        specialization: d.specialization ?? null,
      }))
    );
    setLoadingDoctors(false);
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  function set(field: keyof AppointmentForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ── Validate ───────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!selectedPatient) return "Please select a patient.";
    if (!form.doctor_id) return "Please select a doctor.";
    if (!form.scheduled_date) return "Please select a date.";
    if (!form.scheduled_time) return "Please select a time slot.";
    if (!form.appointment_type) return "Please select an appointment type.";

    const chosen = new Date(`${form.scheduled_date}T${form.scheduled_time}`);
    if (isBefore(chosen, new Date())) {
      return "Appointment time must be in the future.";
    }
    return null;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setSaving(true);

    const scheduledAt = new Date(
      `${form.scheduled_date}T${form.scheduled_time}:00`
    ).toISOString();

    const selectedDoctor = doctors.find((d) => d.id === form.doctor_id)!;

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        patient_id: selectedPatient!.id,
        doctor_id: form.doctor_id,
        scheduled_at: scheduledAt,
        appointment_type: form.appointment_type,
        notes: form.notes.trim() || null,
        status: "scheduled",
        // readable_id generated server-side
      })
      .select("readable_id, scheduled_at")
      .single();

    setSaving(false);

    if (error) {
      toast.error("Could not book appointment. Please try again.");
      return;
    }

    setSuccess({
      patientName: selectedPatient!.full_name,
      doctorName: selectedDoctor.full_name,
      scheduledAt: data.scheduled_at,
      readableId: data.readable_id,
    });
  }

  // ── Min date (today) ───────────────────────────────────────────────────────

  const minDate = format(new Date(), "yyyy-MM-dd");
  const maxDate = format(addDays(new Date(), 90), "yyyy-MM-dd");

  // ── Success screen ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="p-6">
        <SuccessState
          {...success}
          onAnother={() => {
            setForm(EMPTY_FORM);
            setSelectedPatient(null);
            setSuccess(null);
          }}
          onDashboard={() => router.push("/receptionist")}
        />
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/receptionist")}
          className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#0F172A] mb-3 transition-colors"
        >
          <ChevronLeft size={13} />
          Back to dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E6F4F2]">
            <CalendarPlus size={17} className="text-[#0E7C6E]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#0F172A]">
              Book appointment
            </h1>
            <p className="text-sm text-[#64748B]">
              Schedule a patient with a doctor
            </p>
          </div>
        </div>
      </div>

      {/* Patient */}
      <Section title="Patient">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <User size={12} />
            Search for an existing patient record
          </div>
          <Field label="Patient" required>
            <PatientSearch
              selected={selectedPatient}
              onSelect={(p) => {
                setSelectedPatient(p);
                set("patient_id", p.id);
              }}
              onClear={() => {
                setSelectedPatient(null);
                set("patient_id", "");
              }}
            />
          </Field>
        </div>
      </Section>

      {/* Doctor */}
      <Section title="Doctor">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <Stethoscope size={12} />
            Select the attending doctor
          </div>
          <Field label="Doctor" required>
            <Select
              value={form.doctor_id}
              onValueChange={(v) => set("doctor_id", v ?? "")}
              disabled={loadingDoctors}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingDoctors ? "Loading doctors…" : "Select a doctor"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id ?? d.user_id} value={d.id ?? ""}>
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
          </Field>
        </div>
      </Section>

      {/* Schedule */}
      <Section title="Schedule">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date" required>
            <Input
              type="date"
              min={minDate}
              max={maxDate}
              value={form.scheduled_date}
              onChange={(e) => set("scheduled_date", e.target.value)}
            />
          </Field>

          <Field label="Time slot" required>
            <Select
              value={form.scheduled_time}
              onValueChange={(v) => set("scheduled_time", v ?? "")}
              disabled={!form.scheduled_date}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    form.scheduled_date
                      ? "Pick a time"
                      : "Select date first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="font-mono">{t}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Appointment type" required>
            <Select
              value={form.appointment_type}
              onValueChange={(v) => set("appointment_type", v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      {/* Notes */}
      <Section title="Notes">
        <Field label="Reason for visit / notes">
          <Textarea
            placeholder="Brief description of the reason for the visit…"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
        </Field>
      </Section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 pb-6">
        <Button
          variant="outline"
          onClick={() => router.push("/receptionist")}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          style={{ backgroundColor: "#0E7C6E", color: "#fff" }}
          className="gap-2 hover:opacity-90 transition-opacity min-w-[140px]"
        >
          <CalendarPlus size={14} />
          {saving ? "Booking…" : "Book appointment"}
        </Button>
      </div>
    </div>
  );
}