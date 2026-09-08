export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatDate(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

export function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/[_\-\.]/g, " ").trim();
}

const EXTENSION_ALIASES: Record<string, string[]> = {
  excel: [".xlsx", ".xls", ".xlsm", ".xlsb", ".csv"],
  word: [".docx", ".doc", ".docm", ".rtf"],
  powerpoint: [".pptx", ".ppt", ".pptm"],
  pdf: [".pdf"],
  image: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".ico"],
  video: [".mp4", ".avi", ".mov", ".mkv", ".wmv", ".flv", ".webm"],
  audio: [".mp3", ".wav", ".flac", ".aac", ".ogg", ".wma", ".m4a"],
  text: [".txt", ".md", ".log", ".ini", ".cfg", ".conf"],
  code: [".ts", ".js", ".py", ".java", ".cpp", ".c", ".go", ".rs", ".rb", ".php"],
  archive: [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2"],
};

export function resolveExtensions(input: string[]): string[] {
  const result: string[] = [];
  for (const item of input) {
    const lower = item.toLowerCase();
    if (EXTENSION_ALIASES[lower]) {
      result.push(...EXTENSION_ALIASES[lower]);
    } else {
      result.push(lower.startsWith(".") ? lower : `.${lower}`);
    }
  }
  return [...new Set(result)];
}
