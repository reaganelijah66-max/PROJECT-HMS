'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pill, Plus, Search, Pencil, X, Check } from 'lucide-react'

interface Medicine {
  id: string
  name: string
  generic_name: string | null
  category: string | null
  unit: string
  price: number
  is_active: boolean
}

interface MedicineForm {
  name: string
  generic_name: string
  category: string
  unit: string
  price: string
  is_active: boolean
}

const EMPTY_FORM: MedicineForm = {
  name: '',
  generic_name: '',
  category: '',
  unit: '',
  price: '',
  is_active: true,
}

const CATEGORIES = [
  'Analgesic', 'Antibiotic', 'Antifungal', 'Antihistamine',
  'Antihypertensive', 'Antiparasitic', 'Antiviral', 'Cardiovascular',
  'Dermatological', 'Diabetes', 'Gastrointestinal', 'Hormonal',
  'Nutritional', 'Respiratory', 'Vaccine', 'Other',
]

const UNITS = ['tablet', 'capsule', 'ml', 'mg', 'g', 'sachet', 'vial', 'ampoule', 'patch', 'drop']

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [filtered, setFiltered] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MedicineForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadMedicines() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      medicines.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.generic_name?.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q)
      )
    )
  }, [search, medicines])

  async function loadMedicines() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('medicines')
      .select('*')
      .order('name')
    setMedicines((data as Medicine[]) || [])
    setLoading(false)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setError('')
    setShowForm(true)
  }

  function openEdit(m: Medicine) {
    setForm({
      name: m.name,
      generic_name: m.generic_name ?? '',
      category: m.category ?? '',
      unit: m.unit,
      price: String(m.price),
      is_active: m.is_active,
    })
    setEditingId(m.id)
    setError('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name || !form.unit || !form.price) {
      setError('Name, unit and price are required.')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()

    const payload = {
      name: form.name,
      generic_name: form.generic_name || null,
      category: form.category || null,
      unit: form.unit,
      price: parseFloat(form.price),
      is_active: form.is_active,
    }

    if (editingId) {
      await supabase.from('medicines').update(payload).eq('id', editingId)
    } else {
      await supabase.from('medicines').insert(payload)
    }

    setSaving(false)
    setShowForm(false)
    loadMedicines()
  }

  async function toggleActive(m: Medicine) {
    const supabase = createClient()
    await supabase
      .from('medicines')
      .update({ is_active: !m.is_active })
      .eq('id', m.id)
    loadMedicines()
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Medicines</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Manage the medicine catalog
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#0E7C6E' }}>
          <Plus className="w-4 h-4" />
          Add Medicine
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Search by name, generic name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-lg border text-sm outline-none"
          style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
          onFocus={(e) => e.target.style.borderColor = '#0E7C6E'}
          onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white animate-pulse"
              style={{ border: '1px solid #E2E8F0' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No medicines found"
          description="Add a medicine to the catalog or adjust your search."
        />
      ) : (
        <div className="bg-white rounded-xl overflow-hidden"
          style={{ border: '1px solid #E2E8F0' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#64748B]">Name</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-[#64748B]">Generic</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-[#64748B]">Category</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-[#64748B]">Unit</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-[#64748B]">Price (UGX)</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-[#64748B]">Status</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-[#64748B]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td className="px-5 py-3 font-medium text-[#0F172A]">{m.name}</td>
                  <td className="px-3 py-3 text-[#64748B]">{m.generic_name || '—'}</td>
                  <td className="px-3 py-3 text-[#64748B]">{m.category || '—'}</td>
                  <td className="px-3 py-3 text-[#64748B]">{m.unit}</td>
                  <td className="px-3 py-3 text-[#0F172A]">
                    {m.price.toLocaleString()}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: m.is_active ? '#E6F4F2' : '#F1F5F9',
                        color: m.is_active ? '#0E7C6E' : '#64748B',
                      }}>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(m)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color: '#64748B' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleActive(m)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color: m.is_active ? '#EF4444' : '#0E7C6E' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        {m.is_active
                          ? <X className="w-3.5 h-3.5" />
                          : <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-over form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-xl">

            {/* Form header */}
            <div className="px-6 py-5 flex items-center justify-between"
              style={{ borderBottom: '1px solid #E2E8F0' }}>
              <h2 className="text-base font-semibold text-[#0F172A]">
                {editingId ? 'Edit Medicine' : 'Add Medicine'}
              </h2>
              <button onClick={() => setShowForm(false)}
                style={{ color: '#64748B' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#0F172A]">
                  Medicine Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paracetamol"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => e.target.style.borderColor = '#0E7C6E'}
                  onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#0F172A]">Generic Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acetaminophen"
                  value={form.generic_name}
                  onChange={(e) => setForm({ ...form, generic_name: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => e.target.style.borderColor = '#0E7C6E'}
                  onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#0F172A]">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                  style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                  onFocus={(e) => e.target.style.borderColor = '#0E7C6E'}
                  onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}>
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#0F172A]">
                  Unit <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                  style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                  onFocus={(e) => e.target.style.borderColor = '#0E7C6E'}
                  onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}>
                  <option value="">Select unit</option>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#0F172A]">
                  Price (UGX) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => e.target.style.borderColor = '#0E7C6E'}
                  onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className="w-10 h-6 rounded-full transition-all flex items-center px-0.5"
                  style={{ background: form.is_active ? '#0E7C6E' : '#CBD5E1' }}>
                  <div className="w-5 h-5 rounded-full bg-white shadow transition-all"
                    style={{ transform: form.is_active ? 'translateX(16px)' : 'translateX(0)' }} />
                </button>
                <span className="text-sm text-[#0F172A]">
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {error && (
                <div className="rounded-lg px-3 py-2.5 text-sm"
                  style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                  {error}
                </div>
              )}
            </div>

            {/* Form footer */}
            <div className="px-6 py-4 flex gap-3"
              style={{ borderTop: '1px solid #E2E8F0' }}>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 h-10 rounded-lg text-sm font-medium"
                style={{ border: '1px solid #E2E8F0', color: '#64748B' }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-10 rounded-lg text-sm font-medium text-white"
                style={{ background: saving ? '#64748B' : '#0E7C6E' }}>
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Medicine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}