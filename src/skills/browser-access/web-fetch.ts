import * as cheerio from "cheerio";

export interface FetchOptions {
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
  followRedirects?: boolean;
}

export interface FetchResult {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  html: string;
  contentType: string;
  loadTimeMs: number;
}

export interface ExtractedContent {
  url: string;
  title: string;
  description: string;
  text: string;
  wordCount: number;
}

export interface ExtractedLink {
  text: string;
  href: string;
  isExternal: boolean;
}

export interface ExtractedImage {
  src: string;
  alt: string;
  width?: string;
  height?: string;
}

export interface ScrapedData {
  url: string;
  selector: string;
  elements: Array<{
    index: number;
    tag: string;
    text: string;
    html: string;
    attributes: Record<string, string>;
  }>;
  totalMatches: number;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchPage(options: FetchOptions): Promise<FetchResult> {
  const { url, headers = {}, timeout = 15000, followRedirects = true } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": DEFAULT_UA, ...headers },
      redirect: followRedirects ? "follow" : "manual",
      signal: controller.signal,
    });

    const html = await res.text();
    const resHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      resHeaders[k] = v;
    });

    return {
      url: res.url,
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
      html,
      contentType: res.headers.get("content-type") ?? "",
      loadTimeMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function extractContent(html: string, url: string): ExtractedContent {
  const $ = cheerio.load(html);

  $("script, style, noscript, iframe, svg, nav, footer, header").remove();

  const title =
    $("title").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    "";

  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";

  const textBlocks: string[] = [];
  $("article, main, [role='main'], .content, #content, .post, .entry-content").each(
    (_, el) => {
      textBlocks.push($(el).text().trim());
    },
  );

  if (textBlocks.length === 0) {
    $("body")
      .find("p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, pre")
      .each((_, el) => {
        const t = $(el).text().trim();
        if (t.length > 10) textBlocks.push(t);
      });
  }

  const text = textBlocks
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  return {
    url,
    title,
    description,
    text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
}

export function extractLinks(html: string, baseUrl: string): ExtractedLink[] {
  const $ = cheerio.load(html);
  const links: ExtractedLink[] = [];
  const seen = new Set<string>();
  let origin: string;

  try {
    origin = new URL(baseUrl).origin;
  } catch {
    origin = "";
  }

  $("a[href]").each((_, el) => {
    const rawHref = $(el).attr("href")?.trim();
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) return;

    let resolved: string;
    try {
      resolved = new URL(rawHref, baseUrl).href;
    } catch {
      return;
    }

    if (seen.has(resolved)) return;
    seen.add(resolved);

    links.push({
      text: $(el).text().trim().slice(0, 200),
      href: resolved,
      isExternal: !resolved.startsWith(origin),
    });
  });

  return links;
}

export function extractImages(html: string, baseUrl: string): ExtractedImage[] {
  const $ = cheerio.load(html);
  const images: ExtractedImage[] = [];
  const seen = new Set<string>();

  $("img[src]").each((_, el) => {
    const rawSrc = $(el).attr("src")?.trim();
    if (!rawSrc) return;

    let resolved: string;
    try {
      resolved = new URL(rawSrc, baseUrl).href;
    } catch {
      return;
    }

    if (seen.has(resolved)) return;
    seen.add(resolved);

    images.push({
      src: resolved,
      alt: $(el).attr("alt")?.trim() ?? "",
      width: $(el).attr("width"),
      height: $(el).attr("height"),
    });
  });

  return images;
}

export function scrapeElements(
  html: string,
  url: string,
  selector: string,
  maxResults = 50,
): ScrapedData {
  const $ = cheerio.load(html);
  const matched = $(selector);
  const elements: ScrapedData["elements"] = [];

  matched.slice(0, maxResults).each((i, el) => {
    const $el = $(el);
    const attrs: Record<string, string> = {};
    const rawAttrs = el.type === "tag" ? el.attribs : {};
    for (const [k, v] of Object.entries(rawAttrs)) {
      attrs[k] = v;
    }

    elements.push({
      index: i,
      tag: el.type === "tag" ? el.tagName : "",
      text: $el.text().trim().slice(0, 500),
      html: $.html($el)?.slice(0, 1000) ?? "",
      attributes: attrs,
    });
  });

  return { url, selector, elements, totalMatches: matched.length };
}

export function extractTables(html: string): TableData[] {
  const $ = cheerio.load(html);
  const tables: TableData[] = [];

  $("table").each((_, table) => {
    const headers: string[] = [];
    $(table)
      .find("thead th, thead td, tr:first-child th")
      .each((_, th) => {
        headers.push($(th).text().trim());
      });

    const rows: string[][] = [];
    const rowSelector = headers.length > 0 ? "tbody tr" : "tr";
    $(table)
      .find(rowSelector)
      .each((_, tr) => {
        const cells: string[] = [];
        $(tr)
          .find("td, th")
          .each((_, td) => {
            cells.push($(td).text().trim());
          });
        if (cells.length > 0) rows.push(cells);
      });

    if (headers.length > 0 && rows.length === 0) {
      // headers only — no data rows
    }

    if (headers.length === 0 && rows.length > 0) {
      headers.push(...(rows.shift() ?? []));
    }

    if (headers.length > 0 || rows.length > 0) {
      tables.push({ headers, rows, totalRows: rows.length });
    }
  });

  return tables;
}

export async function fetchAndExtract(
  url: string,
): Promise<{ page: FetchResult; content: ExtractedContent }> {
  const page = await fetchPage({ url });
  const content = extractContent(page.html, page.url);
  return { page, content };
}

export async function searchGoogle(
  query: string,
  maxResults = 10,
): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const encoded = encodeURIComponent(query);
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;

  const page = await fetchPage({ url: searchUrl });
  const $ = cheerio.load(page.html);
  const results: Array<{ title: string; url: string; snippet: string }> = [];

  $(".result").each((_, el) => {
    if (results.length >= maxResults) return;
    const $el = $(el);
    const title = $el.find(".result__a").text().trim();
    const rawUrl = $el.find(".result__a").attr("href") ?? "";
    const snippet = $el.find(".result__snippet").text().trim();

    let resolvedUrl = rawUrl;
    try {
      const parsed = new URL(rawUrl, searchUrl);
      const uddg = parsed.searchParams.get("uddg");
      if (uddg) resolvedUrl = decodeURIComponent(uddg);
    } catch {
      // keep raw
    }

    if (title && resolvedUrl) {
      results.push({ title, url: resolvedUrl, snippet });
    }
  });

  return results;
}
