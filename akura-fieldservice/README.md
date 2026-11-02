# Akura Field Service

Work order MFE using the same global control adapters, button tooltips, modal motion, cards, and responsive tables as Marketing. Pages import UI controls from `src/components/global`.

```powershell
npm.cmd ci
npm.cmd run dev
```

Remote runs on `http://localhost:4177/remoteEntry.js` and exposes `akuraFieldService/FieldServiceApp`. Start Shell as well; opening this application's standalone URL redirects to Shell.

- Browser route: `/field-service/work-orders` (list, search, status/revocation filters, detail, and create).
- API route: `/api/v1/fieldservice/work-orders` (GET list, POST create, GET/PATCH/DELETE by id, POST `/{id}/start`, GET `/{id}/history`).
- Creation uses an approved quotation from `GET /api/v1/fieldservice/options/quotations` and its price-free lines from `GET /api/v1/fieldservice/options/quotations/{quotationId}`; inspectors come from `GET /api/v1/fieldservice/options/inspectors`. The create payload carries `quotationId`, `startDate`, `endDate`, `inspectors` (`{ userId, name }` pairs) and `items` (`itemSizeId` with the two quantities).
- Editing sends only `startDate`, `endDate`, `status`, `inspectors` and the current `version`. The backend rejects `status: IN_PROGRESS` with 400, so the edit form offers DRAFT, COMPLETED and CANCELED only; DRAFT to IN_PROGRESS happens through POST `/{id}/start`.
- Revoke (DELETE) is a soft delete that requires the current `version` and MARKETING section.
- Creating an invoice or proforma invoice from a **completed** quotation-backed work order uses the detail action (`CreateInvoiceAction.jsx`) and posts to `POST /api/v1/fieldservice/work-orders/invoices/from-quotation` with `quotationId`, `kind`, `dueDate`, `location`, `purchaseOrderNumber` and `purchaseOrderDate`. The UI shows the action only for section MARKETING in the same branch; Finance re-validates quotation approval and work order completion.
- Backend access requires an active ADMIN/APP_MANAGER or FIELD_SERVICE user with an assigned branch. Work order writes are limited to the MARKETING and FIELD_SERVICE sections; invoice creation from a work order follows the MARKETING-only policy above.

Shell registers `field-service` in the same menu-driven MFE route mapping as other modules. Configure the backend menu group `field-service` with item `work-orders`; sidebar URLs are built directly from these keys. The MFE resolves `/field-service/work-orders` to the Work Order page, regardless of user section. Marketing and legacy paths do not resolve to Work Orders. No menu records are created automatically.

Shell configuration: `AKURA_FIELDSERVICE_REMOTE_URL=http://localhost:4177/remoteEntry.js`. Restart the Shell dev server after adding the remote.

Run `npm.cmd run lint`, `npm.cmd test`, and `npm.cmd run build` for verification.
