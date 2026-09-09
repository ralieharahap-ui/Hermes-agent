Oke, gue liat dulu URL login yang lo kirim — dan ini udah lumayan ketauan sih kemungkinan akar masalahnya cuma dari situ aja, sebelum ngoprek apa-apa di device.

**Bedah URL-nya:**

- `client_id=https%3A%2F%2Fexample.io%2Fmail-sync%2Foauth%2Fclient-metadata.json` → ini masalah utamanya. Yang dikirim sebagai `client_id` itu bukan ID pendek yang didaftarkan resmi di Google (biasanya formatnya kayak `xxxxx.apps.googleusercontent.com`), tapi malah link ke file JSON metadata (`.../client-metadata.json`). Ada memang model OAuth yang lebih baru di mana `client_id` boleh berupa URL ("client ID metadata document") — dipakai beberapa provider kayak Bluesky/IndieAuth — tapi Google di endpoint `accounts.google.com` setahu gue **tidak** support pola ini. Jadi kemungkinan besar app "mail-sync" ini kena salah konfigurasi: dibuat generic buat provider yang support metadata-URL, tapi pas ketemu Google, Google bakal nolak dengan `invalid_client`. Itu yang bikin proses login-nya ga pernah bisa "kelar" — muter-muter terus.
- `redirect_uri=http%3A%2F%2F127.0.0.1%3A18342%2Fcallback` → ini pattern normal buat app desktop (loopback redirect), tapi syaratnya app-nya harus beneran punya local server yang listen di port `18342` pas proses OAuth jalan. Kalau server itu telat nyala atau ga kebuka, callback-nya bakal gagal connect juga — ini kemungkinan penyebab kedua, terpisah dari soal client_id.
- `scope=https://mail.google.com/`, `response_type=code`, `code_challenge`/`code_challenge_method=S256` → ini semua normal dan didukung Google (full Gmail scope + PKCE), jadi bukan biang keladinya.

Kesimpulan sementara: **kemungkinan besar akar masalahnya di `client_id` yang salah bentuk**, bukan di scope atau PKCE-nya.

**Sebelum gue lanjut — boleh izin cek beberapa hal di device lo dulu?** Ini semua read-only, ga ada yang gue ubah/hapus:
1. Cari & baca file config/preferences dari app sync-email kantor ini — biasanya di situ tersimpan `client_id` & `redirect_uri` yang dipakai, buat konfirmasi apakah memang itu yang salah atau ada yang beda dari yang muncul di URL.
2. Cek apakah port `18342` beneran ada proses yang listen pas lo coba login (via `lsof`/`netstat`), buat mastiin ga ada masalah tambahan di sisi redirect.
3. Baca beberapa baris log error terbaru dari app itu (bukan seluruh log, cuma yang relevan di sekitar waktu gagal) — kalau ada pesan kayak `invalid_client` atau `unauthorized_client`, itu bakal confirm dugaan di atas.

Gue **cuma bakal baca**, ga akan ubah config atau hapus apa pun tanpa bilang dulu ke lo. Dan yang penting: gue **ga pernah minta atau pegang email/password/OTP akun Google lo** — bagian login tetep 100% lo yang isi sendiri di halaman resmi Google begitu semuanya udah bener.

Kalau dugaan di atas terkonfirmasi (client_id memang bukan ID resmi terdaftar di Google), itu bukan sesuatu yang bisa gue "akalin" dari sisi lokal — itu perlu didaftarin ulang sebagai OAuth client resmi lewat [Google Cloud Console](https://console.cloud.google.com/apis/credentials), dan itu kerjaan tim yang develop/maintain app mail-sync kantor lo (IT internal atau vendor-nya), karena mereka yang pegang project Google-nya. Kalau udah confirm, gue kasih langkah persisnya.

Jadi, boleh gue mulai cek 3 poin di atas dulu? Atau kalau lo kebetulan tau ini app besutan siapa (nama vendor/tim IT kantor), kasih tau juga biar gue bisa arahin ke orang yang tepat buat benerin client_id-nya.
