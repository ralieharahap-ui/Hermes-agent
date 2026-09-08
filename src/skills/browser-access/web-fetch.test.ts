import { describe, it, expect } from "vitest";
import { extractContent, extractLinks, extractImages, scrapeElements, extractTables } from "./web-fetch.js";

const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Rekapitulasi Pengiriman - PT Hermes</title>
  <meta name="description" content="Data pengiriman bulan September 2026">
</head>
<body>
  <nav><a href="/home">Home</a></nav>
  <main>
    <h1>Laporan Pengiriman</h1>
    <p>Berikut adalah data rekapitulasi pengiriman untuk periode September 2026.</p>
    <table>
      <thead>
        <tr><th>No</th><th>Tujuan</th><th>Jumlah</th><th>Status</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>Jakarta</td><td>150</td><td>Selesai</td></tr>
        <tr><td>2</td><td>Surabaya</td><td>85</td><td>Proses</td></tr>
        <tr><td>3</td><td>Bandung</td><td>120</td><td>Selesai</td></tr>
      </tbody>
    </table>
    <a href="/detail/1">Detail Jakarta</a>
    <a href="https://external.com/tracking">Tracking Eksternal</a>
    <img src="/images/chart.png" alt="Grafik Pengiriman" width="800" height="400">
    <img src="https://cdn.example.com/logo.png" alt="Logo">
    <div class="product" data-id="p1">
      <h3>Paket Express</h3>
      <span class="price">Rp 50.000</span>
    </div>
    <div class="product" data-id="p2">
      <h3>Paket Reguler</h3>
      <span class="price">Rp 25.000</span>
    </div>
  </main>
  <script>console.log("ignored")</script>
  <footer><a href="/about">About</a></footer>
</body>
</html>`;

const BASE_URL = "https://hermes.example.com/reports/pengiriman";

describe("extractContent", () => {
  it("extracts title and description", () => {
    const result = extractContent(SAMPLE_HTML, BASE_URL);
    expect(result.title).toBe("Rekapitulasi Pengiriman - PT Hermes");
    expect(result.description).toBe("Data pengiriman bulan September 2026");
  });

  it("extracts main text content", () => {
    const result = extractContent(SAMPLE_HTML, BASE_URL);
    expect(result.text).toContain("Laporan Pengiriman");
    expect(result.text).toContain("rekapitulasi pengiriman");
    expect(result.wordCount).toBeGreaterThan(5);
  });

  it("strips scripts and navigation", () => {
    const result = extractContent(SAMPLE_HTML, BASE_URL);
    expect(result.text).not.toContain("console.log");
  });
});

describe("extractLinks", () => {
  it("extracts all links with resolved URLs", () => {
    const links = extractLinks(SAMPLE_HTML, BASE_URL);
    expect(links.length).toBeGreaterThanOrEqual(2);
    const hrefs = links.map((l) => l.href);
    expect(hrefs).toContain("https://hermes.example.com/detail/1");
    expect(hrefs).toContain("https://external.com/tracking");
  });

  it("correctly identifies external links", () => {
    const links = extractLinks(SAMPLE_HTML, BASE_URL);
    const external = links.find((l) => l.href.includes("external.com"));
    expect(external?.isExternal).toBe(true);
    const internal = links.find((l) => l.href.includes("/detail/1"));
    expect(internal?.isExternal).toBe(false);
  });
});

describe("extractImages", () => {
  it("extracts images with resolved URLs", () => {
    const images = extractImages(SAMPLE_HTML, BASE_URL);
    expect(images.length).toBe(2);
    expect(images[0]!.alt).toBe("Grafik Pengiriman");
    expect(images[0]!.width).toBe("800");
  });
});

describe("scrapeElements", () => {
  it("scrapes elements by CSS selector", () => {
    const result = scrapeElements(SAMPLE_HTML, BASE_URL, "div.product");
    expect(result.totalMatches).toBe(2);
    expect(result.elements[0]!.text).toContain("Paket Express");
    expect(result.elements[0]!.attributes["data-id"]).toBe("p1");
    expect(result.elements[1]!.text).toContain("Paket Reguler");
  });

  it("respects maxResults", () => {
    const result = scrapeElements(SAMPLE_HTML, BASE_URL, "div.product", 1);
    expect(result.elements.length).toBe(1);
    expect(result.totalMatches).toBe(2);
  });
});

describe("extractTables", () => {
  it("extracts table data with headers and rows", () => {
    const tables = extractTables(SAMPLE_HTML);
    expect(tables.length).toBe(1);
    expect(tables[0]!.headers).toEqual(["No", "Tujuan", "Jumlah", "Status"]);
    expect(tables[0]!.rows.length).toBe(3);
    expect(tables[0]!.rows[0]).toEqual(["1", "Jakarta", "150", "Selesai"]);
    expect(tables[0]!.rows[2]).toEqual(["3", "Bandung", "120", "Selesai"]);
  });
});
