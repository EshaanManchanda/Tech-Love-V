"use client";

import { useState } from "react";

/** "Have a coupon code?" link that opens a code input. The code is checked by the API when checkout starts. */
export function CouponField({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(!!value);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-xs text-slate-500 underline hover:text-slate-900">
        Have a coupon code?
      </button>
    );
  }
  return (
    <input
      type="text"
      aria-label="Coupon code"
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
      placeholder="Coupon code"
      autoFocus
      className="mt-3 w-full rounded-md border border-slate-300 px-3 py-1.5 font-mono text-sm uppercase"
    />
  );
}
