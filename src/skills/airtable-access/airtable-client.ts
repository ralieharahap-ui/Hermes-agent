const API_BASE = "https://api.airtable.com/v0";

export class AirtableError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "AirtableError";
  }
}

function resolveApiKey(apiKey?: string): string {
  const key = apiKey ?? process.env.AIRTABLE_API_KEY;
  if (!key) {
    throw new AirtableError(
      "Airtable Personal Access Token tidak ditemukan. Set env var AIRTABLE_API_KEY atau kirim parameter apiKey. " +
        "Buat token di https://airtable.com/create/tokens",
    );
  }
  return key;
}

async function request<T>(
  path: string,
  apiKey: string | undefined,
  init?: RequestInit,
): Promise<T> {
  const key = resolveApiKey(apiKey);
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const message =
      (body as { error?: { message?: string } })?.error?.message ??
      `Airtable API error (${res.status})`;
    throw new AirtableError(message, res.status);
  }

  return body as T;
}

export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel: string;
}

export interface AirtableField {
  id: string;
  name: string;
  type: string;
}

export interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: AirtableField[];
}

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

export async function listBases(apiKey?: string): Promise<AirtableBase[]> {
  const result = await request<{ bases: AirtableBase[] }>("/meta/bases", apiKey);
  return result.bases;
}

export async function listTables(
  baseId: string,
  apiKey?: string,
): Promise<AirtableTable[]> {
  const result = await request<{ tables: AirtableTable[] }>(
    `/meta/bases/${baseId}/tables`,
    apiKey,
  );
  return result.tables;
}

export async function listRecords(
  baseId: string,
  table: string,
  options?: {
    apiKey?: string;
    maxRecords?: number;
    view?: string;
    filterByFormula?: string;
    sortField?: string;
    sortDirection?: "asc" | "desc";
  },
): Promise<{ records: AirtableRecord[]; offset?: string }> {
  const params = new URLSearchParams();
  if (options?.maxRecords) params.set("maxRecords", String(options.maxRecords));
  if (options?.view) params.set("view", options.view);
  if (options?.filterByFormula) params.set("filterByFormula", options.filterByFormula);
  if (options?.sortField) {
    params.set("sort[0][field]", options.sortField);
    params.set("sort[0][direction]", options.sortDirection ?? "asc");
  }

  const qs = params.toString();
  return request<{ records: AirtableRecord[]; offset?: string }>(
    `/${baseId}/${encodeURIComponent(table)}${qs ? `?${qs}` : ""}`,
    options?.apiKey,
  );
}

export async function getRecord(
  baseId: string,
  table: string,
  recordId: string,
  apiKey?: string,
): Promise<AirtableRecord> {
  return request<AirtableRecord>(
    `/${baseId}/${encodeURIComponent(table)}/${recordId}`,
    apiKey,
  );
}

export async function createRecords(
  baseId: string,
  table: string,
  records: Array<Record<string, unknown>>,
  apiKey?: string,
): Promise<{ records: AirtableRecord[] }> {
  return request<{ records: AirtableRecord[] }>(
    `/${baseId}/${encodeURIComponent(table)}`,
    apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        records: records.map((fields) => ({ fields })),
      }),
    },
  );
}

export async function updateRecord(
  baseId: string,
  table: string,
  recordId: string,
  fields: Record<string, unknown>,
  apiKey?: string,
): Promise<AirtableRecord> {
  return request<AirtableRecord>(
    `/${baseId}/${encodeURIComponent(table)}/${recordId}`,
    apiKey,
    {
      method: "PATCH",
      body: JSON.stringify({ fields }),
    },
  );
}

export async function deleteRecord(
  baseId: string,
  table: string,
  recordId: string,
  apiKey?: string,
): Promise<{ id: string; deleted: boolean }> {
  return request<{ id: string; deleted: boolean }>(
    `/${baseId}/${encodeURIComponent(table)}/${recordId}`,
    apiKey,
    { method: "DELETE" },
  );
}
