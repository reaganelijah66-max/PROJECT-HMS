import {
  APPOINTMENT_STATUS_COLORS,
  BILL_STATUS_COLORS,
  BED_STATUS_COLORS,
  LAB_STATUS_COLORS,
  PRESCRIPTION_STATUS_COLORS,
  QUEUE_STATUS_COLORS,
  ADMISSION_STATUS_COLORS,
  INSURANCE_STATUS_COLORS,
} from '@/constants/statusColors'

type StatusType =
  | 'appointment'
  | 'bill'
  | 'bed'
  | 'lab'
  | 'prescription'
  | 'queue'
  | 'admission'
  | 'insurance'

interface StatusBadgeProps {
  type: StatusType
  status: string
}

function getColorClass(type: StatusType, status: string): string {
  switch (type) {
    case 'appointment':
      return APPOINTMENT_STATUS_COLORS[status as keyof typeof APPOINTMENT_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'
    case 'bill':
      return BILL_STATUS_COLORS[status as keyof typeof BILL_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'
    case 'bed':
      return BED_STATUS_COLORS[status as keyof typeof BED_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'
    case 'lab':
      return LAB_STATUS_COLORS[status as keyof typeof LAB_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'
    case 'prescription':
      return PRESCRIPTION_STATUS_COLORS[status as keyof typeof PRESCRIPTION_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'
    case 'queue':
      return QUEUE_STATUS_COLORS[status as keyof typeof QUEUE_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'
    case 'admission':
      return ADMISSION_STATUS_COLORS[status as keyof typeof ADMISSION_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'
    case 'insurance':
      return INSURANCE_STATUS_COLORS[status as keyof typeof INSURANCE_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function formatLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

export function StatusBadge({ type, status }: StatusBadgeProps) {
  const colorClass = getColorClass(type, status)

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {formatLabel(status)}
    </span>
  )
}