import type { SkillDefinition, ToolResult } from "../types/index.js";
import {
  fetchPage,
  fetchAndExtract,
  extractContent,
  extractLinks,
  extractImages,
  scrapeElements,
  extractTables,
  searchGoogle,
} from "./web-fetch.js";

export const browserAccessSkill: SkillDefinition = {
  name: "browser-access",
  description:
    "Mengakses web — fetch halaman, scraping konten, ekstrak link/gambar/tabel, dan pencarian web.",
  version: "0.1.0",
  tools: [
    {
      name: "fetch_page",
      description:
        "Mengambil halaman web dan mengembalikan HTML mentah beserta metadata (status, headers, waktu muat).",
      parameters: [
        { name: "url", type: "string", description: "URL halaman web", required: true },
        { name: "timeout", type: "number", description: "Timeout dalam milidetik (default: 15000)", required: false, default: 15000 },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await fetchPage({
            url: params.url as string,
            timeout: params.timeout as number | undefined,
          });
          return { success: true, data: { ...result, html: result.html.slice(0, 50000) } };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "read_page",
      description:
        "Membaca halaman web dan mengekstrak konten teks utama (judul, deskripsi, teks artikel). Cocok untuk membaca artikel, berita, atau blog.",
      parameters: [
        { name: "url", type: "string", description: "URL halaman web", required: true },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const { page, content } = await fetchAndExtract(params.url as string);
          return {
            success: true,
            data: {
              status: page.status,
              loadTimeMs: page.loadTimeMs,
              ...content,
              text: content.text.slice(0, 30000),
            },
          };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "extract_links",
      description: "Mengekstrak semua link dari sebuah halaman web.",
      parameters: [
        { name: "url", type: "string", description: "URL halaman web", required: true },
        { name: "externalOnly", type: "boolean", description: "Hanya link eksternal (default: false)", required: false, default: false },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const page = await fetchPage({ url: params.url as string });
          let links = extractLinks(page.html, page.url);
          if (params.externalOnly) links = links.filter((l) => l.isExternal);
          return { success: true, data: { url: page.url, links, totalLinks: links.length } };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "extract_images",
      description: "Mengekstrak semua gambar dari sebuah halaman web.",
      parameters: [
        { name: "url", type: "string", description: "URL halaman web", required: true },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const page = await fetchPage({ url: params.url as string });
          const images = extractImages(page.html, page.url);
          return { success: true, data: { url: page.url, images, totalImages: images.length } };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "scrape",
      description:
        'Scraping elemen spesifik dari halaman web menggunakan CSS selector. Contoh: "div.product", "h2.title", "table tr".',
      parameters: [
        { name: "url", type: "string", description: "URL halaman web", required: true },
        { name: "selector", type: "string", description: "CSS selector untuk elemen target", required: true },
        { name: "maxResults", type: "number", description: "Jumlah maksimal hasil (default: 50)", required: false, default: 50 },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const page = await fetchPage({ url: params.url as string });
          const result = scrapeElements(
            page.html,
            page.url,
            params.selector as string,
            params.maxResults as number | undefined,
          );
          return { success: true, data: result };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "extract_tables",
      description: "Mengekstrak semua tabel dari halaman web sebagai data terstruktur (headers + rows).",
      parameters: [
        { name: "url", type: "string", description: "URL halaman web", required: true },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const page = await fetchPage({ url: params.url as string });
          const tables = extractTables(page.html);
          return { success: true, data: { url: page.url, tables, totalTables: tables.length } };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "search_web",
      description: "Mencari di web menggunakan kata kunci. Mengembalikan daftar hasil (judul, URL, snippet).",
      parameters: [
        { name: "query", type: "string", description: "Kata kunci pencarian", required: true },
        { name: "maxResults", type: "number", description: "Jumlah maksimal hasil (default: 10)", required: false, default: 10 },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const results = await searchGoogle(
            params.query as string,
            params.maxResults as number | undefined,
          );
          return { success: true, data: { query: params.query, results, totalResults: results.length } };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "multi_scrape",
      description:
        "Scraping beberapa halaman sekaligus. Cocok untuk mengumpulkan data dari daftar URL.",
      parameters: [
        { name: "urls", type: "string[]", description: "Daftar URL yang akan di-scrape", required: true },
        { name: "selector", type: "string", description: "CSS selector (opsional, default: ekstrak konten utama)", required: false },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const urls = params.urls as string[];
          const selector = params.selector as string | undefined;
          const results = await Promise.allSettled(
            urls.slice(0, 10).map(async (url) => {
              const page = await fetchPage({ url, timeout: 10000 });
              if (selector) {
                return { pageUrl: page.url, ...scrapeElements(page.html, page.url, selector, 20) };
              }
              const content = extractContent(page.html, page.url);
              return { ...content, text: content.text.slice(0, 5000) };
            }),
          );

          return {
            success: true,
            data: results.map((r, i) =>
              r.status === "fulfilled"
                ? { success: true, ...r.value }
                : { success: false, url: urls[i], error: r.reason?.message ?? String(r.reason) },
            ),
          };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
  ],
};

export {
  fetchPage,
  fetchAndExtract,
  extractContent,
  extractLinks,
  extractImages,
  scrapeElements,
  extractTables,
  searchGoogle,
} from "./web-fetch.js";
