// Kenyan mobile numbers: what farmers type (07…, 01…, +254…) and what the API takes.

/** Formats as the farmer types: "0712 345 678" or "+254 712 345 678". */
export function formatKenyanPhoneInput(value) {
  const raw = String(value ?? '').trim();
  let digits = raw.replace(/\D/g, '');

  if (digits.startsWith('254')) {
    digits = digits.slice(0, 12);
    const local = digits.slice(3);
    return `+254${local ? ` ${local.slice(0, 3)}` : ''}${local.length > 3 ? ` ${local.slice(3, 6)}` : ''}${local.length > 6 ? ` ${local.slice(6, 9)}` : ''}`;
  }

  digits = digits.slice(0, 10);
  return `${digits.slice(0, 4)}${digits.length > 4 ? ` ${digits.slice(4, 7)}` : ''}${digits.length > 7 ? ` ${digits.slice(7, 10)}` : ''}`;
}

/** "0712 345 678" / "+254712345678" -> "254712345678"; anything else -> "". */
export function normalizeKenyanPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (/^254(?:7|1)\d{8}$/.test(digits)) return digits;
  if (/^0(?:7|1)\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  return '';
}

/** True when the text looks like someone typing a phone number rather than an email or username. */
export function looksLikePhone(value) {
  const text = String(value ?? '').trim();
  return /^\+?[\d\s()-]+$/.test(text) && text.replace(/\D/g, '').length >= 9;
}

/** "+254712345678" or "254712345678" -> "+254 712 345 678", for showing a number back to its owner. */
export function displayPhone(value) {
  const normalized = normalizeKenyanPhone(value);
  return normalized ? formatKenyanPhoneInput(normalized) : String(value ?? '');
}
