/* eslint-disable @typescript-eslint/no-var-requires */
const en = require('../locales/en.json');
const es = require('../locales/es.json');
const fr = require('../locales/fr.json');

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = [];
  for (const key of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      out.push(...flatten(val as Record<string, unknown>, full));
    } else {
      out.push(full);
    }
  }
  return out;
}

describe('i18n parity EN/ES/FR', () => {
  const enKeys = flatten(en).sort();
  const esKeys = flatten(es).sort();
  const frKeys = flatten(fr).sort();

  it('ES has the same keys as EN', () => {
    expect(esKeys).toEqual(enKeys);
  });

  it('FR has the same keys as EN', () => {
    expect(frKeys).toEqual(enKeys);
  });

  it('Sprint 1 growth keys exist in all 3 languages', () => {
    const required = [
      'winCelebration.title',
      'winCelebration.points',
      'winCelebration.subtitle',
      'winCelebration.later',
      'pickSummary.shareMessage',
      'referrals.shareMessage',
    ];
    for (const key of required) {
      expect(enKeys).toContain(key);
      expect(esKeys).toContain(key);
      expect(frKeys).toContain(key);
    }
  });

  it('referrals.shareMessage carries {{code}} and {{coins}} placeholders', () => {
    const pick = (obj: Record<string, unknown>, path: string) =>
      path.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown>)[k], obj) as string;
    for (const locale of [en, es, fr]) {
      const msg = pick(locale, 'referrals.shareMessage');
      expect(msg).toMatch(/\{\{\s*code\s*\}\}/);
      expect(msg).toMatch(/\{\{\s*coins\s*\}\}/);
    }
  });
});
