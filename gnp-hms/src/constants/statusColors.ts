export const APPOINTMENT_STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-teal-100 text-teal-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-gray-100 text-gray-600',
} as const

export const BILL_STATUS_COLORS = {
  unpaid: 'bg-red-100 text-red-700',
  partially_paid: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-purple-100 text-purple-700',
} as const

export const BED_STATUS_COLORS = {
  available: 'bg-green-100 text-green-700',
  occupied: 'bg-red-100 text-red-700',
  maintenance: 'bg-amber-100 text-amber-700',
  reserved: 'bg-blue-100 text-blue-700',
} as const

export const LAB_STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-600',
  sample_collected: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
} as const

export const PRESCRIPTION_STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  dispensed: 'bg-green-100 text-green-700',
  partially_dispensed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
} as const

export const QUEUE_STATUS_COLORS = {
  waiting: 'bg-gray-100 text-gray-600',
  called: 'bg-amber-100 text-amber-700',
  in_consultation: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  skipped: 'bg-red-100 text-red-700',
} as const

export const ADMISSION_STATUS_COLORS = {
  admitted: 'bg-blue-100 text-blue-700',
  discharged: 'bg-green-100 text-green-700',
  transferred: 'bg-amber-100 text-amber-700',
} as const

export const INSURANCE_STATUS_COLORS = {
  submitted: 'bg-gray-100 text-gray-600',
  under_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-teal-100 text-teal-700',
} as const