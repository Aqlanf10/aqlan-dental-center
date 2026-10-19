import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENCIES } from '../../src/finance/money.js';
import { CATALOGS, MESSAGE_KEYS, validateCatalogs, translate, direction, presentIdentifier, presentMoney, presentInstant, originalClinicalText, presentError } from '../../src/i18n/index.js';

test('catalog parity, complete in-scope messages, and distinct refund/reversal actions', () => {
  assert.equal(validateCatalogs(CATALOGS), true);
  assert.deepEqual(Object.keys(CATALOGS.ar).sort(), Object.keys(CATALOGS.en).sort());
  for (const language of ['ar', 'en']) {
    for (const key of MESSAGE_KEYS) assert.ok(translate(language, key, key === 'error.SUPPORT' ? { reference: 'SUP-123' } : {}));
    assert.notEqual(translate(language, 'action.REFUND_RECEIPT'), translate(language, 'action.REVERSE_RECEIPT'));
  }
});
test('missing critical messages fail closed, no alternate language or raw keys', () => {
  const broken = structuredClone(CATALOGS);
  delete broken.ar['finance.remaining'];
  assert.throws(() => validateCatalogs(broken), /CATALOG_KEYS/);
  assert.throws(() => translate('ar', 'finance.remaining', {}, broken), /MISSING_TRANSLATION/);
  for (const key of ['__proto__', 'constructor', 'missing.key', undefined]) assert.throws(() => translate('ar', key), /UNKNOWN_TRANSLATION_KEY/);
  assert.throws(() => translate('fr', 'status.DRAFT'), /UNSUPPORTED_LANGUAGE/);
  broken.ar['finance.remaining'] = ' ';
  assert.throws(() => validateCatalogs(broken), /MISSING_TRANSLATION/);
});
test('strict named variables prevent leaking raw technical details', () => {
  assert.match(translate('ar', 'error.SUPPORT', { reference: 'SUP-123' }), /\u2066SUP-123\u2069/);
  for (const variables of [{}, { reference: '<script>' }, { reference: 'SUP-123', detail: 'secret' }, { reference: 'x\u202Ey' }]) assert.throws(() => translate('en', 'error.SUPPORT', variables), /INVALID_MESSAGE_VARIABLES/);
  const broken = structuredClone(CATALOGS);
  broken.ar['error.SUPPORT'] = 'تعذر التنفيذ {secret}';
  assert.throws(() => validateCatalogs(broken), /INVALID_TRANSLATION_VARIABLES/);
  assert.throws(() => translate('ar', 'error.SUPPORT', { reference: 'SUP-123' }, broken), /INVALID_TRANSLATION_VARIABLES/);
});
test('direction, identifiers and original clinical text preserve source data', () => {
  assert.equal(direction('ar'), 'rtl'); assert.equal(direction('en'), 'ltr');
  for (const raw of ['11', '48', '55', '85', 'PT-001', 'ENDO', 'staff@example.com']) {
    const result = presentIdentifier(raw);
    assert.equal(result.raw, raw); assert.equal(result.direction, 'ltr'); assert.equal(result.isolate, true);
    assert.equal(result.text, `\u2066${raw}\u2069`);
  }
  assert.throws(() => presentIdentifier('PT-\u202E001'), /INVALID_IDENTIFIER/);
  const original = '  ألم tooth 11\nملاحظة أصلية  ';
  for (const language of ['ar', 'en']) assert.equal(originalClinicalText(original, language), original);
});
test('exact monetary presentation for every existing registry precision', () => {
  for (const [currency, precision] of Object.entries(CURRENCIES)) {
    for (const minor of ['0', '1', '-1', '150000', '-50000', '900719925474099312345678901234567890']) {
      const money = Object.freeze({ currency, minor });
      for (const language of ['ar', 'en']) {
        const result = presentMoney(money, language);
        assert.equal(result.currency, currency); assert.equal(result.minor, minor); assert.equal(result.precision, precision);
        assert.ok(result.text.endsWith(` ${currency}\u2069`));
        const canonical = result.amount.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[,٬]/g, '').replace('٫', '.');
        const [whole, fractional = ''] = canonical.replace('-', '').split('.');
        assert.equal(fractional.length, precision);
        const reconstructed = (BigInt(whole) * 10n ** BigInt(precision) + BigInt(fractional || '0')) * (minor.startsWith('-') ? -1n : 1n);
        assert.equal(reconstructed.toString(), minor);
      }
    }
  }
  assert.equal(presentMoney({ currency: 'SAR', minor: '150000' }, 'en').amount, '1,500.00');
  assert.equal(presentMoney({ currency: 'SAR', minor: '-1' }, 'ar').amount, '-٠٫٠١');
});
test('money rejects ambiguous input, noncanonical signs, extra precision and unsupported currency', () => {
  for (const minor of ['-0', '+1', '01', '1.00', '1,000', '١٠٠', ' 100', 100, 100n, null]) assert.throws(() => presentMoney({ currency: 'SAR', minor }, 'en'), /INVALID_MINOR_AMOUNT/);
  for (const currency of ['JPY', 'KWD', 'SAR ', 'sar', '__proto__']) assert.throws(() => presentMoney({ currency, minor: '100' }, 'ar'), /Unsupported currency/);
});
test('clinic date boundaries and Gregorian calendar independent of language', () => {
  const instant = '2026-12-31T22:30:00Z';
  const en = presentInstant(instant, { language: 'en', timeZone: 'Asia/Aden' });
  const ar = presentInstant(instant, { language: 'ar', timeZone: 'Asia/Aden' });
  assert.equal(en.instant, instant); assert.equal(ar.instant, instant); assert.equal(en.epochMilliseconds, ar.epochMilliseconds);
  assert.match(en.text, /2027/); assert.match(ar.text, /٢٠٢٧/);
  assert.match(presentInstant(instant, { language: 'en', timeZone: 'UTC' }).text, /2026/);
  assert.equal(presentInstant('2027-01-01T01:30:00+03:00', { language: 'en', timeZone: 'UTC' }).epochMilliseconds, en.epochMilliseconds);
  assert.equal(presentInstant('2024-02-29T12:00:00.123Z', { language: 'en', timeZone: 'UTC' }).epochMilliseconds, Date.parse('2024-02-29T12:00:00.123Z'));
});
test('DST observes explicit zone without changing the instant', () => {
  const before = presentInstant('2026-03-08T06:59:59Z', { language: 'en', timeZone: 'America/New_York' });
  const after = presentInstant('2026-03-08T07:00:00Z', { language: 'en', timeZone: 'America/New_York' });
  assert.match(before.text, /01:59:59/); assert.match(after.text, /03:00:00/);
  assert.equal(after.epochMilliseconds - before.epochMilliseconds, 1000);
});
test('dates reject missing zones, rollover dates, local dates, invalid offsets and times', () => {
  for (const instant of ['2026-02-29T00:00:00Z', '2026-04-31T00:00:00Z', '2026-01-01T24:00:00Z', '2026-01-01T12:60:00Z', '2026-01-01T12:00:60Z', '2026-01-01', '2026-01-01T12:00:00', '2026-01-01T12:00:00+25:00', new Date(), null]) assert.throws(() => presentInstant(instant, { language: 'en', timeZone: 'UTC' }), /INVALID_INSTANT/);
  for (const timeZone of [undefined, '', ' ', ' UTC']) assert.throws(() => presentInstant('2026-01-01T00:00:00Z', { language: 'ar', timeZone }), /CLINIC_TIMEZONE_REQUIRED/);
  assert.throws(() => presentInstant('2026-01-01T00:00:00Z', { language: 'ar', timeZone: 'Fake/Zone' }), RangeError);
});

test('unknown errors are localized without exposing exception details', () => {
  for (const language of ['ar', 'en']) {
    assert.equal(presentError(language, 'OVERPAYMENT'), translate(language, 'error.OVERPAYMENT'));
    const result = presentError(language, 'database password=secret', 'SUP-321');
    assert.equal(result, translate(language, 'error.SUPPORT', { reference: 'SUP-321' }));
    assert.ok(!result.includes('secret'));
    assert.throws(() => presentError(language, 'unknown', 'token=secret'), /INVALID_MESSAGE_VARIABLES/);
  }
});

test('BCE era disambiguates year zero and offset crossings in both languages', () => {
  for (const language of ['ar', 'en']) {
    const options = { language, timeZone: 'UTC' };
    const yearZero = presentInstant('0000-01-01T00:00:00Z', options);
    const yearOne = presentInstant('0001-01-01T00:00:00Z', options);
    assert.notEqual(yearZero.text, yearOne.text);
    const era = new Intl.DateTimeFormat(language, { calendar: 'gregory', timeZone: 'UTC', era: 'short' })
      .formatToParts(yearZero.epochMilliseconds).find(part => part.type === 'era').value;
    assert.ok(yearZero.text.includes(era));
    assert.ok(!yearOne.text.includes(era));
    const crossing = presentInstant('0001-01-01T00:00:00+03:00', options);
    assert.ok(crossing.text.includes(era));
    assert.equal(crossing.epochMilliseconds, Date.parse('0000-12-31T21:00:00Z'));
    const zoneCrossing = presentInstant('0001-01-01T00:00:00Z', { language, timeZone: 'Etc/GMT+1' });
    assert.ok(zoneCrossing.text.includes(era));
    const intoCE = presentInstant('0000-12-31T23:30:00Z', { language, timeZone: 'Etc/GMT-1' });
    assert.ok(!intoCE.text.includes(era));
    const ordinary = presentInstant('2026-10-19T12:00:00Z', options);
    const expected = new Intl.DateTimeFormat(language, { timeZone: 'UTC', numberingSystem: language === 'ar' ? 'arab' : 'latn', calendar: 'gregory', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(ordinary.epochMilliseconds);
    assert.equal(ordinary.text, expected);
  }
});
