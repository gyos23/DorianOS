const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const currencyFullFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function fmt(n) {
  return currencyFormatter.format(Math.abs(n || 0));
}

export function fmtFull(n) {
  return currencyFullFormatter.format(n || 0);
}

export function fmtSigned(n) {
  return ((n || 0) >= 0 ? "+" : "-") + fmt(n);
}

export const uid = () => Math.random().toString(36).slice(2, 9);
