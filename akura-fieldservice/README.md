# Akura Field Service

Read-only work order MFE using the same global control adapters, button tooltips, modal motion, cards, and responsive tables as Marketing. Pages import UI controls from `src/components/global`.

```powershell
npm.cmd ci
npm.cmd run dev
```

Remote runs on `http://localhost:4177/remoteEntry.js` and exposes `akuraFieldService/FieldServiceApp`. Start Shell as well; opening this application's standalone URL redirects to Shell.

- Browser route: `/field-service/work-orders` (list, search, status/revocation filters, and detail).
- API route: `/api/v1/fieldservice/work-orders` (GET only).
- No create/update/delete service methods or pages are provided by this MFE.
- Backend access still requires an active ADMIN/APP_MANAGER or FIELD_SERVICE user with an assigned branch.

Shell registers `field-service` in the same menu-driven MFE route mapping as other modules. Configure the backend menu group `field-service` with item `work-orders`; sidebar URLs are built directly from these keys. The MFE resolves `/field-service/work-orders` to the read-only Work Order page, regardless of user section. Marketing and legacy paths do not resolve to Work Orders. Creation routes are not exposed. No menu records are created automatically.

Shell configuration: `AKURA_FIELDSERVICE_REMOTE_URL=http://localhost:4177/remoteEntry.js`. Restart the Shell dev server after adding the remote.

Run `npm.cmd run lint`, `npm.cmd test`, and `npm.cmd run build` for verification.
