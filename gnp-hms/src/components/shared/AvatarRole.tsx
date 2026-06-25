import { UserRole } from '@/constants/roles'
import { ROLE_LABELS } from '@/constants/roles'

interface AvatarRoleProps {
  name: string
  role: UserRole
  size?: 'sm' | 'md' | 'lg'
}

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700 ring-purple-300',
  admin: 'bg-slate-100 text-slate-700 ring-slate-300',
  doctor: 'bg-blue-100 text-blue-700 ring-blue-300',
  nurse: 'bg-pink-100 text-pink-700 ring-pink-300',
  pharmacist: 'bg-orange-100 text-orange-700 ring-orange-300',
  lab_technician: 'bg-cyan-100 text-cyan-700 ring-cyan-300',
  receptionist: 'bg-teal-100 text-teal-700 ring-teal-300',
  accountant: 'bg-green-100 text-green-700 ring-green-300',
  patient: 'bg-indigo-100 text-indigo-700 ring-indigo-300',
}

const SIZE_CLASSES = {
  sm: 'w-7 h-7 text-xs ring-1',
  md: 'w-9 h-9 text-sm ring-2',
  lg: 'w-11 h-11 text-base ring-2',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function AvatarRole({ name, role, size = 'md' }: AvatarRoleProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`
          ${SIZE_CLASSES[size]}
          ${ROLE_COLORS[role]}
          rounded-full flex items-center justify-center font-semibold ring-offset-1 flex-shrink-0
        `}
      >
        {getInitials(name)}
      </div>
      <div className="leading-none">
        <p className="text-sm font-medium text-[#0F172A]">{name}</p>
        <p className="text-xs text-[#64748B] mt-0.5">{ROLE_LABELS[role]}</p>
      </div>
    </div>
  )
}