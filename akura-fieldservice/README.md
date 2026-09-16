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

Shell accepts the backend menu group `field-service` (also `fieldservice`) with item `work-orders`. The existing Marketing menu group with item `work-orders` also links to `/field-service/work-orders`. FIELD_SERVICE users receive this read-only MFE; other users with Marketing work-order menu access receive the Marketing module, including creation. Users with only Field Service menu access receive this read-only MFE regardless of role. No menu records are created automatically.

Shell configuration: `AKURA_FIELDSERVICE_REMOTE_URL=http://localhost:4177/remoteEntry.js`. Restart the Shell dev server after adding the remote.

Run `npm.cmd run lint`, `npm.cmd test`, and `npm.cmd run build` for verification.
