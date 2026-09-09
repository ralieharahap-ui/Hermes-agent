# Browser Access Skill

Skill ini memungkinkan Hermes Desktop Agent mengakses web — fetching halaman, scraping konten, dan pencarian.

## Kapabilitas

### Fetch Halaman (`fetch_page`)
Mengambil HTML mentah dari URL beserta status, headers, dan waktu muat.

### Baca Halaman (`read_page`)
Membaca dan mengekstrak konten utama halaman web — judul, deskripsi, teks artikel.

**Contoh:**
- "Bacakan artikel dari kompas.com tentang ekonomi" → `read_page({ url: "https://kompas.com/..." })`

### Ekstrak Link (`extract_links`)
Mendapatkan semua link dari halaman, dengan identifikasi internal vs eksternal.

### Ekstrak Gambar (`extract_images`)
Mendapatkan semua gambar beserta alt text dan dimensi.

### Scraping (`scrape`)
Mengambil elemen spesifik menggunakan CSS selector.

**Contoh:**
- "Ambil semua harga produk" → `scrape({ url: "...", selector: ".product .price" })`
- "Ambil daftar berita" → `scrape({ url: "...", selector: "article h2" })`

### Ekstrak Tabel (`extract_tables`)
Mengambil data tabel sebagai struktur headers + rows.

### Pencarian Web (`search_web`)
Mencari di web dan mengembalikan hasil (judul, URL, snippet).

### Multi-Scrape (`multi_scrape`)
Scraping beberapa URL sekaligus secara paralel (maks 10 URL).

## Platform Support
Berjalan di semua platform (Node.js native fetch + cheerio parsing).
