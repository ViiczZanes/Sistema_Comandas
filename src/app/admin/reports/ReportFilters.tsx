"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { RANGE_PRESET_LABEL, type RangePreset } from "@/lib/dateRange";

const PRESETS: RangePreset[] = ["today", "7d", "30d", "month"];

export function ReportFilters({
  activePreset,
  fromValue,
  toValue,
}: {
  activePreset: RangePreset | null;
  fromValue: string;
  toValue: string;
}) {
  const router = useRouter();
  const [customOpen, setCustomOpen] = useState(false);
  const [from, setFrom] = useState(fromValue);
  const [to, setTo] = useState(toValue);

  function applyPreset(preset: RangePreset) {
    router.push(`/admin/reports?range=${preset}`);
  }

  function applyCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) return;
    router.push(`/admin/reports?from=${from}&to=${to}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((preset) => (
        <button
          key={preset}
          onClick={() => applyPreset(preset)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
            activePreset === preset
              ? "bg-brand-600 text-white"
              : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
          )}
        >
          {RANGE_PRESET_LABEL[preset]}
        </button>
      ))}
      <button
        onClick={() => setCustomOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
          activePreset === null
            ? "bg-brand-600 text-white"
            : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
        )}
      >
        <Calendar className="h-3.5 w-3.5" />
        {activePreset === null ? `${fromValue} – ${toValue}` : "Personalizado"}
      </button>

      {customOpen && (
        <form
          onSubmit={applyCustom}
          className="flex w-full items-end gap-2 rounded-xl border border-stone-200 bg-white p-3"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-wide text-stone-500 uppercase">
              De
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Até
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm"
            />
          </div>
          <Button type="submit" size="sm">
            Aplicar
          </Button>
        </form>
      )}
    </div>
  );
}
