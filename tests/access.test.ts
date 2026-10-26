import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessAccess, DEFAULT_ACCESS_POLICY, type AccessPolicy } from '../src/access.ts';

const metered: AccessPolicy = { mode: 'metered', rules: {
  hint: { freeUses: 2, coinCost: 30, rewardedAd: true },
  advancedNotes: { freeUses: 1, coinCost: 50, rewardedAd: false },
} };

test('current policy provides both help features for free regardless of finite quotas or balance', () => {
  assert.equal(DEFAULT_ACCESS_POLICY.mode, 'free');
  for (const feature of ['hint', 'advancedNotes'] as const) {
    assert.deepEqual(assessAccess(feature, 100000, 0), { allowed: true, source: 'free', coinCost: 0 });
    assert.deepEqual(assessAccess(feature, 100000, 999, { ...metered, mode: 'free' }), { allowed: true, source: 'free', coinCost: 0 });
  }
});

test('future quota and coin decisions have exact limits and do not mutate wallet or policy', () => {
  const before = JSON.stringify(metered);
  assert.deepEqual(assessAccess('hint', 1, 0, metered), { allowed: true, source: 'quota', coinCost: 0 });
  assert.deepEqual(assessAccess('hint', 2, 30, metered), { allowed: true, source: 'coins', coinCost: 30 });
  assert.deepEqual(assessAccess('advancedNotes', 1, 49, metered), { allowed: false, source: 'unavailable', coinCost: 0 });
  assert.deepEqual(assessAccess('advancedNotes', 1, 50, metered), { allowed: true, source: 'coins', coinCost: 50 });
  assert.equal(JSON.stringify(metered), before);
});

test('requiring a rewarded advertisement never grants or fakes a reward', () => {
  assert.deepEqual(assessAccess('hint', 2, 29, metered), { allowed: false, source: 'reward-required', coinCost: 0 });
  assert.deepEqual(assessAccess('hint', 2, 0, metered), { allowed: false, source: 'reward-required', coinCost: 0 });
});

test('null metered quota stays unlimited while zero cost does not silently bypass exhausted quota', () => {
  const unlimited: AccessPolicy = { mode: 'metered', rules: { ...metered.rules, hint: { freeUses: null, coinCost: 30, rewardedAd: false } } };
  assert.deepEqual(assessAccess('hint', 999, 0, unlimited), { allowed: true, source: 'quota', coinCost: 0 });
  const unavailable: AccessPolicy = { mode: 'metered', rules: { ...metered.rules, hint: { freeUses: 0, coinCost: 0, rewardedAd: false } } };
  assert.equal(assessAccess('hint', 0, 999, unavailable).allowed, false);
});

test('invalid usage, balance, feature or future policy values fail closed', () => {
  for (const value of [-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(assessAccess('hint', value, 0).allowed, false);
    assert.equal(assessAccess('hint', 0, value).allowed, false);
  }
  assert.equal(assessAccess('unknown' as 'hint', 0, 0).allowed, false);
  assert.equal(assessAccess('hint', 0, 0, { ...metered, mode: 'broken' as 'free' }).allowed, false);
  assert.equal(assessAccess('hint', 0, 0, { mode: 'metered', rules: {} } as AccessPolicy).allowed, false);
  const invalid: AccessPolicy = { mode: 'metered', rules: { ...metered.rules, hint: { freeUses: -1, coinCost: 30, rewardedAd: false } } };
  assert.equal(assessAccess('hint', 0, 30, invalid).allowed, false);
});
