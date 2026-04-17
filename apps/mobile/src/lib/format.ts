export function formatCurrency(amount: number, currency = "INR"): string {
  const symbol = currency === "INR" ? "\u20B9" : currency;
  const signed = amount < 0 ? `-${symbol}${Math.abs(amount).toFixed(2)}` : `${symbol}${amount.toFixed(2)}`;
  return signed;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString();
}
