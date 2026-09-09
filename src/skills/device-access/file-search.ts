import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { lookup as lookupMime } from "mime-types";
import { glob } from "glob";
import type { FileInfo, SearchOptions, SearchResult } from "../types/index.js";
import { formatFileSize, formatDate, normalizeQuery, resolveExtensions } from "../../utils/format.js";

function getDefaultSearchDirs(): string[] {
  const home = os.homedir();
  const platform = os.platform();

  const dirs = [home];

  if (platform === "win32") {
    dirs.push(
      path.join(home, "Documents"),
      path.join(home, "Desktop"),
      path.join(home, "Downloads"),
      path.join(home, "OneDrive"),
    );
    for (const drive of ["C:", "D:", "E:"]) {
      const drivePath = `${drive}\\`;
      if (fs.existsSync(drivePath)) dirs.push(drivePath);
    }
  } else if (platform === "darwin") {
    dirs.push(
      path.join(home, "Documents"),
      path.join(home, "Desktop"),
      path.join(home, "Downloads"),
      path.join(home, "Library", "CloudStorage"),
    );
  } else {
    dirs.push(
      path.join(home, "Documents"),
      path.join(home, "Desktop"),
      path.join(home, "Downloads"),
    );
  }

  return dirs.filter((d) => {
    try {
      return fs.existsSync(d);
    } catch {
      return false;
    }
  });
}

function statToFileInfo(filePath: string, stat: fs.Stats): FileInfo {
  const ext = path.extname(filePath).toLowerCase();
  return {
    name: path.basename(filePath),
    path: filePath,
    extension: ext,
    size: stat.size,
    sizeHuman: formatFileSize(stat.size),
    created: formatDate(stat.birthtime),
    modified: formatDate(stat.mtime),
    accessed: formatDate(stat.atime),
    isDirectory: stat.isDirectory(),
    isFile: stat.isFile(),
    mimeType: lookupMime(ext) || null,
  };
}

function scoreMatch(file: FileInfo, queryParts: string[]): number {
  const nameLower = normalizeQuery(file.name);
  let nameScore = 0;

  for (const part of queryParts) {
    if (nameLower === part) nameScore += 100;
    else if (nameLower.startsWith(part)) nameScore += 60;
    else if (nameLower.includes(part)) nameScore += 30;
  }

  if (nameScore === 0) return 0;

  let score = nameScore;

  const hoursSinceModified =
    (Date.now() - new Date(file.modified).getTime()) / (1000 * 60 * 60);
  if (hoursSinceModified < 24) score += 20;
  else if (hoursSinceModified < 168) score += 10;
  else if (hoursSinceModified < 720) score += 5;

  return score;
}

const IGNORED_DIRS = new Set([
  "node_modules", ".git", ".svn", "__pycache__", ".cache",
  ".npm", ".yarn", "vendor", "dist", "build", ".next",
  "$Recycle.Bin", "System Volume Information", ".Trash",
  "AppData", "Library", ".local", ".config",
]);

export async function searchFiles(options: SearchOptions): Promise<SearchResult> {
  const startTime = Date.now();
  const {
    query,
    directory,
    extensions = [],
    maxResults = 20,
    recursive = true,
    sortBy = "relevance",
    sortOrder = "desc",
  } = options;

  const resolvedExts = extensions.length > 0 ? resolveExtensions(extensions) : [];
  const searchDirs = directory ? [directory] : getDefaultSearchDirs();
  const queryParts = normalizeQuery(query).split(/\s+/).filter(Boolean);
  const allFiles: FileInfo[] = [];

  for (const dir of searchDirs) {
    try {
      const extParts = resolvedExts.map((e) => e.replace(".", ""));
      const extPattern =
        resolvedExts.length > 1
          ? `*.{${extParts.join(",")}}`
          : resolvedExts.length === 1
            ? `*.${extParts[0]}`
            : "*";

      const pattern = recursive ? `**/${extPattern}` : extPattern;

      const matches = await glob(pattern, {
        cwd: dir,
        absolute: true,
        nodir: true,
        dot: false,
        ignore: [...IGNORED_DIRS].map((d) => `**/${d}/**`),
        maxDepth: recursive ? 8 : 1,
        signal: AbortSignal.timeout(15000),
      });

      for (const match of matches) {
        try {
          const stat = fs.statSync(match);
          const info = statToFileInfo(match, stat);
          const score = scoreMatch(info, queryParts);
          if (score > 0) {
            (info as FileInfo & { _score: number })._score = score;
            allFiles.push(info);
          }
        } catch {
          // skip inaccessible files
        }
      }
    } catch {
      // skip inaccessible directories
    }
  }

  const sortFn = (a: FileInfo, b: FileInfo): number => {
    const dir = sortOrder === "asc" ? 1 : -1;
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name) * dir;
      case "modified":
        return (new Date(a.modified).getTime() - new Date(b.modified).getTime()) * dir;
      case "size":
        return (a.size - b.size) * dir;
      case "relevance":
      default:
        return (
          ((b as FileInfo & { _score: number })._score -
            (a as FileInfo & { _score: number })._score) *
          dir
        );
    }
  };

  allFiles.sort(sortFn);
  const results = allFiles.slice(0, maxResults);

  for (const f of results) {
    delete (f as unknown as Record<string, unknown>)["_score"];
  }

  return {
    files: results,
    totalFound: allFiles.length,
    searchPath: searchDirs.join(", "),
    query,
    durationMs: Date.now() - startTime,
  };
}

export async function listDirectory(
  dirPath: string,
  options?: { showHidden?: boolean; sortBy?: "name" | "modified" | "size" },
): Promise<FileInfo[]> {
  const { showHidden = false, sortBy = "name" } = options ?? {};
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results: FileInfo[] = [];

  for (const entry of entries) {
    if (!showHidden && entry.name.startsWith(".")) continue;
    const fullPath = path.join(dirPath, entry.name);
    try {
      const stat = fs.statSync(fullPath);
      results.push(statToFileInfo(fullPath, stat));
    } catch {
      // skip inaccessible
    }
  }

  results.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    switch (sortBy) {
      case "modified":
        return new Date(b.modified).getTime() - new Date(a.modified).getTime();
      case "size":
        return b.size - a.size;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return results;
}

export async function getFileInfo(filePath: string): Promise<FileInfo> {
  const resolved = path.resolve(filePath);
  const stat = fs.statSync(resolved);
  return statToFileInfo(resolved, stat);
}

export async function findRecentFiles(options?: {
  directory?: string;
  extensions?: string[];
  hours?: number;
  maxResults?: number;
}): Promise<FileInfo[]> {
  const {
    directory,
    extensions = [],
    hours = 48,
    maxResults = 20,
  } = options ?? {};

  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const resolvedExts = extensions.length > 0 ? resolveExtensions(extensions) : [];
  const searchDirs = directory ? [directory] : getDefaultSearchDirs();
  const recentFiles: FileInfo[] = [];

  for (const dir of searchDirs) {
    try {
      const extParts = resolvedExts.map((e) => e.replace(".", ""));
      const extPattern =
        resolvedExts.length > 1
          ? `*.{${extParts.join(",")}}`
          : resolvedExts.length === 1
            ? `*.${extParts[0]}`
            : "*";

      const matches = await glob(`**/${extPattern}`, {
        cwd: dir,
        absolute: true,
        nodir: true,
        dot: false,
        ignore: [...IGNORED_DIRS].map((d) => `**/${d}/**`),
        maxDepth: 6,
        signal: AbortSignal.timeout(15000),
      });

      for (const match of matches) {
        try {
          const stat = fs.statSync(match);
          if (stat.mtime.getTime() >= cutoff) {
            recentFiles.push(statToFileInfo(match, stat));
          }
        } catch {
          // skip
        }
      }
    } catch {
      // skip
    }
  }

  recentFiles.sort(
    (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime(),
  );

  return recentFiles.slice(0, maxResults);
}

export async function readFilePreview(
  filePath: string,
  options?: { maxLines?: number; encoding?: BufferEncoding },
): Promise<{ content: string; totalLines: number; truncated: boolean }> {
  const { maxLines = 50, encoding = "utf-8" } = options ?? {};
  const resolved = path.resolve(filePath);

  const content = fs.readFileSync(resolved, encoding);
  const lines = content.split("\n");
  const truncated = lines.length > maxLines;

  return {
    content: lines.slice(0, maxLines).join("\n"),
    totalLines: lines.length,
    truncated,
  };
}
