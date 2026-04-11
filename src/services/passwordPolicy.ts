/**
 * Password policy — MUST stay in sync with the backend DTO validators
 * (kinetic-backend/src/auth/dto/*.dto.ts).
 *
 * Any relaxation here without a matching backend change would let the
 * client submit passwords that the server then rejects with 400. Any
 * tightening here only affects the client UX — the server stays the
 * authoritative gatekeeper.
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Matches the backend regex: at least one lowercase, one uppercase,
 * one digit, one symbol (any non-word, non-whitespace char).
 * The backend version is: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).+$/
 */
const HAS_LOWER = /[a-z]/;
const HAS_UPPER = /[A-Z]/;
const HAS_DIGIT = /\d/;
const HAS_SYMBOL = /[^\w\s]/;

export interface PasswordValidationResult {
  valid: boolean;
  /** i18n key describing the first failing rule, or null if valid. */
  errorKey: string | null;
  /** Per-rule breakdown used by the strength meter. */
  checks: {
    length: boolean;
    lower: boolean;
    upper: boolean;
    digit: boolean;
    symbol: boolean;
  };
}

export function validatePassword(password: string): PasswordValidationResult {
  const checks = {
    length:
      password.length >= PASSWORD_MIN_LENGTH &&
      password.length <= PASSWORD_MAX_LENGTH,
    lower: HAS_LOWER.test(password),
    upper: HAS_UPPER.test(password),
    digit: HAS_DIGIT.test(password),
    symbol: HAS_SYMBOL.test(password),
  };

  // Report the FIRST failing rule so the user fixes one thing at a time
  // instead of getting a wall of red errors.
  let errorKey: string | null = null;
  if (!checks.length) errorKey = 'passwordPolicy.tooShort';
  else if (!checks.lower) errorKey = 'passwordPolicy.needLower';
  else if (!checks.upper) errorKey = 'passwordPolicy.needUpper';
  else if (!checks.digit) errorKey = 'passwordPolicy.needDigit';
  else if (!checks.symbol) errorKey = 'passwordPolicy.needSymbol';

  return {
    valid: errorKey === null,
    errorKey,
    checks,
  };
}

/**
 * Returns a 0..4 strength score for the progress bar.
 * 0 = empty, 1 = too weak, 2 = weak, 3 = ok, 4 = strong.
 */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  const { checks } = validatePassword(password);
  const passed =
    (checks.lower ? 1 : 0) +
    (checks.upper ? 1 : 0) +
    (checks.digit ? 1 : 0) +
    (checks.symbol ? 1 : 0);
  if (!checks.length) return 1;
  if (passed <= 1) return 1;
  if (passed === 2) return 2;
  if (passed === 3) return 3;
  return 4;
}
