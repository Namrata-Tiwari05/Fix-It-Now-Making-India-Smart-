/**
 * Phone Number Normalization Utility
 * Standardizes all phone numbers to canonical Indian format: +91XXXXXXXXXX
 */
export function normalizePhone(rawPhone) {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    return `+91${last10}`;
  }
  return digits ? `+91${digits}` : '';
}

/**
 * Compare two phone numbers for equality regardless of formatting
 */
export function isSamePhone(phoneA, phoneB) {
  const normA = normalizePhone(phoneA);
  const normB = normalizePhone(phoneB);
  if (!normA || !normB) return false;
  return normA === normB;
}

/**
 * Format phone for UI display: +91 98765 43210
 */
export function formatPhoneDisplay(rawPhone) {
  const norm = normalizePhone(rawPhone);
  if (norm.length === 13 && norm.startsWith('+91')) {
    return `+91 ${norm.slice(3, 8)} ${norm.slice(8)}`;
  }
  return rawPhone || '';
}
