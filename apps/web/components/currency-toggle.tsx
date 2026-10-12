"use client";

import { formatPrice, type Currency } from "@/lib/currency";

export function CurrencyToggle({ currency, onChange }: { currency: Currency; onChange: (currency: Currency) => void }) {
  return (
    <div role="group" aria-label="Currency" className="inline-flex rounded-md bg-slate-100 p-0.5 text-sm">
      {(["usd", "inr"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={currency === option}
          onClick={() => onChange(option)}
          className={`rounded px-3 py-1 ${currency === option ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-600"}`}
        >
          {option === "usd" ? "USD $" : "INR ₹"}
        </button>
      ))}
    </div>
  );
}

/** Under an INR price: Lemon Squeezy only charges USD, so say so plainly. */
export function InrChargeNote({ amount }: { amount: number }) {
  return (
    <p className="mt-1 text-xs text-slate-500">
      Charged in USD at checkout; your bank converts it (about {formatPrice(amount, "inr")}).
    </p>
  );
}
