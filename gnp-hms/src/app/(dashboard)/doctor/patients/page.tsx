"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReadableId } from "@/components/shared/ReadableId";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { format, differenceInYears } from "date-fns";
import {
  Users,
  Search,
  RefreshCw,
  ArrowRight,
  CalendarDays,
  FlaskConical,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Patient {
  id: string;
  readable_id: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  last_seen: string | null;
  appointment_count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob: string): string {
  const years = differenceInYears(new Date(), new Date(dob));
  return `${years}y`;
}

function formatLastSeen(iso: string | null): string {
  if (!iso) return "Never";
  return format(new Date(iso), "d MMM yyyy");
}

function genderInitial(gender: string) {
  return gender === "male" ? "M" : gender === "female" ? "F" : "—";
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DoctorPatientsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [doctorId, setDoctorId] = useState<string | null>(null);

  // ── Get current doctor ─────────────────────────────────────────────────────

  const getDoctorId = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("doctors")
      .select("id")
      .eq("user_id", user.id)
      .single();
    return data?.id ?? null;
  }, []);

  // ── Fetch patients seen by this doctor ────────────────────────────────────

  const fetchPatients = useCallback(async () => {
    setLoading(true);

    const docId = await getDoctorId();
    setDoctorId(docId);

    if (!docId) {
      setLoading(false);
      return;
    }

    // Get distinct patients who have had appointments with this doctor
    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        scheduled_at,
        patients (
          id,
          readable_id,
          full_name,
          date_of_birth,
          gender,
          phone
        )
      `
      )
      .eq("doctor_id", docId)
      .order("scheduled_at", { ascending: false });

    if (error) {
      setLoading(false);
      return;
    }

    // Deduplicate by patient id, keeping most recent appointment date
    const map = new Map<string, Patient>();
    for (const row of data ?? []) {
      const p = (row as any).patients;
      if (!p) continue;
      if (!map.has(p.id)) {
        map.set(p.id, {
          id: p.id,
          readable_id: p.readable_id ?? "",
          full_name: p.full_name ?? "—",
          date_of_birth: p.date_of_birth,
          gender: p.gender ?? "",
          phone: p.phone ?? "—",
          last_seen: (row as any).scheduled_at ?? null,
          appointment_count: 1,
        });
      } else {
        const existing = map.get(p.id)!;
        map.set(p.id, {
          ...existing,
          appointment_count: existing.appointment_count + 1,
        });
      }
    }

    setPatients(Array.from(map.values()));
    setLoading(false);
  }, [getDoctorId]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // ── Filtered ───────────────────────────────────────────────────────────────

  const visible = patients.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.readable_id.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0F172A]">My patients</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Patients you have seen or have upcoming appointments with
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPatients}
          disabled={loading}
          className="gap-2 text-xs"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="flex items-center gap-2 text-sm text-[#64748B]">
          <Users size={14} className="text-[#0E7C6E]" />
          <span>
            <span className="font-semibold text-[#0F172A]">
              {patients.length}
            </span>{" "}
            patient{patients.length !== 1 ? "s" : ""} total
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
        />
        <Input
          placeholder="Search by name, ID, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 text-sm"
        />
      </div>

      {/* Patient cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-[#E2E8F0] bg-white animate-pulse"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-[#E2E8F0] bg-white py-16">
          <EmptyState
            icon={Users}
            title="No patients found"
            description={
              search
                ? "Try a different search term."
                : "Patients assigned to you will appear here."
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/doctor/patients/${p.id}`)}
              className="group flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-5 text-left shadow-sm transition-all hover:border-[#0E7C6E] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E7C6E]"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E6F4F2] text-[#0E7C6E] text-sm font-semibold">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] truncate">
                      {p.full_name}
                    </p>
                    <ReadableId id={p.readable_id} />
                  </div>
                </div>
                <ArrowRight
                  size={14}
                  className="shrink-0 mt-1 text-[#CBD5E1] transition-all group-hover:text-[#0E7C6E] group-hover:translate-x-0.5"
                />
              </div>

              {/* Details */}
              <div className="flex items-center gap-3 text-xs text-[#64748B]">
                <span className="inline-flex items-center gap-1">
                  <span className="font-medium text-[#0F172A]">
                    {calcAge(p.date_of_birth)}
                  </span>
                  <span className="text-[#CBD5E1]">/</span>
                  <span className="capitalize">{genderInitial(p.gender)}</span>
                </span>
                <span className="text-[#CBD5E1]">·</span>
                <span className="font-mono">{p.phone}</span>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                <span className="inline-flex items-center gap-1 text-xs text-[#64748B]">
                  <CalendarDays size={11} />
                  Last: {formatLastSeen(p.last_seen)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-[#0E7C6E] font-medium">
                  <FlaskConical size={11} />
                  {p.appointment_count} visit
                  {p.appointment_count !== 1 ? "s" : ""}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Footer count */}
      {!loading && visible.length > 0 && search && (
        <p className="text-xs text-[#94A3B8]">
          {visible.length} of {patients.length} patients
        </p>
      )}
    </div>
  );
}