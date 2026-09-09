Oke aku coba liat URL-nya dulu ya.

Jadi kalo dibedah, URL itu isinya kurang lebih:
- `client_id` = `https://example.io/mail-sync/oauth/client-metadata.json`
- `redirect_uri` = `http://127.0.0.1:18342/callback`
- `scope` = `https://mail.google.com/` (full access ke Gmail)
- pake PKCE (`code_challenge` + `S256`)

Nah yang paling mencurigakan buat gua itu `client_id`-nya. Normalnya, OAuth client_id punya Google itu formatnya string angka-huruf yang diakhiri `.apps.googleusercontent.com` (dikeluarin dari Google Cloud Console). Ini malah berupa **link ke file JSON** (`client-metadata.json`). Itu model "client ID metadata document" — konsep yang emang lagi didorong di draft standar OAuth terbaru, tapi setau gua **Google belum support** cara ini di endpoint `accounts.google.com`. Jadi kemungkinan besar itu penyebab loop gagalnya: Google nolak/nggak ngerti client_id-nya, browser kebuka, tapi prosesnya nggak pernah bisa selesai balik ke aplikasi → makanya muncul terus-terusan tiap buka app.

Kemungkinan lain (bisa jadi barengan):
1. **Scope-nya "sensitive"** — `https://mail.google.com/` itu scope penuh ke Gmail, Google biasanya makin ketat soal ini (perlu app yang udah diverifikasi/security assessment). Kalo app "mail-sync" ini belum verified di sisi Google, bisa mentok juga di sini.
2. **Port loopback ke-block** — redirect ke `127.0.0.1:18342`, kalo port itu kepake app lain atau diblok firewall/antivirus, callback-nya nggak bisa balik ke app meskipun login di Google-nya sukses.
3. Client credential expired/salah konfigurasi di sisi developer "mail-sync" itu sendiri.

Karena ini masalahnya ada di konfigurasi OAuth aplikasi "mail-sync" itu (bukan sesuatu yang bisa gua perbaiki dari sisi lo sebagai user biasa), yang bisa dicoba:
1. **Update aplikasinya** ke versi terbaru — kalo ini bug dari sisi client_id format, biasanya udah/lagi dibenerin developer-nya.
2. Cek apakah ada **issue/report** soal ini di GitHub/forum support aplikasi tsb (biasa nama app-nya keliatan dari domain `example.io/mail-sync`, googling "mail-sync oauth client-metadata google error" bisa nemu solusi resmi).
3. Coba **restart app + browser default**, sama pastiin **jam sistem lo bener** (jam yang salah suka bikin OAuth gagal aneh-aneh).
4. Cek nggak ada app lain yang lagi makan port `18342`, dan sementara matiin firewall/antivirus buat tes.
5. Kalo ini app internal kantor, kemungkinan besar perlu di-eskalasi ke **admin IT/dev yang bikin integrasi mail-sync**-nya, soalnya akar masalahnya ada di cara mereka daftarin OAuth client ke Google, bukan di laptop/akun lo.

Kalo lo mau, share nama aplikasi "mail-sync"-nya (yang ada di `example.io`) atau screenshot pesan error persis pas gagal — biar gua bisa bantu godok lebih spesifik lagi.
