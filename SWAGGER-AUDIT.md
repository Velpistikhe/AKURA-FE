# MFE API contract audit

## Contract price row deletion — 2026-09-21

Active price rows now expose Delete beside Edit using the documented status/Marketing permissions. Confirmation identifies the item and size. DELETE `/marketing/items/contract-prices/{contractPriceId}` sends the price row's `version`; success refreshes contract detail and paginated prices, while 404/409 refreshes stale data without automatically retrying deletion. Inactive prices have no mutation actions. Request construction and the role/status matrix passed automated checks; no live deletion was performed.

## Contract price options endpoint — 2026-09-21

Add Contract Price now loads `/marketing/items/sizes/contract-price-options/{contractId}` with the viewed contract ID in the path, header filters, and server pagination. The contract ID is no longer sent in the query string, matching the latest local Swagger. Rows use flat `itemName`/`serviceName` fields and nullable `size`. The previous price-list scan, client exclusions, and large-catalog fallback have been removed. Since options omit maintenance capability, selecting a row loads its item detail before enabling price entry and submission; the existing conditional maintenance requirement is preserved.

## Contract price create/update access — 2026-09-21

Checked live local Swagger: POST item-size contract prices and PATCH contract prices now permit DRAFT/REJECTED for all Marketing roles, and SUBMITTED/APPROVED for Marketing ADMIN only. Both reject deleted contracts and other statuses. The single-price operations no longer impose an effective-date restriction. Add/Edit buttons and editor submission share these status-aware permissions, using the freshly loaded parent contract. Existing decimal, maintenance-price, active-price, revoked-company, and price-version checks remain. Excel import retains its separately documented eligibility rules. Request schemas remain compatible with the existing service payloads.

## Company contract cards — 2026-09-21

Contracts now appears directly below Company Staff with Show/Hide, initially collapsed. The separate history table and single-contract card are replaced by a server-paginated list of cards covering every contract status. Pages default to 10 records, with 5/10/20/50 options; opening a card's price view uses that card's contract ID. Contract actions retain their existing role and status guards. Add Contract uses draft/rejected records in the loaded page; the backend remains authoritative for blockers on other pages and returns 409 on conflicting creation. Separate DRAFT/REJECTED limit-1 checks have been removed. No contract requests run while the section is collapsed.

Validation: Marketing lint and production build passed, as did all nine price/access/catalog tests. A new browser fixture checks lazy loading, section order, all statuses, pagination, creation guards, and price-view scope; its run stopped at a Chrome DevTools `Runtime.enable` timeout before UI assertions, so browser verification remains incomplete.

## Contract pricelist upload update — 2026-09-21

Verified live local Swagger at `http://localhost:5000/api-docs.json`. Excel import now accepts the requested DRAFT contract and preserves its status. Multipart fields remain `file`, `companyId`, and `version`.

The upload dialog uses the contract ID from View Contract without another contract selector. DRAFT contracts and the current/earliest future APPROVED target are eligible. If the viewed contract becomes ineligible, upload is disabled without switching targets. Conflict reload refreshes versions and eligibility. Individual price editing retains its existing APPROVED restrictions.

View Contract Price and upload now fetch contract detail by ID instead of loading all company contracts with limit 100. The price view remains scoped to its original contract and no longer has a contract-switching filter. Lint and build passed; the browser fixture was updated for this scope but has not been rerun.

The Company Details contract card also used bulk queries for DRAFT, SUBMITTED, REJECTED, and APPROVED. It now requests one candidate per pending status, preserving draft/rejected creation guards, and skips APPROVED lookup when an active or pending contract is available. Otherwise it scans APPROVED in pages of 20 to preserve earliest-future selection because the API has no date filter or sort parameter. Stable active-contract ID dependencies avoid reloading on object identity changes. All six price/card model tests passed, including request limits, skipped approved queries, and multi-page fallback selection.

Validation: 31 of 32 Marketing API/price tests passed, including draft/revision target selection and multipart schema checks. The remaining failure is the previously recorded missing DELETE company endpoint, outside this update. No live backend mutations or browser verification were performed.

Source: `http://localhost:5000/api-docs.json`, checked on 2026-09-15.

Scope: existing App Manager, Marketing, Finance, and Shell API integrations. Field Service has no MFE in this workspace. Browser menu paths such as `/referensi/items` remain separate from API paths such as `/marketing/items`.

| Application | Contract checks and adjustments |
| --- | --- |
| Shell | Login, registration, profile, password, refresh, logout, and `my-menus`. Refresh/logout use the HttpOnly cookie instead of a JSON token body. Navigation continues to use the backend's granted menu items. |
| App Manager | User updates with version; menu, menu-item, menu-access, office-branch CRUD; filters, sorting, and branch options. Refresh uses cookies. The earlier requested Finance-only replacement for Accounting in the user selector is retained; Swagger still supports legacy ACCOUNTING. |
| Marketing | Quotation payloads, statuses, prices, invoice action, catalog endpoints, companies/staff, contracts and multipart import. Standard prices preserve two decimal places and large decimal strings. Pending CREATE contracts can be approved by ADMIN/APP_MANAGER using the latest version; revision/termination actions follow those admin restrictions. Refresh uses cookies. |
| Finance | Invoice and proforma CRUD, history, quotation references, taxes, and invoice creation from quotations. Both document numbers are server-generated; invoice date is server-generated; proforma date remains editable. Tax writes require active ADMIN in FINANCE with a branch. Refresh uses cookies. |

## Verification

Run from the workspace root with the local gateway running:

```powershell
node --test tests/mfe-contract.test.mjs
node --test akura-marketing/tests/*.test.mjs
node --test akura-finance/tests/*.test.mjs
```

Each application also provides `npm.cmd run lint` and `npm.cmd run build`.

Result: all 45 tests passed (10 shared contract checks, 26 Marketing tests, and 9 Finance tests). Lint and production builds passed for Shell, App Manager, Marketing, and Finance.

Tests validate request construction against live Swagger and simulate cookie refresh/retry. They do not mutate backend data. Browser interaction, real session cookies, PDF-storage CORS, and live create/update/delete flows require an authenticated browser session and are not covered by this audit's automated tests.


## Contract lifecycle update ? 2026-09-20

Verified against `http://localhost:5000/api-docs.json` (Gateway 2.7.0); the public Swagger URL was unavailable during this check.

- Contract statuses are `DRAFT`, `APPROVED`, `CANCELED`, and `TERMINATE`. Contract records expose `hasList` instead of `isActive`; price rows retain `isActive`.
- Creation always produces a draft and is blocked by an existing draft or current/future approved contract.
- ADMIN in MARKETING can edit drafts with PATCH and approve them with POST `/approve`. Revision of current/future approved contracts uses POST `/revise`; termination uses POST on the contract resource with `version` and `terminatedAt`.
- Draft and future approved contracts expose the applicable actions even when `company.contract` is null. History and price selectors no longer send the removed contract `isActive` query parameter.
- Some price/import/reference descriptions still mention legacy `ACTIVE`. Frontend eligibility uses the authoritative contract enum (`APPROVED`), retaining current-first/future-fallback selection and the documented exclusive end date.

Validation: 64 Marketing/shared tests passed against live local Swagger, including lifecycle methods, request schemas, statuses, permissions, and price selection. Backend mutations were mocked in these tests. Marketing lint and production build passed. The browser price test was stopped after it stalled following Chrome startup; browser interaction remains unverified.

## Marketing quotation update - 2026-09-20

Compared live local and public Gateway Swagger. Marketing paths match; local quotation schemas additionally expose `deliveryInvoice`, which the public schemas do not yet contain.

- Delivery Invoice is required in quotation create/edit forms per the user's correction, with whitespace-only values rejected and a 255-character limit. It also appears in quotation detail.
- The field shares validation and trimmed-string payload handling with the other required quotation text fields. Legacy null values render as empty inputs and must be filled before saving.
- Local Swagger still permits nullable, optional request values; the frontend enforces the stricter user requirement.

Validation covers required text-field membership, trimmed create/edit values, legacy records, and Swagger schema compatibility. No live database mutations or browser verification were performed for this change. The previously reported PostgreSQL enum mismatch remains a backend schema synchronization issue.


## Contract submission workflow - 2026-09-20

Latest local Swagger adds SUBMITTED, REJECTED, REVISED and TERMINATED; removes CANCELED/TERMINATE; adds submit/reject, draft DELETE cancellation and POST /terminate. Frontend now exposes those transitions with fresh GET versions, separates PATCH editing from POST revision creation, and shows draft/submitted/rejected/future-approved records. Revision approval, rather than creation, replaces the original contract. History shows the company snapshot and revision reference.

Swagger descriptions are partially stale. Read-only inspection of the local contract routes/repository confirms approval requires SUBMITTED, rejected contracts may be corrected to DRAFT or canceled, creation is blocked by nondeleted DRAFT/REJECTED rows, and termination accepts dates within the contract period including its boundaries. These behaviors inform frontend guards. Only Marketing USER/ADMIN can create and submit; Marketing roles may edit drafts/rejected contracts and create revisions; approved edits, approval, rejection and termination require Marketing ADMIN.

The full 65-test run passed 63 tests; two general integration checks fail because current Swagger removed DELETE /marketing/companies/{companyId}, outside this contract update. No backend mutations were performed.

Contract-focused verification: all 8 selected checks passed. Marketing lint and production build passed. Browser interaction was not verified in this update.
