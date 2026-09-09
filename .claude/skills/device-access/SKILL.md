# Device Access Skill

Skill ini memungkinkan Hermes Desktop Agent mengakses file dan informasi device pengguna.

## Kapabilitas

### Pencarian File (`search_files`)
Mencari file berdasarkan nama, kata kunci, atau tipe di seluruh device.
- Mendukung alias tipe: `excel`, `word`, `pdf`, `image`, `video`, `audio`
- Pencarian rekursif di folder umum (Documents, Desktop, Downloads)
- Ranking berdasarkan relevansi nama + waktu modifikasi

**Contoh penggunaan:**
- "Carikan file excel rekapitulasi pengiriman" → `search_files({ query: "rekapitulasi pengiriman", extensions: ["excel"] })`
- "Cari file PDF invoice" → `search_files({ query: "invoice", extensions: ["pdf"] })`
- "Cari semua gambar di Desktop" → `search_files({ query: "*", directory: "~/Desktop", extensions: ["image"] })`

### Daftar Isi Folder (`list_directory`)
Menampilkan semua file dan subfolder dalam sebuah direktori.

### Info File (`get_file_info`)
Mendapatkan detail file: ukuran, tanggal dibuat/diubah, tipe MIME.

### File Terbaru (`find_recent_files`)
Mencari file yang baru dimodifikasi dalam rentang waktu tertentu.

### Preview File (`read_file_preview`)
Membaca isi file teks (CSV, TXT, JSON, MD, LOG) secara partial.

### Buka File (`open_file`)
Membuka file dengan aplikasi default di OS pengguna.

### Buka Lokasi (`open_file_location`)
Membuka folder tempat file berada di file explorer.

### Salin / Pindah File (`copy_file`, `move_file`)
Operasi copy dan move file antar lokasi.

### Info Device (`device_info`)
Informasi OS, hostname, CPU, memori, username.

### Penggunaan Disk (`disk_usage`)
Status penggunaan storage di semua drive/mount.

## Tipe File yang Didukung (Alias)

| Alias       | Ekstensi                                    |
|-------------|---------------------------------------------|
| `excel`     | .xlsx, .xls, .xlsm, .xlsb, .csv            |
| `word`      | .docx, .doc, .docm, .rtf                    |
| `powerpoint`| .pptx, .ppt, .pptm                          |
| `pdf`       | .pdf                                        |
| `image`     | .jpg, .jpeg, .png, .gif, .bmp, .svg, .webp  |
| `video`     | .mp4, .avi, .mov, .mkv, .wmv, .flv, .webm   |
| `audio`     | .mp3, .wav, .flac, .aac, .ogg, .wma, .m4a   |
| `text`      | .txt, .md, .log, .ini, .cfg, .conf          |
| `code`      | .ts, .js, .py, .java, .cpp, .c, .go, .rs    |
| `archive`   | .zip, .rar, .7z, .tar, .gz, .bz2            |

## Platform Support
- Windows (cmd: `start`)
- macOS (cmd: `open`)
- Linux (cmd: `xdg-open`)
