# MFE API contract audit

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
