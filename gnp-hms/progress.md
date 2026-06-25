# GNP HMS — Frontend Build Progress

## Stack
- Next.js 16 (App Router) · TypeScript · Tailwind CSS v4
- shadcn/ui · @supabase/supabase-js · @supabase/ssr
- recharts · date-fns · sonner · cmdk · react-day-picker

## Environment
- OS: Windows 11
- Package manager: pnpm
- Editor: VS Code
- Repo: GitHub (private) — main branch

---

## PHASE 1 — Foundation

### ✅ Project Setup
- Next.js app created with TypeScript, Tailwind, ESLint, App Router
- pnpm used (npm had allow-scripts policy issues)
- All dependencies installed
- shadcn initialized + 19 components added to src/components/ui/
- Full folder and file structure created
- Connected to GitHub

### ✅ Supabase Client Setup
- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/server.ts` — server client (RSC/actions)
- `src/lib/supabase/middleware.ts` — session refresh + role-based redirect
- `src/middleware.ts` — Next.js middleware entry point

### ⬜ Auth Pages
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`

### ⬜ Shared Shell
- `src/app/(dashboard)/layout.tsx` — sidebar + topbar wrapper
- `src/components/shared/StatusBadge.tsx`
- `src/components/shared/ReadableId.tsx`
- `src/components/shared/NotificationBell.tsx`
- `src/components/shared/DataTable.tsx`
- `src/components/shared/EmptyState.tsx`
- `src/components/shared/AvatarRole.tsx`

### ⬜ Constants
- `src/constants/roles.ts`
- `src/constants/routes.ts`
- `src/constants/statusColors.ts`

### ⬜ Hooks
- `src/hooks/useAuth.ts`
- `src/hooks/useNotifications.ts`
- `src/hooks/useRealtimeQueue.ts`
- `src/hooks/useBillTotals.ts`

---

## PHASE 2 — Core Clinical

### ⬜ Patient Role
- `/patient/page.tsx` — dashboard
- `/patient/appointments/page.tsx`
- `/patient/records/page.tsx`
- `/patient/bills/page.tsx`
- `/patient/doctors/page.tsx`

### ⬜ Receptionist Role
- `/receptionist/page.tsx` — dashboard
- `/receptionist/book/page.tsx`
- `/receptionist/checkin/page.tsx`
- `/receptionist/register/page.tsx`
- `/receptionist/assign-doctor/page.tsx`
- `/receptionist/payments/page.tsx`

### ⬜ Doctor Role
- `/doctor/page.tsx` — dashboard
- `/doctor/patients/page.tsx`
- `/doctor/patients/[patientId]/page.tsx`
- `/doctor/appointments/page.tsx`
- `/doctor/lab-requests/page.tsx`

---

## PHASE 3 — Lab & Pharmacy

### ⬜ Lab Technician Role
- `/lab/page.tsx` — dashboard
- `/lab/queue/page.tsx`
- `/lab/results/[labRequestItemId]/page.tsx`

### ⬜ Pharmacist Role
- `/pharmacist/page.tsx` — dashboard
- `/pharmacist/prescriptions/page.tsx`
- `/pharmacist/medicines/page.tsx`
- `/pharmacist/inventory/page.tsx`
- `/pharmacist/suppliers/page.tsx`

---

## PHASE 4 — Billing & Operations

### ⬜ Accountant Role
- `/accountant/page.tsx` — dashboard
- `/accountant/bills/page.tsx`
- `/accountant/payments/page.tsx`
- `/accountant/insurance/page.tsx`
- `/accountant/reports/page.tsx`

### ⬜ Nurse Role
- `/nurse/page.tsx` — dashboard
- `/nurse/ward/page.tsx`
- `/nurse/queue/page.tsx`
- `/nurse/admissions/page.tsx`

---

## PHASE 5 — Admin & Polish

### ⬜ Admin Role
- `/admin/page.tsx` — dashboard
- `/admin/users/page.tsx`
- `/admin/wards/page.tsx`
- `/admin/lab-tests/page.tsx`
- `/admin/audit/page.tsx`
- `/admin/sequences/page.tsx`

### ⬜ Forms
- `AppointmentForm.tsx`
- `MedicalRecordForm.tsx`
- `DiagnosisForm.tsx`
- `PrescriptionForm.tsx`
- `LabRequestForm.tsx`
- `LabResultForm.tsx`
- `PaymentForm.tsx`
- `InsuranceClaimForm.tsx`
- `AdmissionForm.tsx`
- `PatientRegistrationForm.tsx`

### ⬜ Charts
- `RevenueChart.tsx`
- `OccupancyChart.tsx`
- `AppointmentVolumeChart.tsx`
- `LabTurnaroundChart.tsx`

### ⬜ Query Files
- All 11 files in `src/lib/queries/`

### ⬜ Realtime
- Notification bell subscription
- Queue realtime updates

### ⬜ Final
- Mobile responsiveness pass
- .env.local filled with real Supabase credentials
- TypeScript types generated from live schema
- Deploy to Vercel

---

## Key Rules (Never Break These)
1. Never calculate bill totals client-side — always query `bill_totals` VIEW
2. Never send `readable_id` on INSERT — trigger generates it server-side
3. Never send `amount` on bill_items INSERT — trigger computes it
4. Payments are INSERT-only — no edit UI anywhere
5. Role guards are UX only — RLS is the real security boundary
6. Never add a "Run Queue Job" button — Edge Function runs on schedule

---

## Notes
- shadcn CLI was blocked by npm allow-scripts policy — switched to pnpm
- All shadcn dependencies were pre-installed manually before CLI ran
- button.tsx was skipped by shadcn (already existed) — check it has content
- `.env.local` has placeholder values — replace before first run