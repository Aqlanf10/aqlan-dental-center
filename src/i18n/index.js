import { CURRENCIES, currency } from '../finance/money.js';
import { CATALOGS, MESSAGE_KEYS } from './catalogs.js';
export { CATALOGS, MESSAGE_KEYS } from './catalogs.js';

/** @param {string} language @returns {'ar'|'en'} */
export function validateLanguage(language) {
  if (language !== 'ar' && language !== 'en') throw new Error('UNSUPPORTED_LANGUAGE');
  return language;
}
export function direction(language) { return validateLanguage(language) === 'ar' ? 'rtl' : 'ltr'; }
const placeholders = text => [...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map(m => m[1]).sort();
/** Validate exact scope, no blank values, and named-variable parity before release. */
export function validateCatalogs(catalogs) {
  for (const language of ['ar', 'en']) {
    const catalog = catalogs?.[language];
    if (!catalog || Object.keys(catalog).length !== MESSAGE_KEYS.length) throw new Error('INVALID_CATALOG_KEYS');
    for (const key of MESSAGE_KEYS) {
      if (!Object.hasOwn(catalog, key) || typeof catalog[key] !== 'string' || !catalog[key].trim()) throw new Error('MISSING_TRANSLATION');
      if (JSON.stringify(placeholders(catalog[key])) !== JSON.stringify(placeholders(CATALOGS.en[key]))) throw new Error('INVALID_TRANSLATION_VARIABLES');
      if (/[{}]/.test(catalog[key].replace(/\{[a-zA-Z][a-zA-Z0-9]*\}/g, ''))) throw new Error('INVALID_TRANSLATION_TEMPLATE');
    }
  }
  return true;
}
/** No fallback in any domain, especially financial/clinical/security copy.
 * Runtime variables are plain text; consumers must use text nodes, never HTML.
 */
export function translate(language, key, variables = {}, catalogs = CATALOGS) {
  validateLanguage(language);
  if (typeof key !== 'string' || !MESSAGE_KEYS.includes(key)) throw new Error('UNKNOWN_TRANSLATION_KEY');
  const catalog = catalogs?.[language];
  if (!catalog || !Object.hasOwn(catalog, key) || typeof catalog[key] !== 'string' || !catalog[key].trim()) throw new Error('MISSING_TRANSLATION');
  const template = catalog[key], expected = placeholders(CATALOGS.en[key]);
  if (/[{}]/.test(template.replace(/\{[a-zA-Z][a-zA-Z0-9]*\}/g, ''))) throw new Error('INVALID_TRANSLATION_TEMPLATE');
  if (JSON.stringify(placeholders(template)) !== JSON.stringify(expected)) throw new Error('INVALID_TRANSLATION_VARIABLES');
  if (!variables || Object.getPrototypeOf(variables) !== Object.prototype || Object.keys(variables).sort().join('|') !== [...new Set(expected)].sort().join('|')) throw new Error('INVALID_MESSAGE_VARIABLES');
  for (const name of expected) if (typeof variables[name] !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(variables[name])) throw new Error('INVALID_MESSAGE_VARIABLES');
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (_, name) => `\u2066${variables[name]}\u2069`);
}

/** Renderer contract. Copy/search use raw; render as <bdi dir="ltr"> with textContent.
 * text is the Unicode LRI/PDI plain-text equivalent. This is not a browser audit.
 */
export function presentIdentifier(raw) {
  if (typeof raw !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:@/+\-]{0,255}$/.test(raw)) throw new Error('INVALID_IDENTIFIER');
  return Object.freeze({ raw, direction: 'ltr', isolate: true, text: `\u2066${raw}\u2069` });
}
/** Clinical free text never undergoes translation, normalization or HTML rendering. */
export function originalClinicalText(text, language) {
  validateLanguage(language);
  if (typeof text !== 'string') throw new Error('INVALID_CLINICAL_TEXT');
  return text;
}

/** Exact signed minor-unit presentation. Registry precision only; no FX or rounding.
 * @param {{currency:string, minor:string}} money @param {'ar'|'en'} language
 */
export function presentMoney(money, language) {
  validateLanguage(language);
  const code = currency(money?.currency), minor = money?.minor;
  if (typeof minor !== 'string' || !/^(?:0|-?[1-9][0-9]*)$/.test(minor)) throw new Error('INVALID_MINOR_AMOUNT');
  const value = BigInt(minor), absolute = value < 0n ? -value : value;
  const precision = CURRENCIES[code], scale = 10n ** BigInt(precision);
  const whole = absolute / scale, fraction = (absolute % scale).toString().padStart(precision, '0');
  const locale = language === 'ar' ? 'ar-u-nu-arab' : 'en-u-nu-latn';
  const formatter = new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 0 });
  const digits = new Intl.NumberFormat(locale, { useGrouping: false });
  const localizedFraction = [...fraction].map(d => digits.format(BigInt(d))).join('');
  const decimal = new Intl.NumberFormat(locale).formatToParts(1.1).find(p => p.type === 'decimal')?.value;
  const amount = `${value < 0n ? '-' : ''}${formatter.format(whole)}${precision ? decimal + localizedFraction : ''}`;
  return Object.freeze({ currency: code, minor, precision, amount, direction: 'ltr', isolate: true,
    text: `\u2066${amount} ${code}\u2069` });
}

/** Explicit-zone, strict ISO instant; locale never chooses clinic timezone/calendar. */
export function presentInstant(instant, { language, timeZone } = {}) {
  validateLanguage(language);
  if (typeof timeZone !== 'string' || !timeZone.trim() || timeZone !== timeZone.trim()) throw new Error('CLINIC_TIMEZONE_REQUIRED');
  if (typeof instant !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(instant)) throw new Error('INVALID_INSTANT');
  const epoch = Date.parse(instant), date = Date.parse(`${instant.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(epoch) || !Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== instant.slice(0, 10) || Number(instant.slice(11, 13)) > 23 || Number(instant.slice(14, 16)) > 59 || Number(instant.slice(17, 19)) > 59) throw new Error('INVALID_INSTANT');
  // Gregorian year 0000 is 1 BCE. Detect the era in the actual clinic zone,
  // not the source timestamp: offsets can cross the BCE/CE boundary.
  const era = new Intl.DateTimeFormat('en', { timeZone, calendar: 'gregory', era: 'short', year: 'numeric' })
    .formatToParts(epoch).find(part => part.type === 'era').value;
  const formatter = new Intl.DateTimeFormat(language, { timeZone, numberingSystem: language === 'ar' ? 'arab' : 'latn', calendar: 'gregory', ...(era === 'BC' ? { era: 'short' } : {}), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  return Object.freeze({ instant, epochMilliseconds: epoch, timeZone: formatter.resolvedOptions().timeZone, text: formatter.format(epoch), direction: direction(language) });
}
validateCatalogs(CATALOGS);

/** Adapter-facing semantic errors only: never echo raw exceptions to a user.
 * Unknown codes use a safe localized support message with an opaque reference.
 */
export function presentError(language, code, supportReference) {
  const key = typeof code === 'string' ? `error.${code}` : '';
  if (MESSAGE_KEYS.includes(key) && key !== 'error.SUPPORT') return translate(language, key);
  return translate(language, 'error.SUPPORT', { reference: supportReference });
}
