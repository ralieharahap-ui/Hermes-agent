---
name: mail-auth-doctor
description: Mendiagnosis dan membantu menyelesaikan masalah autentikasi (OAuth/login) pada akun mail yang gagal terus-menerus — popup OAuth yang muncul berulang, error "authentication failed" di IMAP/SMTP, atau URL authorize yang error karena client_id/redirect_uri/scope salah. WAJIB gunakan skill ini setiap kali user melaporkan: akun email/mail client tidak bisa login, OAuth popup mail yang gagal atau muncul terus, error auth pada Gmail/Outlook/Office365/Yahoo/IMAP custom, atau membagikan URL yang mengandung "oauth2/authorize", "client_id", "redirect_uri" terkait integrasi mail. Skill ini juga relevan untuk masalah OAuth serupa pada layanan lain (calendar, contacts, API pihak ketiga) karena metode diagnosisnya sama. Selalu utamakan skill ini daripada menjawab langsung dari ingatan soal error OAuth, karena setiap provider punya pola kegagalan yang berbeda dan harus dicek satu per satu dari URL/log yang sebenarnya.
---

# Mail Auth Doctor

Skill ini menuntun proses diagnosis dan perbaikan masalah autentikasi akun mail secara aman: **mendeteksi** akar masalah dari URL/error/log, **membaca** konfigurasi device secara read-only untuk konfirmasi, **meminta izin eksplisit** sebelum bertindak, lalu **menyerahkan proses login sesungguhnya ke user** — Claude tidak pernah menyentuh password akun.

## Prinsip Keamanan (baca dulu sebelum mulai)

Kenapa alur ini dirancang begini, bukan sekadar aturan kaku:

- **Claude tidak pernah meminta, menerima, mengetik, atau menyimpan password/OTP akun mail user.** Kredensial akun adalah rahasia antara user dan provider — kalau Claude ikut memegangnya, itu justru membuka celah keamanan baru yang seharusnya dihindari, bukan diselesaikan. Bagian "login" selalu diserahkan ke user: Claude cukup membuka halaman resmi yang benar, user yang mengisi sendiri.
- **Setiap aksi yang terlihat (buka browser) atau mengubah state (edit config, restart proses, hapus cache token) butuh konfirmasi eksplisit dulu.** User harus tahu persis apa yang akan terjadi sebelum itu terjadi — terutama karena membuka browser ke halaman login bisa mengganggu sesi yang sedang berjalan.
- **Perbaikan yang butuh ubah pengaturan di sisi provider (misal registrasi OAuth app) tidak dieksekusi otomatis** — itu keputusan yang harus diambil sadar oleh user/admin, cukup dijelaskan langkah persisnya dengan link resmi.

## Alur Kerja

### 1. Deteksi Masalah

Kumpulkan bukti dulu sebelum menyimpulkan apa pun — jangan menebak dari nama providernya saja.

**Kalau user membagikan URL authorize/callback yang error**, urai parameternya:

| Parameter | Yang perlu dicek |
|---|---|
| `client_id` | Apakah ini ID terdaftar resmi (string/hash pendek), atau malah URL/metadata JSON? Provider seperti Google/Microsoft/Yahoo tidak menerima `client_id` berupa URL kecuali mereka eksplisit mendukung Dynamic Client Registration (jarang). |
| `redirect_uri` | Apakah mengarah ke `localhost`/`127.0.0.1` dengan port tertentu? Kalau iya, harus ada server lokal yang benar-benar listen di port itu saat auth flow jalan — cek dengan `lsof -i :<port>` atau `netstat -an | grep <port>`. |
| `scope` | Apakah scope yang diminta cocok dengan yang didaftarkan di app OAuth tsb? Scope tak dikenal bisa bikin consent screen gagal. |
| `response_type`, `code_challenge_method` | Konfirmasi provider mendukung PKCE (`S256`) kalau parameter ini ada — sebagian besar provider modern iya, tapi API lama mungkin belum. |
| `resource` | Parameter non-standar (dipakai beberapa integrasi MCP/API) — cek apakah provider mail yang bersangkutan benar-benar mendukung parameter ini. |

**Kalau user melaporkan gejala tanpa URL** (misal "Outlook saya minta login terus", "IMAP auth failed"), tanyakan atau cari lewat log/observasi:
- Kapan terakhir kali login berhasil? Token OAuth expired/revoked adalah penyebab paling umum.
- Apakah baru aktifkan MFA/2FA? Ini sering memblokir auth otomatis yang lama.
- Apakah provider mewajibkan App Password (Gmail dengan 2FA, Yahoo) karena "less secure app access" diblokir?
- Apakah setting IMAP/SMTP (host, port, SSL/TLS) berubah setelah update client?

### 2. Baca Diagnostik Device (read-only, minta izin dulu)

Sebelum membaca apa pun, **jelaskan ke user file/proses apa yang akan dibaca dan kenapa**, baru jalankan. Gunakan tool yang tersedia (Read, Grep, Bash) untuk:
- Menemukan dan membaca file konfigurasi mail client (profil Thunderbird, config Outlook, `.muttrc`/`mbsync`, cache token OAuth) — cari nilai `client_id`, `redirect_uri`, timestamp token terakhir refresh.
- Mengecek proses/port terkait (apakah callback server lokal benar-benar berjalan, apakah ada proses mail client yang nge-hang).
- Membaca log error terbaru (bukan seluruh log — ambil beberapa baris relevan di sekitar waktu error terjadi).

Ini semua bersifat **read-only** — jangan ubah apa pun di tahap ini.

### 3. Konfirmasi Sebelum Bertindak

Setelah akar masalah cukup jelas, **jelaskan temuan ke user dalam bahasa yang mudah dipahami** (bukan dump JSON mentah), lalu minta konfirmasi eksplisit sebelum:
- Membuka browser ke halaman login/consent.
- Mengubah file konfigurasi (misal memperbaiki `redirect_uri`/port yang salah).
- Menghapus cache token yang rusak/expired.
- Merestart proses mail client atau callback server lokal.

Jangan lanjut ke langkah berikutnya tanpa persetujuan ini — walau solusinya sudah kelihatan jelas.

### 4. Serahkan Login ke User

Setelah dapat izin, buka **URL login/consent resmi yang sudah diverifikasi benar** (bukan URL yang tadinya error — perbaiki dulu parameter yang bisa diperbaiki di sisi lokal, misal port `redirect_uri` yang seharusnya cocok dengan server lokal yang sudah dibetulkan).

- Beri tahu user apa yang akan mereka lihat di layar (halaman login provider, lalu consent screen dengan daftar scope yang diminta).
- User yang mengetik email, password, dan menyelesaikan MFA/OTP sendiri.
- Setelah user konfirmasi login selesai, verifikasi tanda keberhasilan yang bisa diobservasi (misal file token baru muncul/ter-update, proses callback server menerima request, atau user melaporkan langsung berhasil).

### 5. Selesaikan Akar Masalah

- **Kalau masalahnya bisa diperbaiki di sisi lokal** (port `redirect_uri` salah, server callback belum dijalankan, cache token korup, setting IMAP/SMTP salah) — perbaiki langsung (dengan izin dari langkah 3), lalu jelaskan apa yang diubah.
- **Kalau masalahnya butuh perubahan di sisi provider** (misal `client_id` bukan ID terdaftar karena app belum didaftarkan resmi di provider tsb) — **jangan coba akali otomatis**. Jelaskan dengan tepat langkah yang harus user lakukan, termasuk link resmi developer console provider terkait (contoh: Google Cloud Console untuk Gmail API, Azure AD App Registration untuk Outlook/Office365, Yahoo Developer Network untuk Yahoo Mail).

### 6. Verifikasi Hasil

Tes ulang koneksi (kirim/terima email test, cek status sync, atau re-run auth check) dan laporkan hasil akhir secara eksplisit: berhasil atau masih ada yang perlu ditindaklanjuti, dan oleh siapa (user sendiri vs butuh admin/developer).

## Pola Kegagalan Umum & Solusi Cepat

| Gejala | Kemungkinan Akar Masalah | Solusi |
|---|---|---|
| Popup OAuth muncul berulang tanpa pernah sukses | `client_id` bukan ID resmi terdaftar (misal berupa URL metadata) | Daftarkan app di developer console provider, dapatkan `client_id` resmi |
| Browser redirect ke `localhost:PORT/callback` lalu gagal connect | Tidak ada server lokal yang listen di port tsb | Cek `lsof -i :PORT`, jalankan/perbaiki server callback sebelum ulangi auth |
| "Authentication failed" tiba-tiba setelah lama normal | Token OAuth expired/revoked, atau password akun diganti | Hapus token lama, ulangi login penuh (user isi sendiri) |
| Auth gagal setelah aktifkan 2FA | Client lama pakai password biasa, provider sekarang wajib App Password/OAuth | Buat App Password baru di provider, atau update client ke OAuth |
| Consent screen menolak scope tertentu | Scope diminta tidak cocok dengan yang terdaftar di app OAuth | Sesuaikan scope di kode/config app dengan yang didaftarkan di provider |

## Yang TIDAK Dilakukan Skill Ini

- Tidak pernah meminta atau mengetik password/OTP user.
- Tidak menyimpan token/credential di tempat yang tidak diminta user secara eksplisit (misal hardcode ke file, commit ke git).
- Tidak mengubah pengaturan OAuth di sisi provider (registrasi app, scope resmi) tanpa user yang login dan melakukannya sendiri di dashboard provider.
- Tidak melanjutkan ke langkah membuka browser atau mengubah config tanpa konfirmasi eksplisit di langkah 3.
