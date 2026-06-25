'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Pill, AlertTriangle, CheckCircle, Clock, Package } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ReadableId } from '@/components/shared/ReadableId'
import { EmptyState } from '@/components/shared/EmptyState'

interface DashboardStats {
  pendingPrescriptions: number
  lowStockCount: number
  dispensedToday: number
  totalMedicines: number
}

interface PendingPrescription {
  id: string
  readable_id: string
  status: string
  created_at: string
  patients: { readable_id: string; user_profiles: { full_name: string } }
  doctors: { user_profiles: { full_name: string } }
  prescription_items: { id: string }[]
}

interface LowStockItem {
  id: string
  quantity_in_stock: number
  reorder_level: number
  expiry_date: string
  medicines: { name: string; unit: string }
}

export default function PharmacistDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    pendingPrescriptions: 0,
    lowStockCount: 0,
    dispensedToday: 0,
    totalMedicines: 0,
  })
  const [pending, setPending] = useState<PendingPrescription[]>([])
  const [lowStock, setLowStock] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [
        { data: pendingData },
        { data: lowStockData },
        { data: dispensedData },
        { data: medicinesData },
      ] = await Promise.all([
        supabase
          .from('prescriptions')
          .select(`
            id, readable_id, status, created_at,
            patients ( readable_id, user_profiles ( full_name ) ),
            doctors ( user_profiles ( full_name ) ),
            prescription_items ( id )
          `)
          .in('status', ['pending', 'partially_dispensed'])
          .order('created_at', { ascending: true }),

        supabase
          .from('inventory')
          .select(`
            id, quantity_in_stock, reorder_level, expiry_date,
            medicines ( name, unit )
          `)
          .filter('quantity_in_stock', 'lte', 'reorder_level'),

        supabase
          .from('prescriptions')
          .select('id')
          .eq('status', 'dispensed')
          .gte('updated_at', new Date().toISOString().split('T')[0]),

        supabase
          .from('medicines')
          .select('id')
          .eq('is_active', true),
      ])

      setPending((pendingData as unknown as PendingPrescription[]) || [])
      setLowStock((lowStockData as unknown as LowStockItem[]) || [])
      setStats({
        pendingPrescriptions: pendingData?.length ?? 0,
        lowStockCount: lowStockData?.length ?? 0,
        dispensedToday: dispensedData?.length ?? 0,
        totalMedicines: medicinesData?.length ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-white animate-pulse"
              style={{ border: '1px solid #E2E8F0' }} />
          ))}
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Pending Prescriptions', value: stats.pendingPrescriptions, icon: Clock, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Low Stock Alerts', value: stats.lowStockCount, icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
    { label: 'Dispensed Today', value: stats.dispensedToday, icon: CheckCircle, color: '#0E7C6E', bg: '#E6F4F2' },
    { label: 'Active Medicines', value: stats.totalMedicines, icon: Package, color: '#6366F1', bg: '#EEF2FF' },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#0F172A]">Pharmacy Dashboard</h1>
        <p className="text-sm text-[#64748B] mt-0.5">
          {new Date().toLocaleDateString('en-UG', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-5"
            style={{ border: '1px solid #E2E8F0' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B]">{card.label}</p>
                <p className="text-3xl font-semibold text-[#0F172A] mt-1">{card.value}</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: card.bg }}>
                <card.icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pending Prescriptions */}
        <div className="bg-white rounded-xl" style={{ border: '1px solid #E2E8F0' }}>
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid #E2E8F0' }}>
            <h2 className="text-sm font-semibold text-[#0F172A]">Pending Prescriptions</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: '#FFFBEB', color: '#D97706' }}>
              {stats.pendingPrescriptions} waiting
            </span>
          </div>
          <div>
            {pending.length === 0 ? (
              <EmptyState
                icon={Pill}
                title="No pending prescriptions"
                description="All prescriptions have been dispensed."
              />
            ) : (
              pending.slice(0, 6).map((rx) => (
                <div key={rx.id} className="px-5 py-3.5 flex items-center justify-between"
                  style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ReadableId id={rx.readable_id} />
                      <StatusBadge type="prescription" status={rx.status} />
                    </div>
                    <p className="text-sm text-[#0F172A] font-medium truncate">
                      {(rx.patients as any)?.user_profiles?.full_name ?? '—'}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      Dr. {(rx.doctors as any)?.user_profiles?.full_name ?? '—'} &middot;{' '}
                      {rx.prescription_items?.length ?? 0} item(s)
                    </p>
                  </div>
                  <a
                    href="/pharmacist/prescriptions"
                    className="text-xs font-medium px-3 py-1.5 rounded-lg flex-shrink-0 ml-3"
                style={{ background: '#E6F4F2', color: '#0E7C6E' }}
                  >
                    Dispense
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl" style={{ border: '1px solid #E2E8F0' }}>
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid #E2E8F0' }}>
            <h2 className="text-sm font-semibold text-[#0F172A]">Low Stock Alerts</h2>
            {stats.lowStockCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: '#FEF2F2', color: '#DC2626' }}>
                {stats.lowStockCount} items
              </span>
            )}
          </div>
          <div>
            {lowStock.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Stock levels are healthy"
                description="No medicines are below their reorder level."
              />
            ) : (
              lowStock.slice(0, 6).map((item) => {
                const isExpired = new Date(item.expiry_date) < new Date()
                const nearExpiry = !isExpired &&
                  new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

                return (
                  <div key={item.id} className="px-5 py-3.5 flex items-center justify-between"
                    style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">
                        {(item.medicines as any)?.name ?? '—'}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {item.quantity_in_stock} {(item.medicines as any)?.unit} remaining &middot; reorder at {item.reorder_level}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      {isExpired ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: '#FEF2F2', color: '#DC2626' }}>
                          Expired
                        </span>
                      ) : nearExpiry ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: '#FFFBEB', color: '#D97706' }}>
                          Expiring soon
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: '#FEF2F2', color: '#DC2626' }}>
                          Low stock
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}