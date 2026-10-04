/**
 * Currency conversion utilities for DorianOS.
 * Provides live exchange rates with resilient fallbacks (EUR=1.08, GBP=1.28).
 */

export const DEFAULT_RATES = {
  USD: 1.0,
  EUR: 1.08, // 1 EUR = 1.08 USD
  GBP: 1.28, // 1 GBP = 1.28 USD
  CAD: 0.74,
};

let cachedRates = { ...DEFAULT_RATES };
let lastFetch = 0;

/**
 * Fetch live rates or return cached rates.
 */
export async function getExchangeRates() {
  const now = Date.now();
  if (now - lastFetch < 3600000 && lastFetch > 0) {
    return cachedRates;
  }
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        // er-api gives rates relative to USD (i.e. rates.EUR is EUR per 1 USD)
        // We invert them to get value in USD (1 EUR = X USD)
        cachedRates = {
          USD: 1.0,
          EUR: data.rates.EUR ? +(1 / data.rates.EUR).toFixed(4) : DEFAULT_RATES.EUR,
          GBP: data.rates.GBP ? +(1 / data.rates.GBP).toFixed(4) : DEFAULT_RATES.GBP,
          CAD: data.rates.CAD ? +(1 / data.rates.CAD).toFixed(4) : DEFAULT_RATES.CAD,
        };
        lastFetch = now;
      }
    }
  } catch (_) {
    // Keep cached or default rates on offline/network errors
  }
  return cachedRates;
}

/**
 * Convert any foreign currency amount to USD using either provided rates or defaults.
 * @param {number} amount
 * @param {string} currencyCode - e.g. "EUR", "GBP", "USD"
 * @param {object} rates - optional rates map
 * @returns {number} converted amount in USD
 */
export function convertToUSD(amount, currencyCode = "USD", rates = cachedRates) {
  const num = parseFloat(amount) || 0;
  if (!currencyCode) return num;
  const code = currencyCode.toUpperCase().trim();
  if (code === "USD") return num;

  const rate = rates[code] || DEFAULT_RATES[code] || 1.0;
  return +(num * rate).toFixed(2);
}
