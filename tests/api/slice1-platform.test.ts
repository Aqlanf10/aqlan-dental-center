import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIsolatedDatabaseConfig } from '../../src/platform/db.ts';
import { addCalendarMonths, calendarWeekday, clinicDateInZone } from '../../src/platform/clock.ts';
import {
  defaultClinicOperationalSettings,
  validateOperationalSettings,
} from '../../src/modules/governance/index.ts';
import { html, bdiLtr } from '../../src/web/html.ts';

test('isolated database configuration rejects live/mini/non-local or unacknowledged URLs', () => {
  assert.throws(
    () => parseIsolatedDatabaseConfig('postgres://postgres:x@127.0.0.1:5432/aqlan_test', undefined),
    /AQLAN_ISOLATED_DB=1/,
  );
  assert.throws(
    () => parseIsolatedDatabaseConfig('postgres://postgres:x@127.0.0.1:5432/aqlan_center_mini', '1'),
    /forbidden database name/i,
  );
  assert.throws(
    () => parseIsolatedDatabaseConfig('postgres://postgres:x@127.0.0.1:5432/clinic_production', '1'),
    /forbidden database name/i,
  );
  assert.throws(
    () => parseIsolatedDatabaseConfig('postgres://postgres:x@db.example.com:5432/aqlan_test', '1'),
    /loopback/i,
  );
  assert.throws(
    () => parseIsolatedDatabaseConfig('postgres://postgres:x@127.0.0.1:5432/aqlan_test?sslmode=disable', '1'),
    /query\/hash/i,
  );
  const ok = parseIsolatedDatabaseConfig('postgres://postgres:synthetic@127.0.0.1:5432/aqlan_slice1_test', '1', {
    max: 2,
  });
  assert.equal(ok.database, 'aqlan_slice1_test');
  assert.equal(ok.max, 2);
});

test('clinic timezone clock avoids UTC midnight drift and clamps installment month-ends', () => {
  // 2026-10-29T21:30:00Z is already 2026-10-30 00:30:00 in Asia/Aden (+03:00)!
  const lateUtc = new Date('2026-10-29T21:30:00Z');
  assert.equal(clinicDateInZone(lateUtc, 'Asia/Aden'), '2026-10-30');
  assert.equal(clinicDateInZone(lateUtc, 'UTC'), '2026-10-29');

  // 2026-10-30 is a Friday (weekday 5)
  assert.equal(calendarWeekday('2026-10-30'), 5);
  assert.equal(addCalendarMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addCalendarMonths('2026-10-30', 23), '2028-09-30');
});

test('operational settings validator rejects invariant bypasses and invalid FX ratios', () => {
  const base = defaultClinicOperationalSettings();
  const valid = validateOperationalSettings(base);
  assert.equal(valid.schedule.timezone, 'Asia/Aden');

  assert.throws(() => {
    validateOperationalSettings({
      ...base,
      inventory: { ...base.inventory, allowNegativeStock: true },
    });
  });

  assert.throws(() => {
    validateOperationalSettings({
      ...base,
      finance: {
        ...base.finance,
        fxRates: {
          ...base.finance.fxRates,
          SAR_TO_YER: { numerator: '0', denominator: '1' },
        },
      },
    });
  });
});

test('HTML template engine escapes untrusted input and isolates LTR tokens', () => {
  const untrusted = `<img src=x onerror="alert('xss')">`;
  const rendered = html`<div>${untrusted} — ${bdiLtr('#7000')}</div>`.__html;
  assert.ok(!rendered.includes('<img'));
  assert.ok(rendered.includes('&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;'));
  assert.ok(rendered.includes('<bdi dir="ltr" class="tabular-ltr">#7000</bdi>'));
});
