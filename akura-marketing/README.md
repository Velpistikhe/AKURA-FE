# Akura Marketing

## Local development routing

In development, `src/services/api.js` routes by path prefix so the MFE talks to local microservices directly:

- `/marketing/*` → local Marketing service (`http://localhost:5003`, override with `VITE_MARKETING_BASE_URL`)
- `/fieldservice/*` → local Field Service service (`http://localhost:5005`, override with `VITE_FIELDSERVICE_BASE_URL`)
- `/auth/*` and cross-module paths (e.g. `/finance/invoices`) → issuing gateway (`https://akura-api-gateway.vercel.app/api/v1` by default; override with `VITE_AUTH_BASE_URL`)

In production all three prefixes resolve to the same-origin `/api/v1` gateway. Direct-service calls send `Authorization: Bearer` using the access token handed over by the Shell; auth calls rely on the HttpOnly cookie only. Start the backend services on ports `5003` (Marketing) and `5005` (Field Service) alongside the gateway, then run `npm.cmd run dev` and open the Shell at `http://localhost:4173`.
## Finance documents

- Marketing creates a DRAFT Invoice or Proforma Invoice from an **approved, active quotation** through the action button on each row of the quotation table (`src/modules/quotation/CreateInvoiceAction.jsx`), posting to `POST /api/v1/marketing/quotations/{quotationId}/invoices`.
- The create payload (`CreateFinanceDocumentFromQuotationRequest`) sends only required `quotationId` (matching the URL), `kind` (`INVOICE` or `PROFORMA_INVOICE`), `dueDate` and trimmed `location` (1-255 characters). The client never selects billed lines or prices and cannot set the document number, date, tax or totals: Marketing forwards these four fields and Finance re-fetches the quotation to verify branch ownership, APPROVED status, version and every billed item value before generating the document as DRAFT.
- `dueDate` cannot precede the server document date (Asia/Jakarta). Finance unavailability returns `503`; a quotation that is not APPROVED or no longer matches Marketing returns `409`. Responses 403, 404 and 409 refresh the quotation list; 503 displays an availability error without automatic retry.
- Requires section MARKETING and an assigned office branch. An existing Work Order must be COMPLETED; the backend revalidates live Work Order status and branch ownership. `src/modules/quotation/invoiceActionModel.js` holds the create guard (`canCreateFinanceDocument`) and the payload builder (`financeDocumentPayload`); `src/services/quotationService.js` calls the endpoint.
- Finance now accepts `source: QUOTATION` with a complete quotation snapshot or `source: DIRECT`; Marketing continues using its existing orchestration endpoint and four-field payload.
- Backend: `/api/v1/marketing/quotations/{quotationId}/invoices`, following local Swagger at `http://localhost:5000/api-docs.json`.
- Validation: from the workspace root, run `node --test tests/marketing-invoice.test.mjs` for access rules, payload validation, mocked API requests, error responses and concurrent submit protection.



## Work orders

- Work Orders are served exclusively by the Field Service MFE at `/field-service/work-orders`: list, detail, edit, change history and the DRAFT → IN_PROGRESS approve action all live there.
- Marketing has no Work Order routes. It only creates a Work Order, and only from an **approved, active quotation**, through the action button on each row of the quotation table (`src/modules/quotation/CreateWorkOrderAction.jsx`), posting to `POST /api/v1/marketing/quotations/{quotationId}/work-orders`. Company basis creation is not available in this MFE.
- The create payload (`CreateWorkOrderFromQuotationRequest`) sends `quotationId`, `startDate`, `endDate`, `inspectors` (`{ userId, name }` pairs copied from the Field Service inspector options snapshot) and `items` (`{ itemSizeId }` pairs). The item selection is mandatory, unique and limited to the lines of that quotation; quantities are copied server-side from the quotation lines and are never sent by the client.
- The create form lists the selected quotation items in their own card, and the **Add Items** button opens a second modal that lists the remaining quotation lines with checkbox selection, per-column header search and pagination. Both tables filter and page client-side because the quotation lines are already in memory. The submit button stays disabled until the dates, the inspectors and at least one item are present.
- Any price source is accepted, including contract pricing. `src/modules/work-order/workOrderModel.js` holds the create guard (`canCreateWorkOrderFromQuotation`), the payload builder (`quotationWorkOrderPayload`) and the item option helpers; `src/services/workOrderService.js` only loads the branch inspector options for that form.
- Backend: `/api/v1/fieldservice/work-orders`, following local Swagger at `http://localhost:5000/api-docs.json`.

Configure the backend menu with menu key `field-service` and item key `work-orders`, then grant menu access to the intended users. Shell always loads `akura-fieldservice`. The Shell uses backend menu responses; this module does not create menu records automatically.

The backend requires an active user with an assigned branch: GET permits sections MARKETING and FIELD_SERVICE or roles ADMIN/APP_MANAGER, while create, revoke and start require section MARKETING (ADMIN/APP_MANAGER roles do not bypass write section restrictions). Granting a menu alone does not change API authorization.

Number and date are server-generated. A quotation-based creation needs its current approved version with any price source, an end date on or after the start date, unique inspectors (ignoring case), and at least one quotation item; the backend re-validates all of it.

The quotation list response carries no line items, so the create modal fetches the quotation detail (`GET /api/v1/marketing/quotations/{quotationId}`) to offer its active items for selection.

Validation: `npm.cmd run lint`, `npm.cmd run build`, and `node --test tests/work-order.test.mjs`. From the workspace root, `node --test tests/mfe-contract.test.mjs` checks requests against running local Swagger without mutating backend records.
