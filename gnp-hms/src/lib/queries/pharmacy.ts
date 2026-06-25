import { createClient } from '@/lib/supabase/client'

// ─── MEDICINES ───────────────────────────────────────────────

export async function getMedicines() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('medicines')
    .select('*')
    .order('name')
  return { data, error }
}

export async function getMedicineById(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('medicines')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export async function createMedicine(medicine: {
  name: string
  generic_name?: string
  category?: string
  unit: string
  price: number
  is_active?: boolean
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('medicines')
    .insert(medicine)
    .select()
    .single()
  return { data, error }
}

export async function updateMedicine(id: string, updates: {
  name?: string
  generic_name?: string
  category?: string
  unit?: string
  price?: number
  is_active?: boolean
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('medicines')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// ─── INVENTORY ───────────────────────────────────────────────

export async function getInventory() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      medicines (id, name, generic_name, unit, category),
      suppliers (id, name)
    `)
    .order('expiry_date', { ascending: true })
  return { data, error }
}

export async function getLowStockItems() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      medicines (id, name, unit)
    `)
    .filter('quantity_in_stock', 'lte', 'reorder_level')
  return { data, error }
}

export async function addInventoryStock(stock: {
  medicine_id: string
  batch_number: string
  quantity_in_stock: number
  reorder_level: number
  expiry_date: string
  cost_per_unit: number
  supplier_id?: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('inventory')
    .insert(stock)
    .select()
    .single()
  return { data, error }
}

export async function updateInventoryStock(id: string, updates: {
  quantity_in_stock?: number
  reorder_level?: number
  expiry_date?: string
  cost_per_unit?: number
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('inventory')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// ─── PRESCRIPTIONS ───────────────────────────────────────────

export async function getPendingPrescriptions() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      *,
      patients (
        id,
        readable_id,
        user_profiles (full_name)
      ),
      doctors (
        id,
        readable_id,
        user_profiles (full_name)
      ),
      prescription_items (
        id,
        medicine_name_snapshot,
        dosage,
        frequency,
        duration_days,
        quantity,
        instructions,
        medicine_id,
        medicines (name, unit)
      )
    `)
    .in('status', ['pending', 'partially_dispensed'])
    .order('created_at', { ascending: true })
  return { data, error }
}

export async function getAllPrescriptions() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      *,
      patients (
        id,
        readable_id,
        user_profiles (full_name)
      ),
      doctors (
        id,
        readable_id,
        user_profiles (full_name)
      ),
      prescription_items (
        id,
        medicine_name_snapshot,
        dosage,
        frequency,
        duration_days,
        quantity,
        instructions,
        medicine_id
      )
    `)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function dispensePrescription(prescriptionId: string, itemIds: string[]) {
  const supabase = createClient()

  // Update prescription status
  const allItems = await supabase
    .from('prescription_items')
    .select('id')
    .eq('prescription_id', prescriptionId)

  const totalItems = allItems.data?.length ?? 0
  const dispensedCount = itemIds.length
  const newStatus = dispensedCount >= totalItems ? 'dispensed' : 'partially_dispensed'

  const { error: prescriptionError } = await supabase
    .from('prescriptions')
    .update({ status: newStatus })
    .eq('id', prescriptionId)

  if (prescriptionError) return { error: prescriptionError }

  return { error: null }
}

// ─── SUPPLIERS ───────────────────────────────────────────────

export async function getSuppliers() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name')
  return { data, error }
}

export async function createSupplier(supplier: {
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('suppliers')
    .insert(supplier)
    .select()
    .single()
  return { data, error }
}

export async function updateSupplier(id: string, updates: {
  name?: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('suppliers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteSupplier(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id)
  return { error }
}

// ─── MEDICINE SUPPLIERS (junction) ───────────────────────────

export async function getMedicinesBySupplier(supplierId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('medicine_suppliers')
    .select(`
      *,
      medicines (id, name, generic_name, unit, category)
    `)
    .eq('supplier_id', supplierId)
  return { data, error }
}