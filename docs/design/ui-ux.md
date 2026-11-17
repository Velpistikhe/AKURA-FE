# Akura Operations UI

## Audience and direction

The primary audience is internal branch administrators, Marketing, Finance, and Field Service staff (confirmed by the product owner). The product supports industrial inspection: quotation preparation, work orders, customer contracts, catalogs, and branch administration. Prioritize locating work, reading dense data, and understanding branch context.

Use the existing Akura logo and navy/red identity. The visual reference is an inspection document: clear sections, precise alignment, restrained emphasis, and readable records. Avoid decorative metrics, unsupported product claims, repeated gradient panels, and animation on every section.

## Audit before implementation

Reviewed the five application manifests, route entry points, shared Ant Design adapters, table wrappers, buttons, cards, inputs, modal motion, theme configuration, and page-specific styles. Reviewed complex quotation forms, company contracts/staff/history surfaces, service scopes, work-order creation/detail/history, profile editors, and tax synchronization in source. Browser checks used an isolated fixture session and empty API responses; this is visual validation, not backend integration validation.

| Area | Existing destinations and supporting surfaces | Findings |
| --- | --- | --- |
| Public shell | Landing, login, registration | Landing already has relevant inspection photography. Auth uses generic circles and unverified analytics/trial/support claims. Registration is long on phones. |
| Workspace shell | Dashboard; profile/settings/user aliases; navigation and account menu | Dashboard is only a greeting banner. Branch context is absent. Breadcrumb disappears on mobile. Sidebar overlay needs keyboard focus containment and Escape support. |
| App Manager | Menus, menu items, menu access, users, office branches; editors and access filters | Repeated large heading/card styling obscures hierarchy. Shared table behavior already supports scrolling and action widths; preserve it. |
| Marketing/reference | Overview, quotations, create/copy quotation, companies, services, items | Overview is decorative. Forms and record details are substantially richer than the overview suggests. Large nested item tables require contained horizontal scrolling, not compressed columns. |
| Field Service | Overview, work orders; create/edit, inspectors, detail, history, sync | Overview uses an unrelated gradient. Existing branch/role checks and version locks must remain intact. Dense work-order details need the same visual rhythm as quotations. |
| Finance/reference | Overview, quotations, tax periods, synchronization; quotation detail and tax editor | Existing module links are useful. Styling duplicates marketing and introduces additional raw colors and radii. |
| Shared components | Tables/filters, form controls, buttons, cards, tags, modals, loading/error states | Several independent adapters share Ant Design through federation. CSS and ConfigProvider tokens disagree; many shadows, gradients, uppercase labels, and hover lifts compete. Existing reduced-motion/modal lifecycle behavior must remain intact. |

Before changes, Playwright opened all 15 protected page destinations plus dashboard and both auth pages. At 390/768 px, representative tables and the quotation form had no document overflow, but mobile lost the page breadcrumb. Menu-item/access tabs and record-driven dialogs were source-reviewed; empty fixtures cannot validate all record transitions.

## Design system

| Role | Light | Dark |
| --- | --- | --- |
| Brand/navigation navy | `#182B49` | `#182B49` |
| Brand red / danger | `#BB303E` | `#FF9CA5` |
| Navigation marker amber | `#E5B64B` | `#E5B64B` |
| Canvas | `#F3F5F6` | `#101B29` |
| Surface | `#FFFFFF` | `#172639` |
| Main text | `#213449` | `#E8EFF6` |
| Secondary text | `#536679` | `#A6B7C7` |
| Border | `#D7DFE5` | `#34465B` |

- Typography: IBM Plex Sans, system fallback. Body 14–16 px, labels 13–14 px, section titles 20–24 px, page titles 28–36 px. Tabular numerals for records and currency. Sentence case and natural letter spacing.
- Spacing: 4/8/12/16/24/32/48 px. Desktop page gutters 32 px, tablet 24 px, phone 16 px. Existing 1680 px data workspace limit stays intact.
- Shape: controls 6 px, data panels 10 px, primary workspace feature 12 px. Borders establish grouping; shadows reserved for overlays and subtle elevation.
- Navigation: solid navy with an amber active marker; a visible page title and branch context. Mobile uses an accessible drawer and keeps the current location visible.
- Dashboard: actionable directory generated exclusively from the user's server-provided menus; account/branch information from the current session. No invented counts or activity.
- Data surfaces: aligned page heading/action region, quiet table header, readable rows and bounded scrolling. Preserve filtering, pagination, actions, and sticky columns.
- Feedback: existing loading, empty, error/retry and confirmation behavior remains. Visible keyboard focus, text alongside status colors, reduced motion, and 44 px primary touch controls.

Desktop: persistent sidebar → page/branch header → workspace heading → modules/data. At 1024 px the sidebar remains available; at 768 px and below it becomes a drawer. Mobile: compact header → stacked heading/context → single-column module links; tables scroll inside their panel. Auth uses a compact brand bar on phones so the sign-in action remains in the first viewport.

## Rollout and boundaries

1. Align CSS and Ant Design tokens; improve shell navigation, current location, branch context, and keyboard access.
2. Replace the greeting-only dashboard with permitted workspace links; make auth copy relevant to internal operations.
3. Apply the same data-panel rhythm and overview treatment across federated modules. Keep existing component contracts and public imagery.
4. Inspect desktop (1440), tablet (768/1024), and mobile (390/375), including light/dark, drawer, keyboard, empty/error states, and a representative editor. Record only checks actually executed.

No service endpoints, authentication rules, branch filters, record models, payloads, optimistic locking, or backend permissions are changed. No API contract changes require Swagger updates. Existing user work-order changes are preserved.

## Validation completed

- `npm.cmd run build` succeeded independently in all five packages. Vite reports shared chunks above 500 kB and plugin timing notices; bundle splitting was not part of this visual change.
- `npm.cmd run lint` succeeded in `akura-shell`. Targeted `npm.cmd exec -- oxlint` checks succeeded for MarketingApp.jsx, FinanceApp.jsx, and FieldServiceApp.jsx in their owning packages. App Manager changes are CSS only.
- `node --test tests/workspaceModel.test.js` in `akura-shell`: 3 tests passed, covering assigned menu ordering/deduplication, missing access, and branch context changes. `node --check tests/workspace.browser.js` passed.
- [Playwright regression](../../akura-shell/tests/workspace.browser.js): 80 protected route/resolution checks (16 routes × 1440/1024/768/390/375 px), plus 8 auth layout checks. No document overflow or browser page errors. Validated populated company rows, mobile editor open/cancel, menu item/access tabs, permitted links, branch changes, no-menu and menu-retry states, drawer focus/Escape/restoration, sidebar collapse, skip link, auth field errors/autocomplete, and the mobile sign-in action position.
- Dashboard link/body/heading contrast passed 4.5:1 in light and dark themes. Eight additional theme checks verified secondary text colors in App Manager, Marketing, Field Service, and Finance. Description and placeholder tokens now follow the same palette. This targeted check is not a claim of a complete WCAG conformance audit.
- `git diff --check` passed. No dependency or lockfile changes.

To rerun the browser check, start each package with `npm.cmd run dev -- --host`, then run Playwright MCP `browser_run_code_unsafe` with `akura-shell/tests/workspace.browser.js` as its filename, from the repository root. The script intercepts API responses only in the test browser and removes its handler afterward. Fixtures include no real customer records and perform no backend writes.

Local screenshots (intentionally ignored by Git): [desktop](previews/workspace-1440.png), [tablet](previews/workspace-768.png), [mobile](previews/workspace-390.png), [dark](previews/workspace-dark.png), [login desktop](previews/login-desktop.png), [login mobile](previews/login-mobile.png), [company mobile](previews/company-mobile.png).

Not validated: real authenticated backend transactions, every populated record/history/synchronization dialog, cross-browser rendering beyond the available Playwright browser, or stress tests. Existing business/API test suites outside this UI change were not rerun. The public landing page retains its existing content and imagery, with the new type family; the confirmed priority is internal operations.
