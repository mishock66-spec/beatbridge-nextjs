export const ACCOUNT_AGE_LIMITS = {
  new: 20,
  growing: 50,
  established: 80,
} as const;

export type AccountAge = keyof typeof ACCOUNT_AGE_LIMITS;

export function getDmLimit(age: AccountAge | null): number {
  if (!age) return 20; // conservative default before preference is set
  return ACCOUNT_AGE_LIMITS[age];
}
