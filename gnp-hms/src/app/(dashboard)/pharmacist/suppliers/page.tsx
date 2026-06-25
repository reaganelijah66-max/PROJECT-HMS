"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReadableId } from "@/components/shared/ReadableId";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Truck,
  Search,
  RefreshCw,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  Pencil,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Supplier {
  id: string;
  readable_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  medicines_supplied: number; // count from medicine_inventory
  created_at: string;
}

interface SupplierFormState {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
}

const EMPTY_FORM: SupplierFormState = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-UG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isValidEmail(email: string) {
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white px-5 py-4 flex items-center gap-4 shadow-sm">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: accent + "18", color: accent }}
      >
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-[#0F172A] font-mono leading-none">
          {value}
        </p>
        <p className="text-xs text-[#64748B] mt-1">{label}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PharmacistSuppliersPage() {
  const supabase = createClient();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Dialog state — shared for add + edit
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "add" | "edit";
    id: string | null;
  }>({ open: false, mode: "add", id: null });

  const [form, setForm] = useState<SupplierFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("suppliers")
      .select(
        `
        id,
        readable_id,
        name,
        contact_person,
        phone,
        email,
        address,
        created_at,
        medicine_inventory ( id )
      `
      )
      .order("name", { ascending: true });

    if (error) {
      toast.error("Failed to load suppliers");
      setLoading(false);
      return;
    }

    const mapped: Supplier[] = (data ?? []).map((row: any) => ({
      id: row.id,
      readable_id: row.readable_id,
      name: row.name,
      contact_person: row.contact_person ?? null,
      phone: row.phone ?? null,
      email: row.email ?? null,
      address: row.address ?? null,
      medicines_supplied: Array.isArray(row.medicine_inventory)
        ? row.medicine_inventory.length
        : 0,
      created_at: row.created_at,
    }));

    setSuppliers(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // ── Filtered rows ──────────────────────────────────────────────────────────

  const visible = suppliers.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contact_person ?? "").toLowerCase().includes(q) ||
      (s.phone ?? "").includes(q) ||
      (s.email ?? "").toLowerCase().includes(q) ||
      s.readable_id.toLowerCase().includes(q)
    );
  });

  // ── Open add dialog ────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setDialog({ open: true, mode: "add", id: null });
  }

  // ── Open edit dialog ───────────────────────────────────────────────────────

  function openEdit(s: Supplier) {
    setForm({
      name: s.name,
      contact_person: s.contact_person ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
    });
    setDialog({ open: true, mode: "edit", id: s.id });
  }

  function closeDialog() {
    setDialog({ open: false, mode: "add", id: null });
    setForm(EMPTY_FORM);
  }

  // ── Validate ───────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!form.name.trim()) return "Supplier name is required.";
    if (!isValidEmail(form.email)) return "Enter a valid email address.";
    return null;
  }

  // ── Save (add or edit) ─────────────────────────────────────────────────────

  async function handleSave() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      contact_person: form.contact_person.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
    };

    if (dialog.mode === "add") {
      const { error } = await supabase.from("suppliers").insert(payload);
      setSaving(false);
      if (error) {
        toast.error("Could not add supplier");
        return;
      }
      toast.success(`${payload.name} added`);
    } else {
      const { error } = await supabase
        .from("suppliers")
        .update(payload)
        .eq("id", dialog.id!);
      setSaving(false);
      if (error) {
        toast.error("Could not update supplier");
        return;
      }
      toast.success(`${payload.name} updated`);
    }

    closeDialog();
    fetchSuppliers();
  }

  // ── Derived stats ──────────────────────────────────────────────────────────

  const withContact = suppliers.filter((s) => s.contact_person).length;
  const activeSuppliers = suppliers.filter(
    (s) => s.medicines_supplied > 0
  ).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#0F172A]">Suppliers</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Manage medicine suppliers and their contact details
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSuppliers}
            disabled={loading}
            className="gap-2 text-xs"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={openAdd}
            className="gap-2 text-xs"
            style={{ backgroundColor: "#0E7C6E", color: "#fff" }}
          >
            <Plus size={13} />
            Add supplier
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Total suppliers"
          value={suppliers.length}
          icon={Truck}
          accent="#0E7C6E"
        />
        <StatCard
          label="Stocking medicines"
          value={activeSuppliers}
          icon={Building2}
          accent="#6366F1"
        />
        <StatCard
          label="With contact person"
          value={withContact}
          icon={Phone}
          accent="#0EA5E9"
        />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
        />
        <Input
          placeholder="Search by name, contact, or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 text-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F8FAFC] hover:bg-[#F8FAFC]">
              <TableHead className="text-xs font-medium text-[#64748B]">
                Ref
              </TableHead>
              <TableHead className="text-xs font-medium text-[#64748B]">
                Supplier
              </TableHead>
              <TableHead className="text-xs font-medium text-[#64748B]">
                Contact person
              </TableHead>
              <TableHead className="text-xs font-medium text-[#64748B]">
                Phone
              </TableHead>
              <TableHead className="text-xs font-medium text-[#64748B]">
                Email
              </TableHead>
              <TableHead className="text-xs font-medium text-[#64748B]">
                Address
              </TableHead>
              <TableHead className="text-xs font-medium text-[#64748B] text-center">
                SKUs stocked
              </TableHead>
              <TableHead className="text-xs font-medium text-[#64748B]">
                Added
              </TableHead>
              <TableHead className="text-xs font-medium text-[#64748B] text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <TableCell key={j}>
                      <div className="h-4 rounded bg-[#F1F5F9] animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12">
                  <EmptyState
                    icon={Truck}
                    title="No suppliers found"
                    description={
                      search
                        ? "Try a different search term."
                        : "Add your first supplier to get started."
                    }
                    action={
                      !search ? (
                        <Button
                          size="sm"
                          onClick={openAdd}
                          style={{ backgroundColor: "#0E7C6E", color: "#fff" }}
                          className="gap-2 text-xs hover:opacity-90 transition-opacity"
                        >
                          <Plus size={13} />
                          Add supplier
                        </Button>
                      ) : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              visible.map((s) => (
                <TableRow
                  key={s.id}
                  className="text-sm text-[#0F172A] hover:bg-[#F8FAFC]"
                >
                  {/* Ref */}
                  <TableCell>
                    <ReadableId id={s.readable_id} />
                  </TableCell>

                  {/* Name */}
                  <TableCell className="font-medium">{s.name}</TableCell>

                  {/* Contact person */}
                  <TableCell className="text-[#64748B]">
                    {s.contact_person ?? (
                      <span className="text-[#CBD5E1]">—</span>
                    )}
                  </TableCell>

                  {/* Phone */}
                  <TableCell>
                    {s.phone ? (
                      <a
                        href={`tel:${s.phone}`}
                        className="inline-flex items-center gap-1 text-[#0E7C6E] hover:underline font-mono text-xs"
                      >
                        <Phone size={11} />
                        {s.phone}
                      </a>
                    ) : (
                      <span className="text-[#CBD5E1]">—</span>
                    )}
                  </TableCell>

                  {/* Email */}
                  <TableCell>
                    {s.email ? (
                      <a
                        href={`mailto:${s.email}`}
                        className="inline-flex items-center gap-1 text-[#0E7C6E] hover:underline text-xs"
                      >
                        <Mail size={11} />
                        {s.email}
                      </a>
                    ) : (
                      <span className="text-[#CBD5E1]">—</span>
                    )}
                  </TableCell>

                  {/* Address */}
                  <TableCell className="text-[#64748B] max-w-[160px]">
                    {s.address ? (
                      <span className="inline-flex items-start gap-1">
                        <MapPin
                          size={11}
                          className="mt-0.5 shrink-0 text-[#94A3B8]"
                        />
                        <span className="truncate">{s.address}</span>
                      </span>
                    ) : (
                      <span className="text-[#CBD5E1]">—</span>
                    )}
                  </TableCell>

                  {/* SKUs */}
                  <TableCell className="text-center">
                    <span
                      className={`font-mono font-semibold text-sm ${
                        s.medicines_supplied > 0
                          ? "text-[#0E7C6E]"
                          : "text-[#CBD5E1]"
                      }`}
                    >
                      {s.medicines_supplied}
                    </span>
                  </TableCell>

                  {/* Added */}
                  <TableCell className="text-[#64748B] text-xs">
                    {formatDate(s.created_at)}
                  </TableCell>

                  {/* Edit */}
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs gap-1 text-[#64748B] hover:text-[#0F172A]"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil size={11} />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer count */}
      {!loading && visible.length > 0 && (
        <p className="text-xs text-[#94A3B8]">
          Showing {visible.length} of {suppliers.length} suppliers
        </p>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {dialog.mode === "add" ? "Add supplier" : "Edit supplier"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Supplier name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Cipla Quality Chemicals"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* Contact person */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Contact person{" "}
                <span className="text-[#94A3B8] font-normal">(optional)</span>
              </Label>
              <Input
                placeholder="Full name"
                value={form.contact_person}
                onChange={(e) =>
                  setForm({ ...form, contact_person: e.target.value })
                }
              />
            </div>

            {/* Phone + Email side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Phone{" "}
                  <span className="text-[#94A3B8] font-normal">(optional)</span>
                </Label>
                <Input
                  placeholder="+256 700 000000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Email{" "}
                  <span className="text-[#94A3B8] font-normal">(optional)</span>
                </Label>
                <Input
                  type="email"
                  placeholder="orders@supplier.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Address{" "}
                <span className="text-[#94A3B8] font-normal">(optional)</span>
              </Label>
              <Input
                placeholder="e.g. Plot 15 Kampala Road, Kampala"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              style={{ backgroundColor: "#0E7C6E", color: "#fff" }}
              className="hover:opacity-90 transition-opacity"
            >
              {saving
                ? "Saving…"
                : dialog.mode === "add"
                ? "Add supplier"
                : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}