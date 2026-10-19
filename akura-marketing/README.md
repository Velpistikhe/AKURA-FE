# Akura Marketing

## Local development routing

In development, `src/services/api.js` routes by path prefix so the MFE talks to local microservices directly:

- `/marketing/*` → local Marketing service (`http://localhost:5003`, override with `VITE_MARKETING_BASE_URL`)
- `/fieldservice/*` → local Field Service service (`http://localhost:5005`, override with `VITE_FIELDSERVICE_BASE_URL`)
- `/auth/*` and cross-module paths (e.g. `/finance/invoices`) → issuing gateway (`https://akura-api-gateway.vercel.app/api/v1` by default; override with `VITE_AUTH_BASE_URL`)

In production all three prefixes resolve to the same-origin `/api/v1` gateway. Direct-service calls send `Authorization: Bearer` using the access token handed over by the Shell; auth calls rely on the HttpOnly cookie only. Start the backend services on ports `5003` (Marketing) and `5005` (Field Service) alongside the gateway, then run `npm.cmd run dev` and open the Shell at `http://localhost:4173`.

## Work orders

- Work Orders are served exclusively by the Field Service MFE at `/field-service/work-orders`: list, detail, edit, change history and the DRAFT → IN_PROGRESS approve action all live there.
- Marketing has no Work Order routes. It only creates a Work Order, and only from an **approved, active quotation without contract-priced items**, through the action button on each row of the quotation table (`src/modules/quotation/CreateWorkOrderAction.jsx`), posting to `POST /api/v1/marketing/quotations/{quotationId}/work-orders`. Contract or company basis creation is not available in this MFE.
- `src/modules/work-order/workOrderModel.js` holds the create guard (`canCreateWorkOrderFromQuotation`) and payload builder (`quotationWorkOrderPayload`); `src/services/workOrderService.js` only loads the branch inspector options for that form.
- Backend: `/api/v1/fieldservice/work-orders`, following local Swagger at `http://localhost:5000/api-docs.json`.

Configure the backend menu with menu key `field-service` and item key `work-orders`, then grant menu access to the intended users. Shell always loads `akura-fieldservice`. The Shell uses backend menu responses; this module does not create menu records automatically.

The backend requires an active user with an assigned branch: GET permits sections MARKETING and FIELD_SERVICE or roles ADMIN/APP_MANAGER, while create, revoke and start require section MARKETING (ADMIN/APP_MANAGER roles do not bypass write section restrictions). Granting a menu alone does not change API authorization.

Number and date are server-generated. A quotation-based creation needs its current approved version with standard/sister pricing, an end date on or after the start date, and unique inspectors (ignoring case); the backend re-validates all of it.

Validation: `npm.cmd run lint`, `npm.cmd run build`, and `node --test tests/work-order.test.mjs`. From the workspace root, `node --test tests/mfe-contract.test.mjs` checks requests against running local Swagger without mutating backend records.
