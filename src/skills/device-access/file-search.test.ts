import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { searchFiles, listDirectory, getFileInfo, findRecentFiles, readFilePreview } from "./file-search.js";

const TEST_DIR = path.join(os.tmpdir(), "hermes-test-" + Date.now());

beforeAll(() => {
  fs.mkdirSync(path.join(TEST_DIR, "subfolder"), { recursive: true });
  fs.writeFileSync(path.join(TEST_DIR, "rekapitulasi_pengiriman.xlsx"), "fake-excel");
  fs.writeFileSync(path.join(TEST_DIR, "invoice_2024.pdf"), "fake-pdf");
  fs.writeFileSync(path.join(TEST_DIR, "catatan.txt"), "Baris 1\nBaris 2\nBaris 3\nBaris 4\nBaris 5");
  fs.writeFileSync(path.join(TEST_DIR, "data.csv"), "col1,col2\nval1,val2");
  fs.writeFileSync(path.join(TEST_DIR, ".hidden"), "hidden file");
  fs.writeFileSync(path.join(TEST_DIR, "subfolder", "laporan.docx"), "fake-word");
});

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("searchFiles", () => {
  it("finds files by query in specified directory", async () => {
    const result = await searchFiles({ query: "rekapitulasi", directory: TEST_DIR });
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files[0]!.name).toBe("rekapitulasi_pengiriman.xlsx");
  });

  it("filters by extension alias", async () => {
    const result = await searchFiles({
      query: "rekapitulasi",
      directory: TEST_DIR,
      extensions: ["excel"],
    });
    expect(result.files.length).toBe(1);
    expect(result.files[0]!.extension).toBe(".xlsx");
  });

  it("filters by direct extension", async () => {
    const result = await searchFiles({
      query: "invoice",
      directory: TEST_DIR,
      extensions: [".pdf"],
    });
    expect(result.files.length).toBe(1);
    expect(result.files[0]!.name).toBe("invoice_2024.pdf");
  });

  it("searches recursively by default", async () => {
    const result = await searchFiles({ query: "laporan", directory: TEST_DIR });
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files[0]!.name).toBe("laporan.docx");
  });

  it("returns empty for no matches", async () => {
    const result = await searchFiles({ query: "xyznonexistent", directory: TEST_DIR });
    expect(result.files.length).toBe(0);
  });
});

describe("listDirectory", () => {
  it("lists files and directories", async () => {
    const result = await listDirectory(TEST_DIR);
    expect(result.length).toBeGreaterThanOrEqual(4);
    const names = result.map((f) => f.name);
    expect(names).toContain("rekapitulasi_pengiriman.xlsx");
    expect(names).toContain("subfolder");
  });

  it("hides dotfiles by default", async () => {
    const result = await listDirectory(TEST_DIR);
    const names = result.map((f) => f.name);
    expect(names).not.toContain(".hidden");
  });

  it("shows dotfiles when requested", async () => {
    const result = await listDirectory(TEST_DIR, { showHidden: true });
    const names = result.map((f) => f.name);
    expect(names).toContain(".hidden");
  });
});

describe("getFileInfo", () => {
  it("returns correct file metadata", async () => {
    const info = await getFileInfo(path.join(TEST_DIR, "rekapitulasi_pengiriman.xlsx"));
    expect(info.name).toBe("rekapitulasi_pengiriman.xlsx");
    expect(info.extension).toBe(".xlsx");
    expect(info.isFile).toBe(true);
    expect(info.isDirectory).toBe(false);
    expect(info.size).toBeGreaterThan(0);
    expect(info.mimeType).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });
});

describe("findRecentFiles", () => {
  it("finds recently modified files", async () => {
    const result = await findRecentFiles({ directory: TEST_DIR, hours: 1 });
    expect(result.length).toBeGreaterThan(0);
  });

  it("filters by extension", async () => {
    const result = await findRecentFiles({
      directory: TEST_DIR,
      extensions: ["pdf"],
      hours: 1,
    });
    expect(result.length).toBe(1);
    expect(result[0]!.extension).toBe(".pdf");
  });
});

describe("readFilePreview", () => {
  it("reads text file content", async () => {
    const result = await readFilePreview(path.join(TEST_DIR, "catatan.txt"));
    expect(result.content).toContain("Baris 1");
    expect(result.totalLines).toBe(5);
    expect(result.truncated).toBe(false);
  });

  it("truncates long files", async () => {
    const result = await readFilePreview(path.join(TEST_DIR, "catatan.txt"), { maxLines: 2 });
    expect(result.truncated).toBe(true);
    expect(result.content.split("\n").length).toBe(2);
  });
});
