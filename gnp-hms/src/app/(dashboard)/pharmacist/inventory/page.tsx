"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReadableId } from "@/components/shared/ReadableId";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Package,
  AlertTriangle,
  Search,
  RefreshCw,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StockLevel = "critical" | "low" | "adequate" | "overstocked";

interface InventoryItem {
  id: string;
  readable_id: string;
  medicine_id: string;
  medicine_name: string;
  medicine_form: string; // tablet, syrup, injection, etc.
  batch_number: string;
  quantity_in_stock: number;
  reorder_level: number;
  expiry_date: string;
  unit_cost: number;
  supplier_name: string | null;
  last_restocked_at: string | null;
}

interface AdjustDialogState {
  open: boolean;
  item: InventoryItem | null;
  type: "add" | "remove";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStockLevel(qty: number, reorder: number): StockLevel {
  if (qty === 0) return "critical";
  if (qty <= reorder) return "low";
  if (qty > reorder * 5) return "overstocked";
  return "adequate";
}

function stockLevelLabel(level: StockLevel) {
  const map: Record<StockLevel, string> = {
    critical: "Out of stock",
    low: "Low stock",
    adequate: "Adequate",
    overstocked: "Overstocked",
  };
  return map[level];
}

function stockLevelColors(level: StockLevel): string {
  const map: Record<StockLevel, string> = {
    critical: "bg-red-100 text-red-700",
    low: "bg-amber-100 text-amber-700",
    adequate: "bg-emerald-100 text-emerald-700",
    overstocked: "bg-slate-100 text-slate-600",
  };
  return map[level];
}

function daysUntilExpiry(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-UG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

export default function PharmacistInventoryPage() {
  const supabase = createClient();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockLevel | "all">("all");
  const [sortField, setSortField] = useState<
    "medicine_name" | "quantity_in_stock" | "expiry_date"
  >("medicine_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [adjust, setAdjust] = useState<AdjustDialogState>({
    open: false,
    item: null,
    type: "add",
  });
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("medicine_inventory")
      .select(
        `
        id,
        readable_id,
        batch_number,
        quantity_in_stock,
        reorder_level,
        expiry_date,
        unit_cost,
        last_restocked_at,
        medicines ( id, name, form ),
        suppliers ( name )
      `
      )
      .order(sortField === "medicine_name" ? "medicines(name)" : sortField, {
        ascending: sortDir === "asc",
      });

    if (error) {
      toast.error("Failed to load inventory");
      setLoading(false);
      return;
    }

    const mapped: InventoryItem[] = (data ?? []).map((row: any) => ({
      id: row.id,
      readable_id: row.readable_id,
      medicine_id: row.medicines?.id ?? "",
      medicine_name: row.medicines?.name ?? "—",
      medicine_form: row.medicines?.form ?? "",
      batch_number: row.batch_number,
      quantity_in_stock: row.quantity_in_stock,
      reorder_level: row.reorder_level,
      expiry_date: row.expiry_date,
      unit_cost: row.unit_cost,
      supplier_name: row.suppliers?.name ?? null,
      last_restocked_at: row.last_restocked_at,
    }));

    setItems(mapped);
    setLoading(false);
  }, [sortField, sortDir]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const criticalCount = items.filter(
    (i) => getStockLevel(i.quantity_in_stock, i.reorder_level) === "critical"
  ).length;
  const lowCount = items.filter(
    (i) => getStockLevel(i.quantity_in_stock, i.reorder_level) === "low"
  ).length;
  const expiringCount = items.filter((i) => {
    const days = daysUntilExpiry(i.expiry_date);
    return days >= 0 && days <= 30;
  }).length;

  // ── Filtered & searched rows ───────────────────────────────────────────────

  const visible = items.filter((item) => {
    const matchSearch =
      !search ||
      item.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
      item.batch_number.toLowerCase().includes(search.toLowerCase()) ||
      item.readable_id.toLowerCase().includes(search.toLowerCase());

    const level = getStockLevel(item.quantity_in_stock, item.reorder_level);
    const matchFilter = stockFilter === "all" || level === stockFilter;

    return matchSearch && matchFilter;
  });

  // ── Sort toggle ────────────────────────────────────────────────────────────

  function toggleSort(
    field: "medicine_name" | "quantity_in_stock" | "expiry_date"
  ) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  // ── Adjust stock ───────────────────────────────────────────────────────────

  async function handleAdjust() {
    if (!adjust.item) return;
    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }

    setAdjusting(true);

    const newQty =
      adjust.type === "add"
        ? adjust.item.quantity_in_stock + qty
        : Math.max(0, adjust.item.quantity_in_stock - qty);

    const { error } = await supabase
      .from("medicine_inventory")
      .update({
        quantity_in_stock: newQty,
        ...(adjust.type === "add"
          ? { last_restocked_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", adjust.item.id);

    setAdjusting(false);

    if (error) {
      toast.error("Could not update stock");
      return;
    }

    toast.success(
      adjust.type === "add"
        ? `Added ${qty} units to ${adjust.item.medicine_name}`
        : `Removed ${qty} units from ${adjust.item.medicine_name}`
    );

    setAdjust({ open: false, item: null, type: "add" });
    setAdjustQty("");
    setAdjustNote("");
    fetchInventory();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#0F172A]">Inventory</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Track stock levels, batches, and expiry dates
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInventory}
          disabled={loading}
          className="gap-2 text-xs"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total SKUs"
          value={items.length}
          icon={Package}
          accent="#0E7C6E"
        />
        <StatCard
          label="Out of stock"
          value={criticalCount}
          icon={Minus}
          accent="#EF4444"
        />
        <StatCard
          label="Low stock"
          value={lowCount}
          icon={TrendingDown}
          accent="#F59E0B"
        />
        <StatCard
          label="Expiring ≤30 days"
          value={expiringCount}
          icon={AlertTriangle}
          accent="#F97316"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
          />
          <Input
            placeholder="Search medicine, batch, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
        <Select
          value={stockFilter}
          onValueChange={(v) => setStockFilter(v as StockLevel | "all")}
        >
          <SelectTrigger className="w-44 text-sm">
            <SelectValue placeholder="All stock levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock levels</SelectItem>
            <SelectItem value="critical">Out of stock</SelectItem>
            <SelectItem value="low">Low stock</SelectItem>
            <SelectItem value="adequate">Adequate</SelectItem>
            <SelectItem value="overstocked">Overstocked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F8FAFC] hover:bg-[#F8FAFC]">
              <TableHead className="text-xs font-medium text-[#64748B]">
                Ref
              </TableHead>
              <TableHead
                className="text-xs font-medium text-[#64748B] cursor-pointer select-none"
                onClick={() => toggleSort("medicine_name")}
              >
                <span className="inline-flex items-center gap-1">
                  Medicine
                  <ArrowUpDown size={11} />
                </span>
              </TableHead>
              <TableHead className="text-xs font-medium text-[#64748B]">
                Form
              </TableHead>
              <TableHead className="text-xs font-medium text-[#64748B]">
                Batch
              </TableHead>
              <TableHead
                className="text-xs font-medium text-[#64748B] cursor-pointer select-none"
                onClick={() => toggleSort("quantity_in_stock")}
              >
                <span className="inline-flex items-center gap-1">
                  Stock
                  <ArrowUpDown size={11} />
                </span>
              </TableHead>
              <TableHead className="text-xs font-medium text-[#64748B]">
                Level
              </TableHead>
              <TableHead
                className="text-xs font-medium text-[#64748B] cursor-pointer select-none"
                onClick={() => toggleSort("expiry_date")}
              >
                <span className="inline-flex items-center gap-1">
                  Expiry
                  <ArrowUpDown size={11} />
                </span>
              </TableHead>
              <TableHead className="text-xs font-medium text-[#64748B]">
                Supplier
              </TableHead>
              <TableHead className="text-xs font-medium text-[#64748B] text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
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
                    icon={Package}
                    title="No inventory items found"
                    description={
                      search || stockFilter !== "all"
                        ? "Try adjusting your search or filter."
                        : "No medicines are stocked yet."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              visible.map((item) => {
                const level = getStockLevel(
                  item.quantity_in_stock,
                  item.reorder_level
                );
                const expDays = daysUntilExpiry(item.expiry_date);
                const expiredOrSoon = expDays <= 30;

                return (
                  <TableRow
                    key={item.id}
                    className="text-sm text-[#0F172A] hover:bg-[#F8FAFC]"
                  >
                    {/* Ref */}
                    <TableCell>
                      <ReadableId id={item.readable_id} />
                    </TableCell>

                    {/* Medicine name */}
                    <TableCell className="font-medium">
                      {item.medicine_name}
                    </TableCell>

                    {/* Form */}
                    <TableCell className="text-[#64748B] capitalize">
                      {item.medicine_form || "—"}
                    </TableCell>

                    {/* Batch */}
                    <TableCell>
                      <span className="font-mono text-xs text-[#64748B]">
                        {item.batch_number}
                      </span>
                    </TableCell>

                    {/* Stock qty */}
                    <TableCell>
                      <span
                        className={`font-mono font-semibold ${
                          level === "critical"
                            ? "text-red-600"
                            : level === "low"
                            ? "text-amber-600"
                            : "text-[#0F172A]"
                        }`}
                      >
                        {item.quantity_in_stock.toLocaleString()}
                      </span>
                      <span className="text-[#94A3B8] text-xs ml-1">
                        / {item.reorder_level} min
                      </span>
                    </TableCell>

                    {/* Level badge */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockLevelColors(level)}`}
                      >
                        {stockLevelLabel(level)}
                      </span>
                    </TableCell>

                    {/* Expiry */}
                    <TableCell>
                      <span
                        className={
                          expiredOrSoon
                            ? expDays < 0
                              ? "text-red-600 font-medium"
                              : "text-orange-500 font-medium"
                            : "text-[#64748B]"
                        }
                      >
                        {expDays < 0
                          ? "Expired"
                          : formatDate(item.expiry_date)}
                      </span>
                      {expDays >= 0 && expDays <= 30 && (
                        <span className="block text-xs text-orange-400">
                          in {expDays}d
                        </span>
                      )}
                    </TableCell>

                    {/* Supplier */}
                    <TableCell className="text-[#64748B]">
                      {item.supplier_name ?? "—"}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() =>
                            setAdjust({ open: true, item, type: "add" })
                          }
                        >
                          <TrendingUp size={11} />
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                          onClick={() =>
                            setAdjust({ open: true, item, type: "remove" })
                          }
                        >
                          <TrendingDown size={11} />
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer count */}
      {!loading && visible.length > 0 && (
        <p className="text-xs text-[#94A3B8]">
          Showing {visible.length} of {items.length} items
        </p>
      )}

      {/* Adjust Stock Dialog */}
      <Dialog
        open={adjust.open}
        onOpenChange={(open) => {
          if (!open) {
            setAdjust({ open: false, item: null, type: "add" });
            setAdjustQty("");
            setAdjustNote("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {adjust.type === "add" ? "Add Stock" : "Remove Stock"}
            </DialogTitle>
          </DialogHeader>

          {adjust.item && (
            <div className="space-y-4 py-1">
              {/* Context */}
              <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-sm">
                <p className="font-medium text-[#0F172A]">
                  {adjust.item.medicine_name}
                </p>
                <p className="text-[#64748B] text-xs mt-0.5">
                  Batch {adjust.item.batch_number} · Current stock:{" "}
                  <span className="font-mono font-semibold text-[#0F172A]">
                    {adjust.item.quantity_in_stock}
                  </span>
                </p>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Quantity to {adjust.type === "add" ? "add" : "remove"}
                </Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="0"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="font-mono"
                />
                {adjustQty &&
                  !isNaN(parseInt(adjustQty)) &&
                  parseInt(adjustQty) > 0 && (
                    <p className="text-xs text-[#64748B]">
                      New stock:{" "}
                      <span className="font-mono font-semibold text-[#0E7C6E]">
                        {adjust.type === "add"
                          ? adjust.item.quantity_in_stock +
                            parseInt(adjustQty)
                          : Math.max(
                              0,
                              adjust.item.quantity_in_stock -
                                parseInt(adjustQty)
                            )}
                      </span>
                    </p>
                  )}
              </div>

              {/* Note (optional, client-side only for UX) */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Note{" "}
                  <span className="text-[#94A3B8] font-normal">(optional)</span>
                </Label>
                <Input
                  placeholder="e.g. Restock from Cipla batch"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdjust({ open: false, item: null, type: "add" })}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdjust}
              disabled={adjusting}
              style={
                adjust.type === "add"
                  ? { backgroundColor: "#0E7C6E", color: "#fff" }
                  : {}
              }
              variant={adjust.type === "remove" ? "destructive" : "default"}
              className={
                adjust.type === "add" ? "hover:opacity-90 transition-opacity" : ""
              }
            >
              {adjusting
                ? "Saving…"
                : adjust.type === "add"
                ? "Add Stock"
                : "Remove Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}