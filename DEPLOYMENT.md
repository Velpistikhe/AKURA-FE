# Deployment Vercel

Shell meneruskan `/api/*` ke API gateway melalui `akura-shell/vercel.json`.
Shell dan semua MFE menggunakan `/api/v1` secara default pada build produksi.
Request MFE yang dimuat di shell menggunakan domain shell, termasuk refresh cookie.

Di setiap project Vercel (shell dan MFE), hapus `VITE_API_BASE_URL` atau isi dengan
`/api/v1`, lalu build dan deploy ulang. Nilai environment eksplisit tetap
mengesampingkan default. Prefix `/v1` tetap diperlukan oleh endpoint backend.

Development tetap menggunakan `http://localhost:5000/api/v1` secara default.
Untuk membuka MFE secara standalone atau menjalankan preview build produksi,
origin tersebut juga memerlukan proxy `/api`, atau build dengan
`VITE_API_BASE_URL` yang sesuai.
