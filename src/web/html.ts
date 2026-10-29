import { presentMoney } from '../i18n/index.ts';
import type { Currency } from '../finance/types.ts';

export class SafeHtml {
  readonly __html: string;
  constructor(trustedMarkup: string) {
    this.__html = trustedMarkup;
  }
}

export function trustedHtml(markup: string): SafeHtml {
  return new SafeHtml(markup);
}

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderValue(v: unknown): string {
  if (v instanceof SafeHtml) return v.__html;
  if (Array.isArray(v)) return v.map(renderValue).join('');
  return escapeHtml(v);
}

export function html(strings: TemplateStringsArray, ...values: readonly unknown[]): SafeHtml {
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    out += strings[i] ?? '';
    if (i < values.length) {
      out += renderValue(values[i]);
    }
  }
  return new SafeHtml(out);
}

export function bdiLtr(value: unknown): SafeHtml {
  return html`<bdi dir="ltr" class="tabular-ltr">${value}</bdi>`;
}

export function moneySpan(minor: string, currency: Currency, lang: 'ar' | 'en'): SafeHtml {
  const formatted = presentMoney({ currency, minor }, lang);
  return html`<bdi dir="ltr" class="money-amount">${formatted.amount} <span class="currency-code">${currency}</span></bdi>`;
}
