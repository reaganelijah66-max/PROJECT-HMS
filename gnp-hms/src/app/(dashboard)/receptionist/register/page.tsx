"use client";

import { useState } from "react";
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
import { UserPlus, ChevronLeft, CheckCircle2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientForm {
  full_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  blood_group: string;
  allergies: string;
  notes: string;
}

const EMPTY_FORM: PatientForm = {
  full_name: "",
  date_of_birth: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  blood_group: "",
  allergies: "",
  notes: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidEmail(email: string) {
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
  return !phone || /^[+\d\s\-()]{7,20}$/.test(phone);
}

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
      <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  span,
  children,
}: {
  label: string;
  required?: boolean;
  span?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5${span ? " sm:col-span-2" : ""}`}>
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

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessState({
  name,
  readableId,
  onAnother,
  onDashboard,
}: {
  name: string;
  readableId: string;
  onAnother: () => void;
  onDashboard: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E6F4F2]">
        <CheckCircle2 size={32} className="text-[#0E7C6E]" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[#0F172A]">
          Patient registered
        </h2>
        <p className="text-sm text-[#64748B] mt-1">
          <span className="font-medium text-[#0F172A]">{name}</span> has been
          added to the system.
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
          Register another
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RegisterPatientPage() {
  const supabase = createClient();
  const router = useRouter();

  const [form, setForm] = useState<PatientForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{
    name: string;
    readableId: string;
  } | null>(null);

  function set(field: keyof PatientForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ── Validate ───────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!form.full_name.trim()) return "Full name is required.";
    if (!form.date_of_birth) return "Date of birth is required.";
    if (!form.gender) return "Gender is required.";
    if (!form.phone.trim()) return "Phone number is required.";
    if (!isValidPhone(form.phone)) return "Enter a valid phone number.";
    if (!isValidEmail(form.email)) return "Enter a valid email address.";
    if (
      form.emergency_contact_phone &&
      !isValidPhone(form.emergency_contact_phone)
    )
      return "Enter a valid emergency contact phone number.";
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

    const { data, error } = await supabase
      .from("patients")
      .insert({
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        blood_group: form.blood_group || null,
        allergies: form.allergies.trim() || null,
        notes: form.notes.trim() || null,
        // readable_id is generated server-side by trigger — never send it
      })
      .select("full_name, readable_id")
      .single();

    setSaving(false);

    if (error) {
      toast.error("Could not register patient. Please try again.");
      return;
    }

    setSuccess({
      name: data.full_name,
      readableId: data.readable_id,
    });
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="p-6">
        <SuccessState
          name={success.name}
          readableId={success.readableId}
          onAnother={() => {
            setForm(EMPTY_FORM);
            setSuccess(null);
          }}
          onDashboard={() => router.push("/receptionist")}
        />
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6 max-w-3xl">
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
            <UserPlus size={17} className="text-[#0E7C6E]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#0F172A]">
              Register patient
            </h1>
            <p className="text-sm text-[#64748B]">
              Create a new patient record in the system
            </p>
          </div>
        </div>
      </div>

      {/* Personal information */}
      <Section title="Personal information">
        <Field label="Full name" required span>
          <Input
            placeholder="e.g. Amara Nakato"
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
          />
        </Field>

        <Field label="Date of birth" required>
          <Input
            type="date"
            value={form.date_of_birth}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => set("date_of_birth", e.target.value)}
          />
        </Field>

        <Field label="Gender" required>
          <Select value={form.gender ?? ""} onValueChange={(v) => set("gender", v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Blood group">
          <Select
            value={form.blood_group ?? ""}
            onValueChange={(v) => set("blood_group", v ?? "")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select blood group" />
            </SelectTrigger>
            <SelectContent>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                (bg) => (
                  <SelectItem key={bg} value={bg}>
                    {bg}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </Field>
      </Section>

      {/* Contact details */}
      <Section title="Contact details">
        <Field label="Phone number" required>
          <Input
            type="tel"
            placeholder="+256 700 000000"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="font-mono"
          />
        </Field>

        <Field label="Email address">
          <Input
            type="email"
            placeholder="patient@email.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>

        <Field label="Home address" span>
          <Input
            placeholder="e.g. Plot 12 Kira Road, Kampala"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </Field>
      </Section>

      {/* Emergency contact */}
      <Section title="Emergency contact">
        <Field label="Contact name">
          <Input
            placeholder="Full name"
            value={form.emergency_contact_name}
            onChange={(e) => set("emergency_contact_name", e.target.value)}
          />
        </Field>

        <Field label="Contact phone">
          <Input
            type="tel"
            placeholder="+256 700 000000"
            value={form.emergency_contact_phone}
            onChange={(e) => set("emergency_contact_phone", e.target.value)}
            className="font-mono"
          />
        </Field>
      </Section>

      {/* Medical notes */}
      <Section title="Medical notes">
        <Field label="Known allergies" span>
          <Input
            placeholder="e.g. Penicillin, Sulfa drugs"
            value={form.allergies}
            onChange={(e) => set("allergies", e.target.value)}
          />
        </Field>

        <Field label="Additional notes" span>
          <Textarea
            placeholder="Any other relevant medical history or notes…"
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
          <UserPlus size={14} />
          {saving ? "Registering…" : "Register patient"}
        </Button>
      </div>
    </div>
  );
}