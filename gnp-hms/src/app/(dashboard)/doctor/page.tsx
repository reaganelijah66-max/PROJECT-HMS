"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ReadableId } from "@/components/shared/ReadableId";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarDays,
  Users,
  FlaskConical,
  ClipboardList,
  RefreshCw,
  ArrowRight,
  Clock,
  CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  todayAppointments: number;
  pendingAppointments: number;
  completedToday: number;
  pendingLabResults: number;
}

interface TodayAppointment {
  id: string;
  readable_id: string;
  patient_name: string;
  patient_id: string;
  scheduled_at: string;
  appointment_type: string;
  status: string;
}

interface PendingLabRequest {
  id: string;
  readable_id: string;
  patient_name: string;
  test_name: string;
  requested_at: string;
  status: string;
}

// ─── Quick action ─────────────────────────────────────────────────────────────

function QuickAction({
  icon: Icon,
  label,
  description,
  href,
  accent,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  accent: string;
  badge?: number;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className="group relative flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-5 text-left shadow-sm transition-all hover:border-[#0E7C6E] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E7C6E]"
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: accent + "18", color: accent }}
        >
          <Icon size={18} />
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="font-semibold text-sm text-[#0F172A]">{label}</p>
        <p className="text-xs text-[#64748B] mt-0.5">{description}</p>
      </div>
      <ArrowRight
        size={14}
        className="absolute right-4 bottom-5 text-[#CBD5E1] transition-all group-hover:text-[#0E7C6E] group-hover:translate-x-0.5"
      />
    </button>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-semibold text-[#0F172A] font-mono leading-none">
            {value}
          </p>
          <p className="text-xs text-[#64748B] mt-1.5">{label}</p>
          {sub && <p className="text-xs text-[#94A3B8] mt-0.5">{sub}</p>}
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: accent + "18", color: accent }}
        >
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DoctorDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    pendingAppointments: 0,
    completedToday: 0,
    pendingLabResults: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState<
    TodayAppointment[]
  >([]);
  const [pendingLabs, setPendingLabs] = useState<PendingLabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  // ── Get current doctor id ──────────────────────────────────────────────────

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

  // ── Fetch dashboard ────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    setLoading(true);

    const docId = await getDoctorId();
    setDoctorId(docId);

    if (!docId) {
      setLoading(false);
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [apptRes, labRes] = await Promise.all([
      supabase
        .from("appointments")
        .select(
          `
          id, readable_id, scheduled_at, appointment_type, status,
          patients ( id, full_name )
        `
        )
        .eq("doctor_id", docId)
        .gte("scheduled_at", todayStart.toISOString())
        .lte("scheduled_at", todayEnd.toISOString())
        .order("scheduled_at", { ascending: true }),

      supabase
        .from("lab_request_items")
        .select(
          `
          id, readable_id, status, created_at,
          lab_tests ( name ),
          lab_requests ( patient_id, patients ( full_name ) )
        `
        )
        .eq("lab_requests.doctor_id", docId)
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const appts = apptRes.data ?? [];
    setTodayAppointments(
      appts.map((a: any) => ({
        id: a.id,
        readable_id: a.readable_id ?? "",
        patient_name: a.patients?.full_name ?? "—",
        patient_id: a.patients?.id ?? "",
        scheduled_at: a.scheduled_at,
        appointment_type: a.appointment_type ?? "",
        status: a.status,
      }))
    );

    setStats({
      todayAppointments: appts.length,
      pendingAppointments: appts.filter((a: any) =>
        ["scheduled", "confirmed", "checked_in"].includes(a.status)
      ).length,
      completedToday: appts.filter((a: any) => a.status === "completed")
        .length,
      pendingLabResults: labRes.data?.length ?? 0,
    });

    setPendingLabs(
      (labRes.data ?? []).map((l: any) => ({
        id: l.id,
        readable_id: l.readable_id ?? "",
        patient_name: l.lab_requests?.patients?.full_name ?? "—",
        test_name: l.lab_tests?.name ?? "—",
        requested_at: l.created_at,
        status: l.status,
      }))
    );

    setLoading(false);
  }, [getDoctorId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Greeting ───────────────────────────────────────────────────────────────

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-7 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#0E7C6E] uppercase tracking-widest mb-1">
            Doctor
          </p>
          <h1 className="text-xl font-semibold text-[#0F172A]">
            {greeting()}
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {format(new Date(), "EEEE, d MMMM yyyy")} · Your day at a glance
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboard}
          disabled={loading}
          className="gap-2 text-xs"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Appointments today"
          value={stats.todayAppointments}
          icon={CalendarDays}
          accent="#0E7C6E"
        />
        <StatCard
          label="Still pending"
          value={stats.pendingAppointments}
          icon={Clock}
          accent="#F59E0B"
          sub="scheduled or checked in"
        />
        <StatCard
          label="Completed today"
          value={stats.completedToday}
          icon={CheckCircle2}
          accent="#6366F1"
        />
        <StatCard
          label="Pending lab results"
          value={stats.pendingLabResults}
          icon={FlaskConical}
          accent="#EF4444"
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <QuickAction
            icon={CalendarDays}
            label="My appointments"
            description="View and manage today's queue"
            href="/doctor/appointments"
            accent="#0E7C6E"
            badge={stats.pendingAppointments}
          />
          <QuickAction
            icon={Users}
            label="My patients"
            description="Browse patient records"
            href="/doctor/patients"
            accent="#6366F1"
          />
          <QuickAction
            icon={FlaskConical}
            label="Lab requests"
            description="Request and track lab work"
            href="/doctor/lab-requests"
            accent="#EF4444"
            badge={stats.pendingLabResults}
          />
          <QuickAction
            icon={ClipboardList}
            label="Medical records"
            description="View diagnoses and notes"
            href="/doctor/patients"
            accent="#0EA5E9"
          />
        </div>
      </div>

      {/* Two-column lower section */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Today's appointments */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9]">
            <h2 className="text-sm font-semibold text-[#0F172A]">
              Today&apos;s appointments
            </h2>
            <button
              onClick={() => router.push("/doctor/appointments")}
              className="text-xs text-[#0E7C6E] hover:underline"
            >
              View all
            </button>
          </div>

          {loading ? (
            <div className="divide-y divide-[#F1F5F9]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex gap-3">
                  <div className="h-4 w-12 rounded bg-[#F1F5F9] animate-pulse" />
                  <div className="h-4 flex-1 rounded bg-[#F1F5F9] animate-pulse" />
                  <div className="h-4 w-16 rounded bg-[#F1F5F9] animate-pulse" />
                </div>
              ))}
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={CalendarDays}
                title="No appointments today"
                description="Your schedule is clear for today."
              />
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {todayAppointments.map((appt) => (
                <button
                  key={appt.id}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#F8FAFC] transition-colors text-left"
                  onClick={() =>
                    router.push(`/doctor/patients/${appt.patient_id}`)
                  }
                >
                  {/* Time */}
                  <div className="w-12 shrink-0 text-center">
                    <p className="text-xs font-mono font-semibold text-[#0F172A]">
                      {format(new Date(appt.scheduled_at), "HH:mm")}
                    </p>
                  </div>

                  <div className="w-px h-8 bg-[#E2E8F0] shrink-0" />

                  {/* Patient */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E6F4F2] text-[#0E7C6E] text-xs font-semibold">
                      {appt.patient_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">
                        {appt.patient_name}
                      </p>
                      <p className="text-xs text-[#64748B] truncate">
                        {appt.appointment_type}
                      </p>
                    </div>
                  </div>

                  <StatusBadge type="appointment" status={appt.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pending lab results */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9]">
            <h2 className="text-sm font-semibold text-[#0F172A]">
              Pending lab results
            </h2>
            <button
              onClick={() => router.push("/doctor/lab-requests")}
              className="text-xs text-[#0E7C6E] hover:underline"
            >
              View all
            </button>
          </div>

          {loading ? (
            <div className="divide-y divide-[#F1F5F9]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex gap-3">
                  <div className="h-4 w-24 rounded bg-[#F1F5F9] animate-pulse" />
                  <div className="h-4 flex-1 rounded bg-[#F1F5F9] animate-pulse" />
                </div>
              ))}
            </div>
          ) : pendingLabs.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={FlaskConical}
                title="No pending lab results"
                description="All lab requests have been completed."
              />
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {pendingLabs.map((lab) => (
                <div
                  key={lab.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                    <FlaskConical size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">
                      {lab.test_name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-[#64748B] truncate">
                        {lab.patient_name}
                      </p>
                      <span className="text-[#CBD5E1] text-xs">·</span>
                      <ReadableId id={lab.readable_id} />
                    </div>
                  </div>
                  <StatusBadge type="lab" status={lab.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}