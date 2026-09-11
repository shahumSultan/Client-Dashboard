/** Format an integer amount in minor units (cents) as currency. */
export function formatMoney(minor: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
  } catch {
    // An unrecognised code must not take the invoice down with it.
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "AED", "SAR", "PKR"] as const;
