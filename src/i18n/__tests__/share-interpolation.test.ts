/* eslint-disable @typescript-eslint/no-var-requires */
import i18next from 'i18next';

const en = require('../locales/en.json');
const es = require('../locales/es.json');
const fr = require('../locales/fr.json');

beforeAll(async () => {
  await i18next.init({
    resources: { en: { translation: en }, es: { translation: es }, fr: { translation: fr } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
});

describe('referrals.shareMessage interpolation', () => {
  it.each(['en', 'es', 'fr'])('renders code + coins + url in %s', async (lng) => {
    await i18next.changeLanguage(lng);
    const out = i18next.t('referrals.shareMessage', {
      code: 'ABC123',
      coins: 150,
      url: 'https://kineticapp.ca/r/ABC123',
    });
    expect(out).toContain('ABC123');
    expect(out).toContain('150');
    expect(out).toContain('https://kineticapp.ca/r/ABC123');
    expect(out).not.toMatch(/\{\{\s*\w+\s*\}\}/);
  });
});

describe('pickSummary.shareMessage interpolation', () => {
  it.each(['en', 'es', 'fr'])('renders picks block in %s', async (lng) => {
    await i18next.changeLanguage(lng);
    const out = i18next.t('pickSummary.shareMessage', { picks: 'Lakers -3.5\nChiefs ML' });
    expect(out).toContain('Lakers -3.5');
    expect(out).toContain('Chiefs ML');
    expect(out).not.toMatch(/\{\{\s*\w+\s*\}\}/);
  });
});
