# Akura Marketing

## Work orders

- List and detail: `/field-service/work-orders`
- Create: `/field-service/work-orders/create`
- Singular `/field-service/work-order` routes are also supported.
- Backend: `/api/v1/fieldservice/work-orders`, following local Swagger at `http://localhost:5000/api-docs.json`.

Configure the backend menu with menu key `marketing` and item key `work-orders`, then grant menu access to the intended users. Shell maps this item to `/field-service/work-orders`. FIELD_SERVICE users and users with only a Field Service work-order menu use the separate read-only `akura-fieldservice` MFE. Other users with Marketing work-order menu access use this Marketing module. The Shell uses backend menu responses; this module does not create menu records automatically.

The current backend permits active users with an assigned branch who have role ADMIN/APP_MANAGER or section FIELD_SERVICE. Marketing users without these roles are denied by the API and page guard. Granting a menu alone does not change API authorization.

Creation requires an approved quotation (with its current version and standard/sister pricing) or a company whose single active contract is resolved by the backend. Number and date are server-generated. Inspectors must be unique ignoring case. The module includes create, paginated list/search/status filters, and read-only detail.

Validation: `npm.cmd run lint`, `npm.cmd run build`, and `node --test tests/work-order.test.mjs`. From the workspace root, `node --test tests/mfe-contract.test.mjs` checks requests against running local Swagger without mutating backend records.
