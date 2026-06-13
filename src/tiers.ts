export type Tier = 'hourly' | 'daily' | 'monthly';

export const TIER_DURATIONS_SEC: Record<Tier, number> = {
  hourly: 60 * 60,
  daily: 24 * 60 * 60,
  monthly: 30 * 24 * 60 * 60,
};

export const TIER_LABELS: Record<Tier, string> = {
  hourly: '1 hour',
  daily: '24 hours',
  monthly: '30 days',
};

export const ALL_TIERS: Tier[] = ['hourly', 'daily', 'monthly'];

export function isValidTier(value: unknown): value is Tier {
  return typeof value === 'string' && ALL_TIERS.includes(value as Tier);
}
