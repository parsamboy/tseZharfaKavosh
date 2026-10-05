# Fixtures — raw immutable captures

این پوشه فقط fixtureهای خام و تغییرناپذیر را نگه می‌دارد.

## قواعد

- هر فایل `mwAllRows.<ISO8601>.json` باید **immutable** باشد — هرگز overwrite نشود.
- نام فایل باید timestamp دقیق `Asia/Tehran` و UTC داشته باشد (probe خود پیشنهاد می‌دهد).
- هش هر فایل با `shasum -a 256 fixtures/raw/mwAllRows.*.json` محاسبه و در `docs/EVIDENCE_LEDGER.md` ثبت شود.
- فایل raw باید `{ _fixtureMeta, allRows: [...] }` کامل را داشته باشد — truncation فقط برای نمایش console است، نه برای preservation.
- هیچ parser یا تحلیل نباید فایل raw را تغییر دهد؛ خروجی تحلیل در پوشهٔ دیگری ثبت می‌شود.

## وضعیت فعلی

- هنوز هیچ capture زنده‌ای انجام نشده — در انتظار approval `contracts/01-data-source/probe.approval.md` و اجرای `probes/mwAllRows.probe.js`.
