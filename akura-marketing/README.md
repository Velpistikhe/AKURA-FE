# Akura Marketing

## Work orders

- Work Orders are served exclusively by the Field Service MFE at `/field-service/work-orders`.
- Marketing does not expose Work Order list, detail, or creation routes. The Work Order source files here are currently not routed.
- Backend: `/api/v1/fieldservice/work-orders`, following local Swagger at `http://localhost:5000/api-docs.json`.

Configure the backend menu with menu key `field-service` and item key `work-orders`, then grant menu access to the intended users. Shell always loads `akura-fieldservice`. The Shell uses backend menu responses; this module does not create menu records automatically.

The current backend permits active users with an assigned branch who have role ADMIN/APP_MANAGER or section FIELD_SERVICE. Marketing users without these roles are denied by the API and page guard. Granting a menu alone does not change API authorization.

Creation requires an approved quotation (with its current version and standard/sister pricing) or a company whose single active contract is resolved by the backend. Number and date are server-generated. Inspectors must be unique ignoring case. The module includes create, paginated list/search/status filters, and read-only detail.

Validation: `npm.cmd run lint`, `npm.cmd run build`, and `node --test tests/work-order.test.mjs`. From the workspace root, `node --test tests/mfe-contract.test.mjs` checks requests against running local Swagger without mutating backend records.
