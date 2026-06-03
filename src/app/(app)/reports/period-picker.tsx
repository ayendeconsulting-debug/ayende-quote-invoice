"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PERIOD_OPTIONS, type PeriodKey, type PeriodOption } from "@/lib/period";

export function PeriodPicker() {
  const router = useRouter();
  const params = useSearchParams();
  const preset = (params.get("preset") as PeriodKey) ?? "THIS_MONTH";
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");

  function apply(next: { preset?: PeriodKey; from?: string; to?: string }) {
    const sp = new URLSearchParams(params.toString());
    if (next.preset) sp.set("preset", next.preset);
    if (next.from !== undefined) {
      if (next.from) sp.set("from", next.from);
      else sp.delete("from");
    }
    if (next.to !== undefined) {
      if (next.to) sp.set("to", next.to);
      else sp.delete("to");
    }
    router.push(`/reports?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={preset}
        onChange={(e) => apply({ preset: e.target.value as PeriodKey })}
        className="rounded-lg border border-[var(--color-line)] bg-white px-3 py-1.5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
      >
        <optgroup label="Calendar">
          {PERIOD_OPTIONS.filter((o: PeriodOption) => o.group === "calendar").map((o: PeriodOption) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </optgroup>
        <optgroup label="Rolling">
          {PERIOD_OPTIONS.filter((o: PeriodOption) => o.group === "rolling").map((o: PeriodOption) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </optgroup>
        <optgroup label="Other">
          {PERIOD_OPTIONS.filter((o: PeriodOption) => o.group === "other").map((o: PeriodOption) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </optgroup>
      </select>

      {preset === "CUSTOM" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <span className="text-[var(--color-muted)]">–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button
            onClick={() => apply({ preset: "CUSTOM", from, to })}
            className="rounded-lg bg-[var(--color-ink)] px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
