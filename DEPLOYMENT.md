# Deployment Vercel

Shell meneruskan `/api/*` ke API gateway melalui `akura-shell/vercel.json`.
Shell dan semua MFE menggunakan `/api/v1` secara default pada build produksi.
Request MFE yang dimuat di shell menggunakan domain shell, termasuk refresh cookie.

Di setiap project Vercel (shell dan MFE), hapus `VITE_API_BASE_URL` atau isi dengan
`/api/v1`, lalu build dan deploy ulang. MFE Marketing memakai
`VITE_MARKETING_BASE_URL` (dan `VITE_FIELDSERVICE_BASE_URL`); hapus atau isi
kedua env tersebut dengan `/api/v1` pada project Vercel Marketing. Nilai
environment eksplisit tetap mengesampingkan default. Prefix `/v1` tetap
diperlukan oleh endpoint backend.

Development menggunakan local microservice langsung untuk MFE Marketing:
`/marketing/*` ke Marketing lokal (`http://localhost:5003`), `/fieldservice/*` ke
Field Service lokal (`http://localhost:5005`), dan auth serta path cross-module
tetap ke gateway yang menerbitkan session cookie (Vercel gateway pada
`.env.development`). Shell tetap menggunakan `http://localhost:5000/api/v1` untuk
auth dan menu. Restart dev server setelah mengubah environment. URL frontend dan
remote MFE tetap menggunakan port development masing-masing. Jalankan backend
lokal pada port 5000 (gateway), 5003 (Marketing), dan 5005 (Field Service).
Untuk membuka MFE secara standalone atau menjalankan preview build produksi,
origin tersebut juga memerlukan proxy `/api`, atau build dengan
`VITE_MARKETING_BASE_URL` dan `VITE_FIELDSERVICE_BASE_URL` yang sesuai.
