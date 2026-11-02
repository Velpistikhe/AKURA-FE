# Akura Finance

MFE React/Ant Design/Vite dengan Module Federation di port **4176**. Expose: `akuraFinance/FinanceApp`.

## Menjalankan

```powershell
cd akura-finance
npm ci
npm run dev
```

Jalankan Shell pada port 4173. Port 4176 mengarahkan browser ke `/finance` pada Shell. Konfigurasi opsional tersedia di [.env.example](./.env.example). Shell memakai `AKURA_FINANCE_REMOTE_URL` (default `http://localhost:4176/remoteEntry.js`). Restart Shell setelah perubahan konfigurasi federation/environment.

## Menu

Sidebar Shell mengikuti API `my-menus`. Modul Finance menyediakan:

| Item key | Label | URL |
| --- | --- | --- |
| `finance_quotations` | Quotation | `/finance/finance_quotations` |
| `taxes` | Tax | `/referensi/taxes` |

Key `finance_quotations` berbeda dari Marketing karena menu item key unik secara global. Alias `/finance/quotations`, `/finance/quotation`, `/finance/taxes` dan `/finance/tax` tetap tersedia. Quotation hanya dapat dibaca.

Fitur Invoice dan Proforma Invoice telah dihapus, termasuk halaman, route dan alias, form purchase order, pemilih item, service API, serta model payload. URL lama menampilkan halaman tidak tersedia. Konfigurasi menu backend tetap dikelola melalui App Manager; MFE tidak mengubah record menu secara otomatis.

## Kontrak API

- Swagger lokal: `http://localhost:5000/api-docs.json`.
- Quotation memakai `GET /marketing/quotation-references` dan `GET /marketing/quotation-references/{quotationId}`, sesuai kepemilikan branch pengguna. Daftar dibatasi backend hingga 1000 quotation aktif berstatus approved dan dipaginasi di client.
- Pajak memakai service pajak yang ada, termasuk periode branch dan sinkronisasi. Hak akses dan version check tetap berlaku.
- MFE tidak lagi memanggil endpoint invoice/proforma maupun endpoint Marketing untuk pemilihan company/item pada form invoice. Penghapusan integrasi MFE tidak menghapus endpoint backend.

## Verifikasi

Dari root workspace:

```powershell
node --test tests/finance-contract.test.mjs tests/invoice-removal.test.mjs
```

Contract test membaca Swagger lokal dan memalsukan request bisnis tanpa mengubah data backend. Jalankan lint pada file yang berubah dan `npm.cmd run build` dari direktori MFE terkait.
