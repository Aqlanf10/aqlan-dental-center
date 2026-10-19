# Bilingual domain presentation contract

This is a dependency-free, pure presentation slice, not a translated application. No server, UI, persistence, messages to patients, translations of legal templates, clinical approval, browser accessibility certification, or production deployment are implemented. Arabic meanings require review by qualified clinical/financial reviewers before release.

## Explicit vocabulary scope

`MESSAGE_KEYS` is the exact exported scope, with matching immutable Arabic and English catalogs:
- Every finance and clinical command label currently implemented in the foundation.
- Core record/coverage statuses and the four implemented service types.
- Identity and settings action labels, and original-currency financial field labels.
- Semantic error categories for validation, permissions, stale version, duplicate request conflict, overpayment, refund limit, currency/precision, clinical transition/context/coverage, plus a safe support message.

This is not an exhaustive mapping of domain exception strings. A trusted adapter must map domain failures into the semantic error codes. `presentError` never echoes unknown failures: it returns the requested language's support message with a safe opaque support reference. Do not pass exception messages, patient identifiers, credentials or stack traces as support references. `translate` deliberately fails on absent/blank/unknown keys in all domains; it never silently falls back to another language. `validateCatalogs` checks exact keys and named variables. Only the support message currently has a variable; there are no plural-bearing messages. Adding plural messages requires a separate tested plural contract.

## Formatting and identity

- `direction` accepts only `ar`/`en`. Effective language selection belongs to the settings module; no preferences are changed here.
- `presentMoney` requires canonical signed integer minor-unit strings and the existing finance registry. It preserves original currency and minor amount; BigInt arithmetic formats arbitrarily large amounts without converting them through Number. Arabic uses Arabic-Indic digits; English uses Latin digits. Both show the unambiguous currency code. Negative zero, decimal input, and unknown currencies are rejected. There is no parsing of human monetary input, FX conversion, new precision policy or rounding. At present the registry supports YER/SAR/USD, all at two decimal places; this is the existing prototype registry, not regulatory approval of a currency policy.
- `presentInstant` requires a strict ISO timestamp with explicit offset and a separately supplied valid clinic timezone. Gregorian calendar and numbering system are explicit. ISO year 0000 represents 1 BCE; clinic-local BCE dates include the localized era, including when an offset or clinic timezone crosses that boundary. Ordinary CE date formatting is unchanged. This is a display rule, not a clinical date-of-birth eligibility policy. It returns the untouched source instant and the same epoch in either language. Invalid dates, local timestamps and calendar-only dates are rejected; due dates need their own calendar-date contract rather than being coerced into instants.
- `presentIdentifier` returns unchanged `raw` for storage/copy/search and `direction: ltr`, `isolate: true` plus an LRI/PDI string for plain text. The caller should use an isolated text node such as `bdi` in HTML. The same applies to money. These are rendering contracts, not proof of browser, print, assistive-technology or copy/paste behavior. FDI tooth strings are preserved, not clinically validated by this module. Do not mirror dental diagrams based on page direction.
- `originalClinicalText` returns the exact original text, including whitespace and original language. Render as text, never HTML. No automatic translation or AI/Dot functionality exists.

Run `node --test tests/i18n/*.test.js` for catalog parity/fail-closed behavior, safe errors, both digit systems, every existing currency, huge/negative/zero/fraction amounts, mixed-direction identifiers, original notes, invalid dates/timezones, midnight/year transitions and DST.
