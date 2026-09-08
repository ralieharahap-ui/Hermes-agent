export interface SkillDefinition {
  name: string;
  description: string;
  version: string;
  tools: ToolDefinition[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  handler: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "string[]";
  description: string;
  required: boolean;
  default?: unknown;
  enum?: string[];
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface FileInfo {
  name: string;
  path: string;
  extension: string;
  size: number;
  sizeHuman: string;
  created: string;
  modified: string;
  accessed: string;
  isDirectory: boolean;
  isFile: boolean;
  mimeType: string | null;
}

export interface SearchOptions {
  query: string;
  directory?: string;
  extensions?: string[];
  maxResults?: number;
  recursive?: boolean;
  sortBy?: "name" | "modified" | "size" | "relevance";
  sortOrder?: "asc" | "desc";
}

export interface SearchResult {
  files: FileInfo[];
  totalFound: number;
  searchPath: string;
  query: string;
  durationMs: number;
}
