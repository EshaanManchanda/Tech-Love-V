// Plan prices are in the plan's own currency (Plan.currency, "inr" for the Lemon Squeezy store).
// ₹249, ₹2,499, and $3.5 if a dollar plan is added later.
export function formatPrice(amount: number, currency = "inr"): string {
  const code = currency.toUpperCase();
  return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
