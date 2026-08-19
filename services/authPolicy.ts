export const CANONICAL_ADMIN_EMAIL = 'homedesigntaedi@gmail.com' as const;

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/**
 * Production administrator privileges are granted only to the canonical Google identity.
 * A local email/password form is never a trusted administrator assertion.
 */
export const isCanonicalGoogleAdmin = (email: string): boolean =>
  normalizeEmail(email) === CANONICAL_ADMIN_EMAIL;
