
SANCUWEK CEO V3

Fitur:
- Tampilan donate lebih modern
- QRIS
- Input ID FF, nickname, nominal, catatan
- Upload bukti transfer
- Dashboard admin
- Statistik total data dan nominal
- Status Menunggu / Dicek / Selesai
- Hapus data
- Ubah password admin langsung dari dashboard

CARA PASANG DI TERMUX

1. Ekstrak ZIP di Download.
2. Pindahkan folder ke home Termux:
   cd ~
   cp -r ~/storage/downloads/sancuwek-ceo ~/
   cd ~/sancuwek-ceo

3. Install:
   npm install

4. Jalankan:
   npm start

5. Buka:
   Donate: http://localhost:3000
   Admin:  http://localhost:3000/admin.html

PASSWORD AWAL:
admin123

Setelah masuk admin, scroll ke bagian "Ubah password admin".
Password baru akan tersimpan di data/config.json, jadi tidak perlu mengetik ADMIN_PASSWORD setiap kali npm start.

GANTI QRIS:
- Simpan gambar QRIS sebagai public/qris.png
- Edit public/index.html
- Ganti:
  /qris-placeholder.svg
  menjadi:
  /qris.png

CATATAN:
Untuk dipakai online secara publik, sebaiknya nanti gunakan database/storage eksternal.

PERUBAHAN V3:
- Nickname FF dihapus
- Fokus hanya ID FF + nominal + bukti transfer
- Ditambahkan teks: BAYWAN 11 · 5K WIN FB

FITUR BARU:
- QRIS bisa diganti langsung dari halaman admin.
- Login admin, buka bagian "Ubah QRIS", pilih gambar, lalu Simpan QRIS Baru.
- QRIS terbaru otomatis tampil di halaman utama.


SANCUWEK CEO V3
- Tampilan halaman utama didesain ulang.
- Halaman admin sekarang terkunci oleh login gate.
- Dashboard tidak terlihat sebelum password benar.
- Session admin disimpan hanya selama tab/browser session.
- Tombol logout ditambahkan.
- QRIS tetap bisa diganti dari admin.
- Password admin tetap bisa diubah dari admin.
- Dashboard, statistik, submission, QRIS, dan security ditata ulang.


SANCUWEK CEO V4
- Notifikasi pembayaran baru di dashboard admin.
- Admin mengecek data baru otomatis setiap 5 detik.
- Jika ada submission baru, data dashboard auto-refresh.
- Chrome dapat menampilkan notifikasi browser setelah izin diberikan.
- Ada bunyi notifikasi singkat.
- Notifikasi ini bekerja saat halaman admin masih terbuka/aktif di browser.


SANCUWEK CEO V5 — WEB PUSH
- Server memakai Web Push + VAPID.
- Admin dapat subscribe push notification dari tombol AKTIFKAN PUSH.
- Saat pembayaran baru masuk, server langsung mengirim push ke browser admin yang sudah subscribe.
- Service worker menangani notifikasi walau tab admin tidak sedang terbuka.
- Klik notifikasi akan membuka /admin.html.

PENTING:
- Browser harus memberi izin notifikasi.
- Push membutuhkan koneksi internet.
- Untuk penggunaan publik dari perangkat lain, website harus di-host dengan HTTPS.
- localhost dianggap secure context untuk testing pada perangkat yang menjalankan server, tetapi agar pengguna lain bisa membuka web dan agar push stabil, deploy ke domain HTTPS.


V5 FIXED
- Tombol AKTIFKAN PUSH sekarang selalu terlihat di HP.
- Tombol dipindahkan juga ke kartu Notifikasi Pembayaran.
- Status tombol sinkron dengan izin push browser.

PUSH FIX: memperbaiki error Illegal constructor Notification pada Chrome Android.

SANCUWEK CEO V6
- Push notification diperkuat.
- Ditambahkan getar notifikasi.
- Ditambahkan require interaction.
- Ditambahkan tombol TEST SUARA di admin.
- Suara tetap mengikuti pengaturan notifikasi Android/Chrome.

SANCUWEK CEO V7
- Ditambah suara realtime dari browser admin.
- Tombol AKTIFKAN SUARA untuk mengizinkan audio browser.
- Pembayaran baru saat dashboard terbuka akan memutar suara.
- Push notification tetap dipertahankan.

SANCUWEK CEO V8
- Realtime payment checker.
- Dashboard otomatis mengecek pembayaran baru setiap 3 detik.
- Suara browser diputar saat transaksi baru masuk.
- Popup pembayaran baru ditampilkan.
- Tidak perlu refresh manual.

SANCUWEK CEO V9
- Tambah socket realtime.
- Pembayaran baru dikirim langsung ke dashboard admin.
- Popup alarm dengan tombol TERIMA.
- Getar perangkat saat transaksi baru masuk.

SANCUWEK CEO V10
- Full realtime payment flow preparation.
- Admin dan user memakai koneksi realtime Socket.IO.
- Status transaksi dapat dikembangkan tanpa refresh.
- Pembayaran baru dapat dikirim langsung ke dashboard admin.
