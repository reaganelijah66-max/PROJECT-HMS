export const USER_ROLES = [
  'super_admin',
  'admin',
  'doctor',
  'nurse',
  'pharmacist',
  'lab_technician',
  'receptionist',
  'accountant',
  'patient',
] as const

export type UserRole = typeof USER_ROLES[number]

export const STAFF_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'doctor',
  'nurse',
  'pharmacist',
  'lab_technician',
  'receptionist',
  'accountant',
]

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  doctor: 'Doctor',
  nurse: 'Nurse',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab Technician',
  receptionist: 'Receptionist',
  accountant: 'Accountant',
  patient: 'Patient',
}