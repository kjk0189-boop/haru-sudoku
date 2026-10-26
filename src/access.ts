export type HelpFeature = 'hint' | 'advancedNotes';
export interface AccessPolicy {
  mode: 'free' | 'metered';
  rules: Readonly<Record<HelpFeature, { freeUses: number | null; coinCost: number; rewardedAd: boolean }>>;
}
export const DEFAULT_ACCESS_POLICY: AccessPolicy = {
  mode: 'free',
  rules: {
    hint: { freeUses: null, coinCost: 30, rewardedAd: false },
    advancedNotes: { freeUses: null, coinCost: 50, rewardedAd: false },
  },
};
export interface AccessDecision {
  allowed: boolean;
  source: 'free' | 'quota' | 'coins' | 'reward-required' | 'unavailable';
  coinCost: number;
}
const unavailable = (): AccessDecision => ({ allowed: false, source: 'unavailable', coinCost: 0 });
const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Decision only. The caller commits usage/payment after an operation succeeds.
 * A reward-required decision never grants access or simulates an advertisement.
 */
export function assessAccess(feature: HelpFeature, used: number, coins: number, policy: AccessPolicy = DEFAULT_ACCESS_POLICY): AccessDecision {
  if (!['hint', 'advancedNotes'].includes(feature) || !count(used) || !count(coins) || !policy) return unavailable();
  if (policy.mode === 'free') return { allowed: true, source: 'free', coinCost: 0 };
  if (policy.mode !== 'metered') return unavailable();
  const rule = policy.rules?.[feature];
  if (!rule || !(rule.freeUses === null || count(rule.freeUses)) || !count(rule.coinCost) || typeof rule.rewardedAd !== 'boolean') return unavailable();
  if (rule.freeUses === null || used < rule.freeUses) return { allowed: true, source: 'quota', coinCost: 0 };
  if (rule.coinCost > 0 && coins >= rule.coinCost) return { allowed: true, source: 'coins', coinCost: rule.coinCost };
  return rule.rewardedAd ? { allowed: false, source: 'reward-required', coinCost: 0 } : unavailable();
}
