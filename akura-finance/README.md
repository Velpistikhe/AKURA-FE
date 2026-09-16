# Akura Finance

MFE React/Ant Design/Vite dengan Module Federation di port **4176**. Expose: `akuraFinance/FinanceApp`.

## Menjalankan

```powershell
cd akura-finance
npm ci
npm run dev
```

Jalankan shell pada port 4173. Port 4176 mengarahkan browser ke `/finance` pada shell. Konfigurasi opsional tersedia di `.env.example`. Shell memakai `AKURA_FINANCE_REMOTE_URL` (default `http://localhost:4176/remoteEntry.js`). Restart shell setelah perubahan konfigurasi federation/environment.

## Menu

Sidebar dan route shell mengikuti API `my-menus`. Buat menu induk `finance`, label `Finance`, `hasItem: true` melalui App Manager, beserta item dan Menu Access sesuai role/section:

| Item key | Label | URL |
| --- | --- | --- |
| `finance_quotations` | Quotation | `/finance/finance_quotations` |
| `proforma_invoices` | Proforma Invoice | `/finance/proforma_invoices` |
| `invoices` | Invoice | `/finance/invoices` |

Key `finance_quotations` sengaja berbeda dari Marketing karena menu item key unik secara global. Alias `/finance/quotations`, `/finance/proforma-invoice`, dan `/finance/invoice` didukung. Route create/edit Quotation tidak tersedia. Implementasi frontend ini tidak mengubah data menu atau permission backend.

## Status API

- Quotation: hanya GET `/marketing/quotations` dan GET `/marketing/quotations/{quotationId}`. Mendukung daftar, pagination, detail, error/retry, pembatalan request, dan animasi penutupan modal. Tidak ada create/update/delete.
- API Marketing saat ini membatasi akses ke ADMIN, APP_MANAGER, atau section MARKETING. USER/FINANCE memerlukan akses baca backend atau endpoint Finance khusus. HTTP 403 ditampilkan sebagai penjelasan akses.
- Proforma Invoice dan Invoice: halaman dan route tersedia. Swagger lokal saat implementasi hanya memiliki GET `/finance/health`, sehingga integrasi data dan tindakan dokumen menunggu kontrak API. Tidak ada transaksi, data contoh, atau pemanggilan endpoint yang belum didokumentasikan.

## Verifikasi

```powershell
npm run lint
npm test
npm run build
```
