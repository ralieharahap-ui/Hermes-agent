import type { SkillDefinition, ToolResult } from "../types/index.js";
import {
  searchFiles,
  listDirectory,
  getFileInfo,
  findRecentFiles,
  readFilePreview,
} from "./file-search.js";
import {
  openFile,
  openFileLocation,
  copyFile,
  moveFile,
  getDeviceInfo,
  getDiskUsage,
} from "./file-operations.js";

export const deviceAccessSkill: SkillDefinition = {
  name: "device-access",
  description:
    "Mengakses file dan informasi device pengguna — mencari file, membuka dokumen, melihat isi folder, dan informasi sistem.",
  version: "0.1.0",
  tools: [
    {
      name: "search_files",
      description:
        'Mencari file di device berdasarkan nama, tipe, atau kata kunci. Mendukung alias tipe: "excel", "word", "pdf", "image", "video", "audio", dll.',
      parameters: [
        { name: "query", type: "string", description: "Kata kunci pencarian (nama file atau topik)", required: true },
        { name: "directory", type: "string", description: "Direktori spesifik untuk pencarian (opsional, default: semua folder umum)", required: false },
        { name: "extensions", type: "string[]", description: 'Filter ekstensi file atau alias tipe, misal: ["excel"], ["pdf", "docx"], [".xlsx"]', required: false },
        { name: "maxResults", type: "number", description: "Jumlah maksimal hasil (default: 20)", required: false, default: 20 },
        { name: "recursive", type: "boolean", description: "Cari di subfolder (default: true)", required: false, default: true },
        { name: "sortBy", type: "string", description: "Urutkan berdasarkan: name, modified, size, relevance", required: false, default: "relevance", enum: ["name", "modified", "size", "relevance"] },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await searchFiles({
            query: params.query as string,
            directory: params.directory as string | undefined,
            extensions: params.extensions as string[] | undefined,
            maxResults: params.maxResults as number | undefined,
            recursive: params.recursive as boolean | undefined,
            sortBy: params.sortBy as "name" | "modified" | "size" | "relevance" | undefined,
          });
          return { success: true, data: result };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "list_directory",
      description: "Menampilkan isi sebuah folder/direktori.",
      parameters: [
        { name: "path", type: "string", description: "Path folder yang ingin dilihat", required: true },
        { name: "showHidden", type: "boolean", description: "Tampilkan file tersembunyi (default: false)", required: false, default: false },
        { name: "sortBy", type: "string", description: "Urutkan: name, modified, size", required: false, default: "name", enum: ["name", "modified", "size"] },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await listDirectory(params.path as string, {
            showHidden: params.showHidden as boolean | undefined,
            sortBy: params.sortBy as "name" | "modified" | "size" | undefined,
          });
          return { success: true, data: result };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "get_file_info",
      description: "Mendapatkan informasi detail sebuah file (ukuran, tanggal, tipe, dll).",
      parameters: [
        { name: "path", type: "string", description: "Path file", required: true },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await getFileInfo(params.path as string);
          return { success: true, data: result };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "find_recent_files",
      description: "Mencari file yang baru saja dimodifikasi.",
      parameters: [
        { name: "directory", type: "string", description: "Direktori pencarian (opsional)", required: false },
        { name: "extensions", type: "string[]", description: 'Filter tipe file, misal: ["excel"], ["pdf"]', required: false },
        { name: "hours", type: "number", description: "Rentang waktu dalam jam (default: 48)", required: false, default: 48 },
        { name: "maxResults", type: "number", description: "Jumlah maksimal hasil (default: 20)", required: false, default: 20 },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await findRecentFiles({
            directory: params.directory as string | undefined,
            extensions: params.extensions as string[] | undefined,
            hours: params.hours as number | undefined,
            maxResults: params.maxResults as number | undefined,
          });
          return { success: true, data: result };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "read_file_preview",
      description: "Membaca preview isi file teks (txt, csv, log, md, json, dll).",
      parameters: [
        { name: "path", type: "string", description: "Path file", required: true },
        { name: "maxLines", type: "number", description: "Jumlah baris maksimal (default: 50)", required: false, default: 50 },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await readFilePreview(params.path as string, {
            maxLines: params.maxLines as number | undefined,
          });
          return { success: true, data: result };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "open_file",
      description: "Membuka file menggunakan aplikasi default di device.",
      parameters: [
        { name: "path", type: "string", description: "Path file yang ingin dibuka", required: true },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await openFile(params.path as string);
          return { success: result.success, data: result.message, error: result.success ? undefined : result.message };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "open_file_location",
      description: "Membuka folder tempat file berada di file explorer.",
      parameters: [
        { name: "path", type: "string", description: "Path file atau folder", required: true },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await openFileLocation(params.path as string);
          return { success: result.success, data: result.message, error: result.success ? undefined : result.message };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "copy_file",
      description: "Menyalin file ke lokasi baru.",
      parameters: [
        { name: "source", type: "string", description: "Path file sumber", required: true },
        { name: "destination", type: "string", description: "Path tujuan", required: true },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await copyFile(params.source as string, params.destination as string);
          return { success: true, data: result };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "move_file",
      description: "Memindahkan file ke lokasi baru.",
      parameters: [
        { name: "source", type: "string", description: "Path file sumber", required: true },
        { name: "destination", type: "string", description: "Path tujuan", required: true },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await moveFile(params.source as string, params.destination as string);
          return { success: true, data: result };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "device_info",
      description: "Mendapatkan informasi device: hostname, OS, memori, CPU, dll.",
      parameters: [],
      handler: async (): Promise<ToolResult> => {
        try {
          const result = await getDeviceInfo();
          return { success: true, data: result };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "disk_usage",
      description: "Melihat penggunaan disk/storage di device.",
      parameters: [],
      handler: async (): Promise<ToolResult> => {
        try {
          const result = await getDiskUsage();
          return { success: true, data: result };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
  ],
};

export {
  searchFiles,
  listDirectory,
  getFileInfo,
  findRecentFiles,
  readFilePreview,
} from "./file-search.js";

export {
  openFile,
  openFileLocation,
  copyFile,
  moveFile,
  getDeviceInfo,
  getDiskUsage,
} from "./file-operations.js";
