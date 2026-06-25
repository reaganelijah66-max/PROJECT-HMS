import { UserRole } from './roles'

export const ROLE_DEFAULT_ROUTES: Record<UserRole, string> = {
  patient: '/patient',
  doctor: '/doctor',
  nurse: '/nurse',
  receptionist: '/receptionist',
  pharmacist: '/pharmacist',
  lab_technician: '/lab',
  accountant: '/accountant',
  admin: '/admin',
  super_admin: '/admin',
}