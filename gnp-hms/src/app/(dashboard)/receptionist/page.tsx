"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ReadableId } from "@/components/shared/ReadableId";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { format, isToday } from "date-fns";
import {
  CalendarPlus,
  UserPlus,
  ClipboardCheck,
  CreditCard,
  Users,
  Clock,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  todayAppointments: number;
  checkedIn: number;
  waitingCount: number;
  registeredToday: number;
}

interface UpcomingAppointment {
  id: string;
  readable_id: string;
  patient_name: string;
  doctor_name: string;
  scheduled_at: string;
  status: string;
}

interface RecentPatient {
  id: string;
  readable_id: string;
  full_name: string;
  registered_at: string;
  gender: string;
}

// ─── Quick action card ────────────────────────────────────────────────────────

function QuickAction({
  icon: Icon,
  label,
  description,
  href,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  accent: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className="group relative flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-5 text-left shadow-sm transition-all hover:border-[#0E7C6E] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E7C6E]"
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
        style={{ backgroundColor: accent + "18", color: accent }}
      >
        <Icon size={18} />
      </div>
      <div>
        <p className="font-semibold text-sm text-[#0F172A]">{label}</p>
        <p className="text-xs text-[#64748B] mt-0.5">{description}</p>
      </div>
      <ArrowRight
        size={14}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#CBD5E1] transition-all group-hover:text-[#0E7C6E] group-hover:translate-x-0.5"
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

export default function ReceptionistDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    checkedIn: 0,
    waitingCount: 0,
    registeredToday: 0,
  });
  const [upcoming, setUpcoming] = useState<UpcomingAppointment[]>([]);
  const [recentPatients, setRecentPatients] = useState<RecentPatient[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    setLoading(true);

    const [apptRes, patientsRes, upcomingRes] = await Promise.all([
      // Today's appointment stats
      supabase
        .from("appointments")
        .select("id, status")
        .gte("scheduled_at", todayStart)
        .lte("scheduled_at", todayEnd),

      // Patients registered today
      supabase
        .from("patients")
        .select("id, readable_id, full_name, created_at, gender")
        .gte("created_at", todayStart)
        .order("created_at", { ascending: false })
        .limit(5),

      // Upcoming appointments today
      supabase
        .from("appointments")
        .select(
          `
          id,
          readable_id,
          scheduled_at,
          status,
          patients ( full_name ),
          doctors ( users ( full_name ) )
        `
        )
        .gte("scheduled_at", new Date().toISOString())
        .lte("scheduled_at", todayEnd)
        .in("status", ["scheduled", "confirmed"])
        .order("scheduled_at", { ascending: true })
        .limit(6),
    ]);

    // Stats
    const appts = apptRes.data ?? [];
    setStats({
      todayAppointments: appts.length,
      checkedIn: appts.filter((a) => a.status === "checked_in").length,
      waitingCount: appts.filter((a) =>
        ["scheduled", "confirmed"].includes(a.status)
      ).length,
      registeredToday: patientsRes.data?.length ?? 0,
    });

    // Recent patients
    setRecentPatients(
      (patientsRes.data ?? []).map((p: any) => ({
        id: p.id,
        readable_id: p.readable_id,
        full_name: p.full_name,
        registered_at: p.created_at,
        gender: p.gender,
      }))
    );

    // Upcoming appointments
    setUpcoming(
      (upcomingRes.data ?? []).map((a: any) => ({
        id: a.id,
        readable_id: a.readable_id,
        patient_name: a.patients?.full_name ?? "—",
        doctor_name: a.doctors?.users?.full_name ?? "—",
        scheduled_at: a.scheduled_at,
        status: a.status,
      }))
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-7 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#0E7C6E] uppercase tracking-widest mb-1">
            Reception
          </p>
          <h1 className="text-xl font-semibold text-[#0F172A]">
            {greeting()}
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {format(new Date(), "EEEE, d MMMM yyyy")} · Today&apos;s overview
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
          label="Still waiting"
          value={stats.waitingCount}
          icon={Clock}
          accent="#F59E0B"
          sub="scheduled or confirmed"
        />
        <StatCard
          label="Checked in"
          value={stats.checkedIn}
          icon={CheckCircle2}
          accent="#6366F1"
        />
        <StatCard
          label="New patients today"
          value={stats.registeredToday}
          icon={Users}
          accent="#0EA5E9"
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <QuickAction
            icon={UserPlus}
            label="Register patient"
            description="Add a new patient record"
            href="/receptionist/register"
            accent="#0E7C6E"
          />
          <QuickAction
            icon={CalendarPlus}
            label="Book appointment"
            description="Schedule with a doctor"
            href="/receptionist/book"
            accent="#6366F1"
          />
          <QuickAction
            icon={ClipboardCheck}
            label="Check in"
            description="Mark patient as arrived"
            href="/receptionist/checkin"
            accent="#F59E0B"
          />
          <QuickAction
            icon={CreditCard}
            label="Record payment"
            description="Post a bill payment"
            href="/receptionist/payments"
            accent="#0EA5E9"
          />
        </div>
      </div>

      {/* Two-column lower section */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Upcoming appointments */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9]">
            <h2 className="text-sm font-semibold text-[#0F172A]">
              Upcoming today
            </h2>
            <button
              onClick={() => router.push("/receptionist/checkin")}
              className="text-xs text-[#0E7C6E] hover:underline"
            >
              View all
            </button>
          </div>

          {loading ? (
            <div className="divide-y divide-[#F1F5F9]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex gap-3">
                  <div className="h-4 w-16 rounded bg-[#F1F5F9] animate-pulse" />
                  <div className="h-4 flex-1 rounded bg-[#F1F5F9] animate-pulse" />
                  <div className="h-4 w-20 rounded bg-[#F1F5F9] animate-pulse" />
                </div>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={CalendarDays}
                title="No upcoming appointments"
                description="No more scheduled appointments for today."
              />
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {upcoming.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[#F8FAFC] transition-colors"
                >
                  {/* Time */}
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-xs font-mono font-semibold text-[#0F172A]">
                      {format(new Date(appt.scheduled_at), "HH:mm")}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-8 bg-[#E2E8F0] shrink-0" />

                  {/* Patient + doctor */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">
                      {appt.patient_name}
                    </p>
                    <p className="text-xs text-[#64748B] truncate">
                      Dr. {appt.doctor_name}
                    </p>
                  </div>

                  {/* Status */}
                  <StatusBadge type="appointment" status={appt.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently registered patients */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9]">
            <h2 className="text-sm font-semibold text-[#0F172A]">
              Registered today
            </h2>
            <button
              onClick={() => router.push("/receptionist/register")}
              className="text-xs text-[#0E7C6E] hover:underline"
            >
              Register new
            </button>
          </div>

          {loading ? (
            <div className="divide-y divide-[#F1F5F9]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex gap-3">
                  <div className="h-4 w-16 rounded bg-[#F1F5F9] animate-pulse" />
                  <div className="h-4 flex-1 rounded bg-[#F1F5F9] animate-pulse" />
                </div>
              ))}
            </div>
          ) : recentPatients.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={Users}
                title="No new patients today"
                description="Patients registered today will appear here."
              />
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {recentPatients.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[#F8FAFC] transition-colors"
                >
                  {/* Avatar initial */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6F4F2] text-[#0E7C6E] text-xs font-semibold">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + ID */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">
                      {p.full_name}
                    </p>
                    <ReadableId id={p.readable_id} />
                  </div>

                  {/* Time registered */}
                  <p className="text-xs text-[#94A3B8] font-mono shrink-0">
                    {format(new Date(p.registered_at), "HH:mm")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}