'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ReadableId } from '@/components/shared/ReadableId'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pill, ChevronDown, ChevronUp, Check } from 'lucide-react'

interface PrescriptionItem {
  id: string
  medicine_name_snapshot: string
  dosage: string
  frequency: string
  duration_days: number
  quantity: number
  instructions: string
  medicines: { name: string; unit: string } | null
}

interface Prescription {
  id: string
  readable_id: string
  status: string
  notes: string | null
  created_at: string
  patients: { readable_id: string; user_profiles: { full_name: string } }
  doctors: { user_profiles: { full_name: string } }
  prescription_items: PrescriptionItem[]
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dispensing, setDispensing] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pending' | 'partially_dispensed' | 'all'>('pending')

  useEffect(() => {
    loadPrescriptions()
  }, [filter])

  async function loadPrescriptions() {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('prescriptions')
      .select(`
        id, readable_id, status, notes, created_at,
        patients ( readable_id, user_profiles ( full_name ) ),
        doctors ( user_profiles ( full_name ) ),
        prescription_items (
          id, medicine_name_snapshot, dosage, frequency,
          duration_days, quantity, instructions,
          medicines ( name, unit )
        )
      `)
      .order('created_at', { ascending: true })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data } = await query
    setPrescriptions((data as unknown as Prescription[]) || [])
    setLoading(false)
  }

  async function handleDispense(prescriptionId: string, totalItems: number) {
    setDispensing(prescriptionId)
    const supabase = createClient()

    const newStatus = 'dispensed'

    await supabase
      .from('prescriptions')
      .update({ status: newStatus })
      .eq('id', prescriptionId)

    setDispensing(null)
    loadPrescriptions()
  }

  const filters = [
    { key: 'pending', label: 'Pending' },
    { key: 'partially_dispensed', label: 'Partial' },
    { key: 'all', label: 'All' },
  ] as const

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Prescriptions</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Review and dispense patient prescriptions
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: filter === f.key ? '#0E7C6E' : '#ffffff',
              color: filter === f.key ? '#ffffff' : '#64748B',
              border: `1px solid ${filter === f.key ? '#0E7C6E' : '#E2E8F0'}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white animate-pulse"
              style={{ border: '1px solid #E2E8F0' }} />
          ))}
        </div>
      ) : prescriptions.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No prescriptions found"
          description="There are no prescriptions matching this filter."
        />
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => {
            const isExpanded = expanded === rx.id
            const patientName = (rx.patients as any)?.user_profiles?.full_name ?? '—'
            const doctorName = (rx.doctors as any)?.user_profiles?.full_name ?? '—'

            return (
              <div key={rx.id} className="bg-white rounded-xl overflow-hidden"
                style={{ border: '1px solid #E2E8F0' }}>

                {/* Row header */}
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <ReadableId id={rx.readable_id} />
                    <StatusBadge type="prescription" status={rx.status} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">
                        {patientName}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Dr. {doctorName} &middot; {rx.prescription_items?.length ?? 0} item(s) &middot;{' '}
                        {new Date(rx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {rx.status !== 'dispensed' && rx.status !== 'cancelled' && (
                      <button
                        onClick={() => handleDispense(rx.id, rx.prescription_items?.length)}
                        disabled={dispensing === rx.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: dispensing === rx.id ? '#F1F5F9' : '#0E7C6E',
                          color: dispensing === rx.id ? '#64748B' : '#ffffff',
                        }}>
                        <Check className="w-3.5 h-3.5" />
                        {dispensing === rx.id ? 'Dispensing...' : 'Mark Dispensed'}
                      </button>
                    )}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : rx.id)}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ color: '#64748B' }}>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded items */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #F1F5F9' }}>
                    {rx.notes && (
                      <div className="px-5 py-3 text-xs text-[#64748B]"
                        style={{ background: '#FAFAFA', borderBottom: '1px solid #F1F5F9' }}>
                        <span className="font-medium text-[#0F172A]">Notes: </span>
                        {rx.notes}
                      </div>
                    )}
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: '#F8FAFC' }}>
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-[#64748B]">Medicine</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-[#64748B]">Dosage</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-[#64748B]">Frequency</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-[#64748B]">Days</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-[#64748B]">Qty</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-[#64748B]">Instructions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rx.prescription_items?.map((item) => (
                          <tr key={item.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                            <td className="px-5 py-3 font-medium text-[#0F172A]">
                              {item.medicine_name_snapshot || item.medicines?.name || '—'}
                            </td>
                            <td className="px-3 py-3 text-[#64748B]">{item.dosage}</td>
                            <td className="px-3 py-3 text-[#64748B]">{item.frequency}</td>
                            <td className="px-3 py-3 text-[#64748B]">{item.duration_days}d</td>
                            <td className="px-3 py-3 text-[#64748B]">
                              {item.quantity} {item.medicines?.unit ?? ''}
                            </td>
                            <td className="px-3 py-3 text-[#64748B]">{item.instructions || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}