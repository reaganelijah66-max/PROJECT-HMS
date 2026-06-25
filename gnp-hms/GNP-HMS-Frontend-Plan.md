# GNP HMS — Frontend Planning Document
**Backend:** Supabase/Postgres · 33 tables · 9 roles · Full RLS  
**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · @supabase/supabase-js

---

## 1. Design System

### Palette
| Token | Hex | Usage |
|---|---|---|
| `--primary` | `#0E7C6E` | Primary actions, active nav, links |
| `--primary-light` | `#E6F4F2` | Hover states, pill backgrounds |
| `--accent` | `#F59E0B` | Warnings, pending badges, alerts |
| `--danger` | `#EF4444` | Errors, critical alerts, abnormal lab results |
| `--success` | `#10B981` | Confirmed, paid, dispensed badges |
| `--surface` | `#F8FAFC` | Page background |
| `--card` | `#FFFFFF` | Card/panel backgrounds |
| `--border` | `#E2E8F0` | Dividers, input borders |
| `--text-primary` | `#0F172A` | Headlines, labels |
| `--text-muted` | `#64748B` | Secondary text, timestamps |

### Typography
- **Display / headings:** `Inter` (semibold 600, tracking tight)
- **Body / data:** `Inter` (regular 400, 14px base)
- **Monospace (IDs, codes):** `JetBrains Mono` — used for `PAT-000001`, `APT-000001`, ICD codes, etc.

### Status Badge System
One `<StatusBadge>` component handles **every enum** in the schema:

| Enum | Values → Color |
|---|---|
| `appointment_status` | scheduled→blue, confirmed→teal, in_progress→amber, completed→green, cancelled→red, no_show→gray |
| `bill_status` | unpaid→red, partially_paid→amber, paid→green, cancelled→gray, refunded→purple |
| `bed_status` | available→green, occupied→red, maintenance→amber, reserved→blue |
| `lab_request_status` | pending→gray, sample_collected→blue, in_progress→amber, completed→green, cancelled→red |
| `prescription_status` | pending→amber, dispensed→green, partially_dispensed→blue, cancelled→red |
| `queue_status` | waiting→gray, called→amber, in_consultation→blue, done→green, skipped→red |
| `admission_status` | admitted→blue, discharged→green, transferred→amber |
| `insurance_claim_status` | submitted→gray, under_review→amber, approved→green, rejected→red, paid→teal |

---

## 2. Project Structure

```
hms-frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root: AuthProvider + ThemeProvider
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx     # Patient self-registration only
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx            # Shell: sidebar + topbar
│   │   │   ├── patient/              # role = patient
│   │   │   ├── doctor/               # role = doctor
│   │   │   ├── nurse/                # role = nurse
│   │   │   ├── receptionist/         # role = receptionist
│   │   │   ├── pharmacist/           # role = pharmacist
│   │   │   ├── lab/                  # role = lab_technician
│   │   │   ├── accountant/           # role = accountant
│   │   │   └── admin/                # role = admin | super_admin
│   │   └── not-found.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # createBrowserClient()
│   │   │   ├── server.ts             # createServerClient() for RSC/actions
│   │   │   └── middleware.ts         # session refresh
│   │   ├── types/
│   │   │   └── database.ts           # Generated: supabase gen types typescript
│   │   └── queries/                  # One file per domain — no raw queries in components
│   │       ├── patients.ts
│   │       ├── appointments.ts
│   │       ├── medicalRecords.ts
│   │       ├── diagnoses.ts
│   │       ├── prescriptions.ts
│   │       ├── labRequests.ts
│   │       ├── labResults.ts
│   │       ├── pharmacy.ts           # medicines + inventory + suppliers
│   │       ├── billing.ts            # bills + bill_totals VIEW + payments + insurance
│   │       ├── operations.ts         # wards + beds + admissions + queue
│   │       └── notifications.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                # current user + role from user_profiles
│   │   ├── useNotifications.ts       # realtime subscription on notifications table
│   │   ├── useRealtimeQueue.ts       # realtime patient_queue for receptionist/nurse
│   │   └── useBillTotals.ts          # always queries bill_totals VIEW, never calculates
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives (auto-generated)
│   │   ├── shared/
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── ReadableId.tsx        # monospace pill, copy-on-click
│   │   │   ├── NotificationBell.tsx  # realtime badge counter
│   │   │   ├── DataTable.tsx         # sortable, filterable, paginated
│   │   │   ├── PatientCard.tsx       # reusable patient summary card
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── AvatarRole.tsx        # avatar with role color ring
│   │   ├── forms/
│   │   │   ├── AppointmentForm.tsx
│   │   │   ├── MedicalRecordForm.tsx
│   │   │   ├── DiagnosisForm.tsx
│   │   │   ├── PrescriptionForm.tsx  # multi-item, medicine picker
│   │   │   ├── LabRequestForm.tsx    # multi-test picker (cart-style)
│   │   │   ├── LabResultForm.tsx     # one per lab_request_item
│   │   │   ├── PaymentForm.tsx       # method enum + reference_number
│   │   │   ├── InsuranceClaimForm.tsx
│   │   │   ├── AdmissionForm.tsx
│   │   │   └── PatientRegistrationForm.tsx
│   │   └── charts/
│   │       ├── RevenueChart.tsx      # bills/payments over time (accountant/admin)
│   │       ├── OccupancyChart.tsx    # beds by status (nurse/admin)
│   │       ├── AppointmentVolumeChart.tsx
│   │       └── LabTurnaroundChart.tsx
│   │
│   ├── middleware.ts                 # Supabase session + role-based redirect
│   └── constants/
│       ├── roles.ts                  # user_role enum values
│       ├── routes.ts                 # role → default redirect map
│       └── statusColors.ts          # enum → Tailwind class map
│
├── .env.local                        # NEXT_PUBLIC_SUPABASE_URL + ANON_KEY
└── tsconfig.json
```

---

## 3. Authentication & Routing

### Middleware Logic (`middleware.ts`)
```
1. No session → redirect to /login
2. Has session → read user_profiles.role
3. Role → redirect to /[role] if on root
4. Route mismatch for role → redirect to own dashboard
```

### Role → Default Route Map
| Role | Default Route |
|---|---|
| `patient` | `/patient/dashboard` |
| `doctor` | `/doctor/dashboard` |
| `nurse` | `/nurse/dashboard` |
| `receptionist` | `/receptionist/dashboard` |
| `pharmacist` | `/pharmacist/dashboard` |
| `lab_technician` | `/lab/dashboard` |
| `accountant` | `/accountant/dashboard` |
| `admin` / `super_admin` | `/admin/dashboard` |

**Security note:** Route guards are UX only. RLS is the real boundary — a wrong-role query returns zero rows regardless.

---

## 4. Shared Shell

Every authenticated route is wrapped in a persistent shell:

### Sidebar
- Logo + hospital name
- Role-specific nav links (see per-role sections)
- `<NotificationBell>` with unread count from realtime subscription
- User avatar + name at bottom, "Sign out" button

### Topbar
- Current page title
- Breadcrumb for deep pages
- Quick search (patients by readable_id or name — admin/receptionist/doctor only)
- Notification dropdown

---

## 5. Role-by-Role Pages

---

### 5.1 PATIENT

**Nav:** Dashboard · My Appointments · My Records · My Bills · Doctors

#### `/patient/dashboard`
- Welcome card with name and PAT-XXXXXX readable ID
- Upcoming appointments list (next 3, status badge, doctor name)
- Recent lab results with abnormal flag highlighted
- Outstanding balance from `bill_totals` VIEW
- Unread notifications

#### `/patient/appointments`
- Calendar view + list view toggle
- Each appointment: date, doctor, reason, status badge
- "Book appointment" button → `<AppointmentForm>` modal
  - Doctor picker (from doctors + user_profiles join)
  - Date/time picker
  - Reason text

#### `/patient/records`
Tabbed layout:
- **Medical Records** — visit date, doctor, chief complaint; expand for diagnosis list
- **Prescriptions** — RX-XXXXXX, status badge, medicine list with dosage
- **Lab Results** — test name, result value, reference range, abnormal flag (red highlight)

> All data scoped to own patient_id via RLS — no client-side filtering needed.

#### `/patient/bills`
- Bills table: BIL-XXXXXX, date, status badge
- Each row expands to show: `bill_items` line items + `total_charged` / `total_paid` / `outstanding_balance` from `bill_totals` VIEW
- Insurance claims tab
- **Never calculate totals client-side** — always read from `bill_totals`

#### `/patient/doctors`
- Searchable list of active doctors: name, specialization, department, consultation_fee
- Read-only directory

---

### 5.2 DOCTOR

**Nav:** Dashboard · My Patients · Appointments · Lab Requests · Notifications

#### `/doctor/dashboard`
- Today's appointment queue — pulled from `patient_queue` (in_consultation status highlighted)
- Pending lab results notification count
- Pending prescriptions (status = pending) count
- Quick-action buttons: "Write Record", "New Prescription", "Order Lab Test"

#### `/doctor/patients`
- List from `doctor_patient_assignments` (is_active = true) joined with `patients` + `user_profiles`
- Each row: PAT-XXXXXX, name, blood_group, allergies (abbreviated), last visit date
- Click → `PatientDetail` page

#### `/doctor/patients/[patientId]`
Tabbed full patient profile:
- **Overview** — demographics, emergency contact, blood group, allergies, active diagnoses
- **Medical Records** — list of MR-XXXXXX records, each expandable with: chief complaint, examination notes, diagnoses, treatment plan
- **Prescriptions** — RX-XXXXXX list with items; "New Prescription" button → `<PrescriptionForm>` slide-over
- **Lab Work** — LRQ-XXXXXX requests with per-test status; results inline when completed; abnormal results flagged red
- **Admissions** — ADM-XXXXXX history with ward, dates

#### `/doctor/appointments`
- Calendar view of own appointments
- Click appointment → open `<MedicalRecordForm>` for that appointment_id (pre-filled with patient)

#### `/doctor/lab-requests`
- New lab request form — patient picker, test picker (cart with multiple `lab_request_items`), link to medical_record (optional)
- Pending requests awaiting results — realtime updates via Supabase realtime

---

### 5.3 NURSE

**Nav:** Dashboard · Ward Patients · Beds · Queue · Admissions

#### `/nurse/dashboard`
- Own ward occupancy: occupied / available / maintenance / reserved bed count
- Active admissions in own ward
- Today's queue status summary

#### `/nurse/ward`
Visual bed grid — each bed as a card showing:
- Bed number, status badge (color-coded: green/red/amber/blue)
- Occupied: patient name, admission date
- Click → patient detail (read-only: own ward RLS)

#### `/nurse/queue`
Live queue from `patient_queue` with realtime updates:
- Queue number, patient name, appointment vs walk-in indicator
- Status controls: mark as called / in_consultation / done / skipped
- Called_at and completed_at timestamps

#### `/nurse/admissions`
- Admit patient form → `<AdmissionForm>` (ward picker, doctor picker, reason)
- Active admissions table with discharge button → sets `status = discharged`, `discharged_at = now()`
- Discharge notes field

---

### 5.4 RECEPTIONIST

**Nav:** Dashboard · Book Appointment · Check In · Register Patient · Assign Doctor · Payments

#### `/receptionist/dashboard`
- Today's appointment count by status
- Live queue count (waiting, called, in progress)
- Alerts: appointments with no queue entry yet

#### `/receptionist/book`
- Full `<AppointmentForm>` — patient search/picker, doctor picker, date/time, reason
- Appointment creates → if `appointment_date` is today, offer to "Also check in" → inserts into `patient_queue`

#### `/receptionist/checkin`
- Walk-in check-in: patient search + optional appointment link
- Assigns queue_number (server generates next integer)
- Live queue board: drag-free status view

#### `/receptionist/register`
Full `<PatientRegistrationForm>`:
- Creates Supabase auth user (via admin API — requires admin-authenticated endpoint or Edge Function)
- Inserts `user_profiles` (role = patient) + `patients` row
- `readable_id` auto-generated by trigger — do NOT send it in the insert payload

#### `/receptionist/assign-doctor`
- Search patient → show current `doctor_patient_assignments`
- Search doctor → assign with `is_active = true`
- Unassign: sets `is_active = false`, `unassigned_at = now()`

#### `/receptionist/payments`
- Search bill by BIL-XXXXXX or patient name
- Show `bill_totals` VIEW (total_charged, total_paid, outstanding_balance)
- `<PaymentForm>`: amount, method (cash/card/mobile_money/insurance/bank_transfer), reference_number
- INSERT into `payments` only — no UPDATE of existing payments (immutability rule)

---

### 5.5 PHARMACIST

**Nav:** Dashboard · Prescriptions · Medicines · Inventory · Suppliers

#### `/pharmacist/dashboard`
- Pending prescription count (status = pending)
- Low-stock alerts (from `inventory` where `quantity_in_stock <= reorder_level`)
- Recently dispensed (last 10)

#### `/pharmacist/prescriptions`
Queue of `prescriptions` with status = pending or partially_dispensed:
- RX-XXXXXX, patient name, prescribing doctor, item count
- Click → full prescription detail with `prescription_items`
- Dispense action per item or bulk dispense all:
  - Sets `prescription.status` = dispensed (or partially_dispensed)
  - Decrements `inventory.quantity_in_stock` for matching medicine

#### `/pharmacist/medicines`
- Searchable catalog of `medicines`
- Create/edit medicine: name, generic_name, category, unit, price, is_active toggle
- Bulk activate/deactivate

#### `/pharmacist/inventory`
- Table: medicine, batch_number, quantity_in_stock, expiry_date, reorder_level, supplier
- Highlight: expired (red), near-expiry < 30 days (amber), low-stock (orange)
- "Add Stock" form: medicine picker, batch, quantity, expiry, supplier, cost_per_unit
- Expiry date filter

#### `/pharmacist/suppliers`
- `suppliers` table CRUD: name, contact_person, phone, email, address
- Link: medicines supplied per supplier via `medicine_suppliers`

---

### 5.6 LAB TECHNICIAN

**Nav:** Dashboard · Request Queue · Enter Results

#### `/lab/dashboard`
- Pending requests count by status
- Today's completed results
- Results with `is_abnormal = true` highlighted

#### `/lab/queue`
List of `lab_requests` with status ≠ completed/cancelled:
- LRQ-XXXXXX, patient name, requesting doctor, date, item count
- Expand: list of `lab_request_items` each with their status
- Per-item status update: pending → sample_collected → in_progress → completed

#### `/lab/results/[labRequestItemId]`
`<LabResultForm>` for a single `lab_request_item`:
- result_value, result_unit, reference_range
- `is_abnormal` checkbox
- remarks text area
- result_file_url (file upload → Supabase Storage, store URL)
- On save: INSERT into `lab_results` (1:1 with lab_request_item enforced by UNIQUE FK)
- This triggers the doctor notification automatically (backend trigger handles it)

---

### 5.7 ACCOUNTANT

**Nav:** Dashboard · Bills · Payments · Insurance Claims · Reports

#### `/accountant/dashboard`
- Today's revenue (sum of payments.amount where paid_at = today)
- Outstanding balance total (sum of outstanding_balance from bill_totals WHERE status != 'paid')
- Bills by status distribution (donut chart)
- Recent payments feed

#### `/accountant/bills`
- Bills table: BIL-XXXXXX, patient, date, total_charged, total_paid, outstanding_balance, status badge
- All totals from `bill_totals` VIEW — never recalculated
- Create bill: patient picker + optional medical_record or appointment link
- Add `bill_items` inline: source_type (consultation/lab_test/medicine/other), description, quantity, unit_price
- `amount` field read-only — computed server-side by `calculate_bill_item_amount()` trigger

#### `/accountant/payments`
- Record payment: bill search → `<PaymentForm>` → INSERT only
- Payments ledger: all payments filterable by date, method, amount range
- Export to CSV

#### `/accountant/insurance`
- Claims list: CLM-XXXXXX, insurer, policy_number, claimed_amount, approved_amount, status
- New claim: bill picker → insurer_name, policy_number, claimed_amount
- Status workflow: submitted → under_review → approved/rejected → paid

#### `/accountant/reports`
- Revenue over time (line chart from `payments` + `bills`)
- Top diagnoses (from `diagnoses` table aggregated)
- Lab test volume (from `lab_request_items`)
- Prescription volume (from `prescription_items`)
- Bed occupancy trend
- All charts use real Supabase queries with date range filters

---

### 5.8 ADMIN / SUPER ADMIN

**Nav:** Dashboard · Users · Wards & Beds · Lab Tests · Audit Log · System

#### `/admin/dashboard`
System-wide overview:
- Total active patients, doctors, nurses, staff counts
- Today's appointment volume
- Current bed occupancy % across all wards
- Recent system alerts (from `notifications` where type = 'system')

#### `/admin/users`
Full `user_profiles` management:
- All users table: readable_id, name, email, role, is_active, created_at
- Create user → role picker → auto-creates matching role table row (doctors/nurses/etc.)
- Edit: name, phone, is_active toggle
- Role change: only surface here → `trg_protect_role_change` trigger enforces it server-side
- Deactivate (soft delete via `is_active = false`) — never hard delete

#### `/admin/wards`
- Create/edit `wards`: name, department, capacity
- Beds sub-panel per ward: bed_number, status badge, bulk add beds
- Ward occupancy summary card

#### `/admin/lab-tests`
- Manage `lab_tests` catalog: test_code, test_name, description, price, turnaround_hours, is_active
- This is the pricing source for auto-billing when lab_request_items are created

#### `/admin/audit`
- `audit_logs` table viewer: table_name, action (insert/update/delete), performed_by, created_at
- Filterable by table, action, user, date range
- Admin/super_admin only — RLS enforces this regardless of UI

#### `/admin/sequences`
Read-only view of `system_sequences` — shows current counter values for each readable_id series (PAT, DOC, APT, etc.). No editing — sequences are managed server-side.

---

## 6. Realtime Subscriptions

Use `@supabase/supabase-js` realtime channels. Enable these per-role:

| Role | Table | Event | Purpose |
|---|---|---|---|
| Receptionist | `patient_queue` | INSERT + UPDATE | Live queue board |
| Nurse | `patient_queue` | INSERT + UPDATE | Queue management |
| Doctor | `notifications` | INSERT | Lab result alerts, appointment alerts |
| Pharmacist | `prescriptions` | INSERT | New prescription queue |
| Lab Technician | `lab_requests` | INSERT | New lab order queue |
| All roles | `notifications` (own recipient_id) | INSERT | Personal notification bell |

### Pattern
```typescript
const channel = supabase
  .channel('queue-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'patient_queue'
  }, (payload) => {
    // Update local state
  })
  .subscribe()

// Always clean up
return () => supabase.removeChannel(channel)
```

---

## 7. Key Frontend Rules (from Backend Architecture)

### 7.1 Never calculate bill totals client-side
Always query the `bill_totals` VIEW:
```typescript
const { data } = await supabase
  .from('bill_totals')
  .select('total_charged, total_paid, outstanding_balance')
  .eq('bill_id', billId)
  .single()
```

### 7.2 Never send readable_id on INSERT
All readable IDs (PAT-XXXXXX, APT-XXXXXX, etc.) are generated by the `generate_readable_id()` trigger. Omit them entirely from INSERT payloads. Read them back from the response:
```typescript
const { data } = await supabase
  .from('patients')
  .insert({ user_id, date_of_birth, gender, ... })  // NO readable_id field
  .select('readable_id')
  .single()
```

### 7.3 Never generate bill_item.amount
The `calculate_bill_item_amount()` trigger sets `amount = quantity * unit_price` on every INSERT/UPDATE. Never compute or send `amount` from the frontend:
```typescript
.insert({ bill_id, source_type, description, quantity, unit_price })
// amount is auto-computed server-side — do not include it
```

### 7.4 Payments are INSERT-only
The backend confirms payment immutability. The UI must never expose an "edit payment" feature. Payment corrections are handled by issuing refund bills, not modifying payment records.

### 7.5 Doctor-patient access via assignments
When a doctor opens a patient record, don't filter by patient_id alone — RLS already enforces that doctors only see patients in `doctor_patient_assignments`. Trust RLS; don't duplicate it in queries.

### 7.6 Do not trigger the appointment-queue Edge Function
The `appointment-queue` function runs on a server schedule. There must be no "Run Queue Job" button anywhere in the UI.

### 7.7 Role change is admin-only, server-enforced
`trg_protect_role_change` rejects any non-admin session that attempts to change `user_profiles.role`. The admin UI can surface this form, but no other role's UI should attempt this query.

---

## 8. Forms Reference

### `<PrescriptionForm>` — multi-item
```
Patient (locked if opened from patient context)
Doctor (locked if current user is doctor)
Medical Record (optional, nullable FK)
Appointment (optional, nullable FK)
Notes

--- Items (repeating rows) ---
[ Medicine picker (search medicines table) ]  [ Dosage ]  [ Frequency ]  [ Days ]  [ Qty ]  [ Instructions ]  [ Remove ]
[ + Add Medicine ]

[ Submit → INSERT prescriptions + prescription_items ]
```

### `<LabRequestForm>` — cart-style
```
Patient
Doctor
Medical Record (optional)
Notes

--- Tests (cart) ---
[ Search and add lab_tests ] → each added shows: test_name, test_code, price_snapshot
[ Remove ]

[ Submit → INSERT lab_requests + lab_request_items (one per test) ]
```
Note: `price_snapshot` should be set to `lab_tests.price` at time of ordering — snapshotted so future price changes don't alter historical records.

### `<PaymentForm>`
```
Bill: BIL-XXXXXX (read-only)
Outstanding Balance: [from bill_totals VIEW] (read-only)
Amount: [number input, max = outstanding_balance]
Method: [cash | card | mobile_money | insurance | bank_transfer]
Reference Number: [text, optional — required for mobile_money/bank_transfer]
Received By: [auto-filled from current user]
[ Record Payment → INSERT payments ]
```

---

## 9. Page-Level RLS Awareness

The frontend should surface the right context for users who see limited data because of RLS — not show a blank page that looks broken.

| Role | Scoped by | Empty state message |
|---|---|---|
| Doctor (patients) | `doctor_patient_assignments` | "No patients assigned yet. Ask reception to assign patients." |
| Nurse (records) | Ward-admitted patients only | "Showing patients currently admitted to your ward." |
| Patient (records) | Own user_id | "Your medical records will appear here after your first visit." |
| Lab Tech (requests) | All pending requests (shared queue) | "No pending lab requests. Check back soon." |
| Pharmacist (prescriptions) | All pending (shared queue) | "No pending prescriptions in the queue." |

---

## 10. File/Image Uploads

For `lab_results.result_file_url` (scanned reports, images):
- Upload to Supabase Storage bucket: `lab-results`
- Bucket policy: authenticated users with `lab_technician` role can upload; doctors/patients can read
- Store the returned public URL in `result_file_url`
- Display as a "View Report" link / lightbox in the doctor's patient record view

---

## 11. Build Sequence (Recommended)

Phase 1 — Foundation:
1. Supabase client setup + TypeScript type generation
2. Auth flow (login, session, middleware, role redirect)
3. Shell layout (sidebar, topbar, notification bell)
4. `StatusBadge` + `ReadableId` + `DataTable` shared components

Phase 2 — Core Clinical:
5. Patient registration + patient dashboard
6. Receptionist: booking + check-in + queue board
7. Doctor: patient list + PatientDetail tabbed view
8. Doctor: medical record + diagnosis + prescription forms

Phase 3 — Lab & Pharmacy:
9. Lab technician: queue + result entry
10. Doctor: lab request form
11. Pharmacist: prescription queue + dispense flow
12. Pharmacist: inventory management

Phase 4 — Billing & Operations:
13. Accountant: bills + payments + insurance claims
14. Nurse: ward bed grid + admissions
15. `bill_totals` VIEW integration throughout

Phase 5 — Admin & Polish:
16. Admin: user management + ward/bed management
17. Admin: audit log viewer
18. Realtime subscriptions for queue + notifications
19. Reports/charts for admin + accountant
20. Mobile responsiveness pass
