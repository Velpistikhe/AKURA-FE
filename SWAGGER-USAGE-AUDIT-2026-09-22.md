# Audit pemakaian Swagger oleh seluruh MFE — 22 September 2026

## Pemeriksaan terbaru — 23 September 2026, 07:42 WIB

- GET `/api/v1/marketing/company-contract-prices/{contractPriceId}/history` sudah dipakai oleh fitur History baris harga kontrak yang ditambahkan setelah snapshot 22 September.
- PUT `/api/v1/marketing/items/sizes/{itemSizeId}/contract-prices` tidak ditemukan sebagai pemanggilan MFE. Add Contract Price masih memanggil POST pada path tersebut; edit menggunakan PATCH `/api/v1/marketing/items/contract-prices/{contractPriceId}`. Method HTTP yang berbeda dihitung sebagai operasi berbeda.
- Swagger terbaru justru tidak mencantumkan POST maupun PUT `/api/v1/marketing/items/sizes/{itemSizeId}/contract-prices`. Karena POST masih dipakai UI, terdapat satu ketidaksesuaian dokumentasi/request create harga kontrak yang perlu diselaraskan. Tidak dilakukan perubahan endpoint aplikasi dalam pemeriksaan ini.
- Audit terbaru: 129 operasi terdokumentasi, 113 memiliki pemanggil MFE, 16 tanpa integrasi (3 operasi work order dan 13 internal/operasional). JSON audit sudah diperbarui. Angka dan daftar pada bagian berikut merupakan snapshot historis.

## Contract price history — 23 September 2026

GET `/api/v1/marketing/company-contract-prices/{contractPriceId}/history` kini digunakan oleh tombol History pada setiap baris modal Contract Items and Prices. Data dimuat ketika history dibuka, memakai ID baris harga dan pagination server. Modal menampilkan versi, aksi, waktu, aktor, serta perubahan before/after yang dapat diperluas; tersedia keadaan kosong, error, dan Retry. Aksi baca tersedia tanpa izin edit harga. Respons terlambat diabaikan setelah modal ditutup atau halaman berubah.

Verifikasi: 84/84 tes otomatis lulus; lint Marketing dan production build lulus. Audit JSON sudah diperbarui. Swagger merujuk `CompanyContractPriceHistoryResponse` tetapi schema tersebut tidak ditemukan pada components gateway saat implementasi; bentuk response dikonfirmasi dari repository backend lokal. Pemeriksaan browser belum terverifikasi karena Chrome DevTools tidak merespons sebelum pengujian UI.

## Hasil terbaru — 23:00 WIB

Pemeriksaan ulang Swagger dan source Shell, App Manager, Marketing, Finance, serta Field Service menemukan **131 operasi** (pasangan method + path): **113 memiliki pemanggil MFE**, **18 tidak digunakan MFE**. Tidak ada lagi method service tanpa pemanggil UI atau request service yang tidak terdokumentasi.

Lima operasi bisnis tanpa integrasi MFE (prefix `/api/v1`):

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/fieldservice/work-orders/{id}/history` | History work order belum diintegrasikan. |
| PATCH | `/fieldservice/work-orders/{id}` | Update work order belum diintegrasikan. |
| DELETE | `/fieldservice/work-orders/{id}` | Penghapusan work order belum diintegrasikan. |
| PUT | `/marketing/items/sizes/{itemSizeId}/contract-prices` | Upsert tidak digunakan; UI memakai POST dan PATCH terpisah. |
| GET | `/marketing/company-contract-prices/{contractPriceId}/history` | History per baris harga kontrak belum diintegrasikan. |

13 operasi lainnya adalah endpoint internal/operasional: sinkronisasi pajak (1), referensi kontrak yang dikonsumsi backend Field Service (2), health gateway/service (6), informasi service (1), Swagger UI/JSON (2), dan JWKS (1). Daftar path lengkap tersedia dalam tabel internal/operasional di bawah serta `tests/swagger-usage-audit.json`.

GET dan DELETE `/api/v1/marketing/items/sizes/{itemSizeId}/price` sudah tidak ada pada Swagger maupun route backend lokal. Method tanpa pemanggil UI `itemService.getPrice` dan `itemService.removePrice` telah dihapus pada perubahan sebelumnya. Verifikasi setelah penghapusan: **83/83 tes lulus** dan lint Marketing lulus. POST createPrice serta PATCH updatePrice masih tersedia.

Audit ini berdasarkan source, bukan telemetry pemakaian pengguna. Tidak digunakan MFE tidak berarti endpoint tidak digunakan backend atau harus dihapus. Bagian berikut adalah riwayat snapshot sebelumnya, bukan status terkini.

## Pengujian ulang — 22:54 WIB

Hasil terbaru menggantikan status snapshot 22:10 WIB di bawah:

- Lint kelima aplikasi lulus; **82/83 tes lulus**.
- Endpoint harga quotation `/api/v1/marketing/items/sizes/prices` tetap lulus.
- History company contract kini tercantum di Swagger; ketidaksesuaian sebelumnya sudah selesai.
- Tes `Marketing service methods use documented endpoints and HTTP methods` kini gagal pada **GET `/api/v1/marketing/items/sizes/{itemSizeId}/price`**, yang tidak lagi tercantum di Swagger.
- Audit lengkap juga menemukan **DELETE pada path yang sama** tidak tercantum. Tes gabungan berhenti pada GET terlebih dahulu, sehingga DELETE tidak dilaporkan sebagai kegagalan tes terpisah.
- Kedua method masih ada sebagai `itemService.getPrice` dan `itemService.removePrice`, tanpa pemanggil UI yang ditemukan. Belum dihapus dalam permintaan pengujian ulang ini.
- Swagger terbaru berisi **131 operasi**: 113 memiliki pemanggil dalam source MFE dan 18 tidak memiliki integrasi. Tidak ada lagi operasi terdokumentasi yang hanya berada pada service tanpa pemanggil UI; dua operasi tersebut sekarang masuk kategori tidak terdokumentasi.
- Output tes dan JSON audit sudah diperbarui. Tidak dilakukan perubahan kode aplikasi atau tes pada pengujian ulang ini.

## Snapshot sebelumnya — 22:10 WIB

Sumber: `http://localhost:5000/api-docs.json`, diperiksa pukul 22:10 WIB. Cakupan: Shell, App Manager, Marketing, Finance, dan Field Service.

Audit menghitung pasangan HTTP method + path, bukan hanya URL. Analisis memeriksa konstruksi request service, request langsung, dan pemanggil di source UI, termasuk service yang diteruskan lewat props dan aksi kontrak dinamis. Ini bukan telemetry penggunaan pengguna. Request bisnis tidak dikirim ke backend; hanya Swagger yang diambil melalui HTTP.

## Hasil terbaru

- 132 operasi didokumentasikan Swagger.
- 112 operasi memiliki pemanggil dalam source MFE.
- 18 operasi tidak memiliki integrasi dalam source MFE.
- 2 operasi hanya memiliki method service tanpa pemanggil UI.
- 1 operasi dipakai MFE tetapi tidak didokumentasikan Swagger: history company contract.
- `GET /api/v1/marketing/items/sizes/prices` sudah terdokumentasi; tes parameter companyId, exclude, page, dan limit lulus. Pemakai: `QuotationItemPicker.jsx`, saat Add Item pada create/update quotation.

## Endpoint bisnis yang tidak dipakai MFE

Semua path pada tabel ini memakai prefix `/api/v1`.

| Method | Path | Temuan |
| --- | --- | --- |
| GET | `/fieldservice/work-orders/{id}/history` | Belum ada integrasi history work order di MFE. |
| PATCH | `/fieldservice/work-orders/{id}` | Belum ada integrasi update work order; Field Service saat ini read-only. |
| DELETE | `/fieldservice/work-orders/{id}` | Belum ada integrasi penghapusan work order. |
| PUT | `/marketing/items/sizes/{itemSizeId}/contract-prices` | Upsert tidak dipakai. UI menggunakan POST create dan PATCH update harga kontrak secara terpisah. |
| GET | `/marketing/company-contract-prices/{contractPriceId}/history` | Belum ada integrasi history per baris harga kontrak. Berbeda dari history kontrak yang tesnya gagal. |
| GET | `/marketing/items/sizes/{itemSizeId}/price` | Ada `itemService.getPrice`, tetapi tidak ditemukan pemanggil UI. |
| DELETE | `/marketing/items/sizes/{itemSizeId}/price` | Ada `itemService.removePrice`, tetapi tidak ditemukan pemanggil UI. |

Tidak dipakai MFE tidak otomatis berarti endpoint perlu dihapus atau fitur wajib ditambahkan.

## Endpoint internal dan operasional yang tidak dipakai MFE

| Method | Path | Fungsi |
| --- | --- | --- |
| POST | `/api/v1/marketing/internal/taxes/events` | Sinkronisasi pajak antarservice. |
| GET | `/api/v1/marketing/company-contract-references/{companyId}` | Referensi kontrak untuk backend Field Service; pemanggil ditemukan pada `server/fieldservice-service/src/integrations/gateway.ts`. |
| GET | `/api/v1/marketing/contract-references/{contractId}` | Referensi kontrak untuk backend Field Service; pemanggil ditemukan pada file yang sama. |
| GET | `/health` | Health gateway. |
| GET | `/services` | Informasi service gateway. |
| GET | `/api-docs` | Dokumentasi API. |
| GET | `/api-docs.json` | Spesifikasi API; digunakan alat audit, bukan aplikasi MFE. |
| GET | `/api/v1/auth/health` | Health service. |
| GET | `/api/v1/app-manager/health` | Health service. |
| GET | `/api/v1/marketing/health` | Health service. |
| GET | `/api/v1/finance/health` | Health service. |
| GET | `/api/v1/fieldservice/health` | Health service. |
| GET | `/api/v1/auth/.well-known/jwks.json` | Kunci publik verifikasi token untuk konsumen backend. |

## Rincian kegagalan

Tes `Marketing service methods use documented endpoints and HTTP methods`, di `akura-marketing/tests/api-contract.test.mjs:192`, gagal saat memeriksa:

```text
GET /api/v1/marketing/company-contracts/{contractId}/history
AssertionError: Swagger must expose GET .../company-contracts/<UUID>/history
```

Alur UI: Company → tampilkan Contracts → aksi History pada kartu kontrak → `CompanyContractHistory` → `contractService.history(contract.id, { page, limit })`.

Request berasal dari `akura-marketing/src/services/contractService.js:7`; pemanggil berada pada `akura-marketing/src/modules/company/CompanyContractHistory.jsx:41`. Route backend masih terdaftar di `server/marketing-service/src/modules/contracts/contract.routes.ts:32`, tetapi path tersebut tidak ada di Swagger gateway terbaru. Jadi bukti yang ditemukan adalah dokumentasi tidak lengkap, bukan hasil HTTP 404 dari request berautentikasi. Perbaikan yang diperlukan: dokumentasikan GET history kontrak beserta parameter contractId, page, limit dan schema responsnya, lalu pastikan agregasi Swagger gateway memasukkannya. Backend tidak diubah dalam audit ini.

Audit juga menemukan tes bersama masih memanggil `companyService.remove`, padahal operasi tersebut sudah dihapus. `tests/mfe-contract.test.mjs` telah diperbaiki: company tidak memiliki remove, sementara penghapusan company staff tetap diuji. Kegagalan ini sudah selesai.

## Verifikasi dan artefak

Setelah perbaikan tes bersama: **82/83 tes lulus**, hanya history company contract gagal. Khusus file API contract Marketing: **32/33 lulus**. Lint kelima aplikasi lulus. Pengujian request/schema tidak membuktikan seluruh alur browser atau otorisasi backend.

```powershell
node tests/swagger-usage-audit.mjs
node --test --test-reporter=spec tests/mfe-contract.test.mjs akura-marketing/tests/*.test.mjs akura-finance/tests/*.test.mjs akura-fieldservice/tests/*.test.mjs
```

Inventaris lengkap beserta pemanggil: `tests/swagger-usage-audit.json`. Output pengujian: `tests/swagger-audit-test-results.txt`. Hasil adalah snapshot; jalankan ulang setelah Swagger berubah.
