# Hermes Agent

AI Desktop Agent dengan kemampuan mengakses device pengguna — mencari file, membuka dokumen, dan mengelola file system.

## Arsitektur

```
src/
├── core/
│   └── skill-registry.ts    # Registry & executor untuk semua skills
├── skills/
│   ├── types/
│   │   └── index.ts          # Type definitions (Skill, Tool, FileInfo, dll)
│   └── device-access/
│       ├── index.ts           # Skill definition & tool registrations
│       ├── file-search.ts     # Pencarian file, list directory, preview
│       ├── file-operations.ts # Open, copy, move, device info
│       └── file-search.test.ts
├── utils/
│   └── format.ts             # Formatting helpers (file size, date, extensions)
└── index.ts                   # Entry point & exports
```

## Skill: Device Access

### Tools

| Tool | Deskripsi |
|------|-----------|
| `search_files` | Mencari file berdasarkan nama/kata kunci + filter tipe |
| `list_directory` | Menampilkan isi folder |
| `get_file_info` | Detail metadata file |
| `find_recent_files` | File yang baru dimodifikasi |
| `read_file_preview` | Preview isi file teks |
| `open_file` | Buka file dengan app default |
| `open_file_location` | Buka folder di file explorer |
| `copy_file` | Salin file |
| `move_file` | Pindahkan file |
| `device_info` | Info OS, CPU, memori |
| `disk_usage` | Status penggunaan storage |

### Contoh Penggunaan

```typescript
import { createHermesAgent } from "hermes-agent";

const agent = createHermesAgent();

// Cari file Excel rekapitulasi pengiriman
const result = await agent.executeTool("search_files", {
  query: "rekapitulasi pengiriman",
  extensions: ["excel"],
});

// Buka file yang ditemukan
if (result.success && result.data) {
  const { files } = result.data as { files: Array<{ path: string }> };
  if (files.length > 0) {
    await agent.executeTool("open_file", { path: files[0].path });
  }
}
```

## Setup

```bash
npm install
npm run build
npm test
```

## License

MIT
