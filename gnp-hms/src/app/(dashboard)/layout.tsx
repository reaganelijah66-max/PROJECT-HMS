'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { UserRole, ROLE_LABELS } from '@/constants/roles'
import {
  LayoutDashboard, Users, Calendar, FileText,
  FlaskConical, Pill, Receipt, BedDouble,
  Settings, LogOut, Bell, Stethoscope,
  UserPlus, ClipboardList, ShieldCheck,
  Warehouse, ChevronDown, ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV: Record<UserRole, NavGroup[]> = {
  patient: [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', href: '/patient', icon: LayoutDashboard },
        { label: 'Appointments', href: '/patient/appointments', icon: Calendar },
        { label: 'My Records', href: '/patient/records', icon: FileText },
        { label: 'My Bills', href: '/patient/bills', icon: Receipt },
        { label: 'Doctors', href: '/patient/doctors', icon: Stethoscope },
      ],
    },
  ],
  doctor: [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
        { label: 'My Patients', href: '/doctor/patients', icon: Users },
        { label: 'Appointments', href: '/doctor/appointments', icon: Calendar },
        { label: 'Lab Requests', href: '/doctor/lab-requests', icon: FlaskConical },
      ],
    },
  ],
  nurse: [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', href: '/nurse', icon: LayoutDashboard },
        { label: 'Ward', href: '/nurse/ward', icon: BedDouble },
        { label: 'Queue', href: '/nurse/queue', icon: ClipboardList },
        { label: 'Admissions', href: '/nurse/admissions', icon: UserPlus },
      ],
    },
  ],
  receptionist: [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', href: '/receptionist', icon: LayoutDashboard },
        { label: 'Book Appointment', href: '/receptionist/book', icon: Calendar },
        { label: 'Check In', href: '/receptionist/checkin', icon: ClipboardList },
        { label: 'Register Patient', href: '/receptionist/register', icon: UserPlus },
        { label: 'Assign Doctor', href: '/receptionist/assign-doctor', icon: Stethoscope },
        { label: 'Payments', href: '/receptionist/payments', icon: Receipt },
      ],
    },
  ],
  pharmacist: [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', href: '/pharmacist', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Pharmacy',
      items: [
        { label: 'Prescriptions', href: '/pharmacist/prescriptions', icon: Pill },
        { label: 'Medicines', href: '/pharmacist/medicines', icon: Pill },
        { label: 'Inventory', href: '/pharmacist/inventory', icon: Warehouse },
        { label: 'Suppliers', href: '/pharmacist/suppliers', icon: Users },
      ],
    },
  ],
  lab_technician: [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', href: '/lab', icon: LayoutDashboard },
        { label: 'Request Queue', href: '/lab/queue', icon: ClipboardList },
      ],
    },
  ],
  accountant: [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', href: '/accountant', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Finance',
      items: [
        { label: 'Bills', href: '/accountant/bills', icon: FileText },
        { label: 'Payments', href: '/accountant/payments', icon: Receipt },
        { label: 'Insurance', href: '/accountant/insurance', icon: ShieldCheck },
        { label: 'Reports', href: '/accountant/reports', icon: LayoutDashboard },
      ],
    },
  ],
  admin: [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      label: 'System',
      items: [
        { label: 'Users', href: '/admin/users', icon: Users },
        { label: 'Wards & Beds', href: '/admin/wards', icon: BedDouble },
        { label: 'Lab Tests', href: '/admin/lab-tests', icon: FlaskConical },
        { label: 'Audit Log', href: '/admin/audit', icon: ShieldCheck },
        { label: 'Settings', href: '/admin/sequences', icon: Settings },
      ],
    },
    {
      label: 'Clinical',
      items: [
        { label: 'Appointments', href: '/receptionist/book', icon: Calendar },
        { label: 'Patient Queue', href: '/receptionist/checkin', icon: ClipboardList },
        { label: 'Lab Queue', href: '/lab/queue', icon: FlaskConical },
      ],
    },
    {
      label: 'Pharmacy',
      items: [
        { label: 'Prescriptions', href: '/pharmacist/prescriptions', icon: Pill },
        { label: 'Medicines', href: '/pharmacist/medicines', icon: Pill },
        { label: 'Inventory', href: '/pharmacist/inventory', icon: Warehouse },
        { label: 'Suppliers', href: '/pharmacist/suppliers', icon: Users },
      ],
    },
    {
      label: 'Finance',
      items: [
        { label: 'Bills', href: '/accountant/bills', icon: FileText },
        { label: 'Payments', href: '/accountant/payments', icon: Receipt },
        { label: 'Insurance', href: '/accountant/insurance', icon: ShieldCheck },
        { label: 'Reports', href: '/accountant/reports', icon: LayoutDashboard },
      ],
    },
  ],
  super_admin: [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      label: 'System',
      items: [
        { label: 'Users', href: '/admin/users', icon: Users },
        { label: 'Wards & Beds', href: '/admin/wards', icon: BedDouble },
        { label: 'Lab Tests', href: '/admin/lab-tests', icon: FlaskConical },
        { label: 'Audit Log', href: '/admin/audit', icon: ShieldCheck },
        { label: 'Settings', href: '/admin/sequences', icon: Settings },
      ],
    },
    {
      label: 'Clinical',
      items: [
        { label: 'Appointments', href: '/receptionist/book', icon: Calendar },
        { label: 'Patient Queue', href: '/receptionist/checkin', icon: ClipboardList },
        { label: 'Lab Queue', href: '/lab/queue', icon: FlaskConical },
      ],
    },
    {
      label: 'Pharmacy',
      items: [
        { label: 'Prescriptions', href: '/pharmacist/prescriptions', icon: Pill },
        { label: 'Medicines', href: '/pharmacist/medicines', icon: Pill },
        { label: 'Inventory', href: '/pharmacist/inventory', icon: Warehouse },
        { label: 'Suppliers', href: '/pharmacist/suppliers', icon: Users },
      ],
    },
    {
      label: 'Finance',
      items: [
        { label: 'Bills', href: '/accountant/bills', icon: FileText },
        { label: 'Payments', href: '/accountant/payments', icon: Receipt },
        { label: 'Insurance', href: '/accountant/insurance', icon: ShieldCheck },
        { label: 'Reports', href: '/accountant/reports', icon: LayoutDashboard },
      ],
    },
  ],
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function NavSection({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="mb-1">
      {group.label !== 'Main' && (
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5"
        >
          <span className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            {group.label}
          </span>
          {open
            ? <ChevronDown className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
            : <ChevronRight className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
          }
        </button>
      )}
      {open && (
        <ul className="space-y-0.5">
          {group.items.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: isActive ? '#0E7C6E' : 'transparent',
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
                    }
                  }}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: '#F1F5F9' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#0E7C6E', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: '#64748B' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  const groups = NAV[user.role] || []

  return (
    <div className="min-h-screen flex" style={{ background: '#F1F5F9' }}>

      {/* ── Sidebar ── */}
      <aside className="w-64 fixed h-full flex flex-col z-20"
        style={{ background: '#0A1628' }}>

        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ background: '#0E7C6E', color: '#fff' }}>
            G
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-none">GNP HMS</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {groups.map((group) => (
            <NavSection key={group.label} group={group} pathname={pathname} />
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{ background: '#0E7C6E', color: '#fff' }}>
              {getInitials(user.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate leading-none">
                {user.full_name}
              </p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.12)'
              e.currentTarget.style.color = '#f87171'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
            }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">

        {/* Topbar */}
        <header className="h-14 bg-white sticky top-0 z-10 flex items-center justify-between px-6"
          style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div />
          <div className="flex items-center gap-3">
            <button
              className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-all"
              style={{ color: '#64748B' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: '#EF4444' }} />
            </button>
            <div style={{ width: '1px', height: '20px', background: '#E2E8F0' }} />
            <div className="text-right">
              <p className="text-xs font-medium text-[#0F172A] leading-none">{user.full_name}</p>
              <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{user.email}</p>
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}