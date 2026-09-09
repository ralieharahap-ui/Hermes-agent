import type { SkillDefinition, ToolResult } from "../types/index.js";
import {
  AirtableError,
  listBases,
  listTables,
  listRecords,
  getRecord,
  createRecords,
  updateRecord,
  deleteRecord,
} from "./airtable-client.js";

function toResult(err: unknown): ToolResult {
  if (err instanceof AirtableError) {
    return { success: false, error: err.message };
  }
  return { success: false, error: err instanceof Error ? err.message : String(err) };
}

export const airtableAccessSkill: SkillDefinition = {
  name: "airtable-access",
  description:
    "Integrasi Airtable menggunakan Personal Access Token (PAT) — tanpa OAuth. Baca/tulis base, table, dan record.",
  version: "0.1.0",
  tools: [
    {
      name: "airtable_list_bases",
      description: "Menampilkan daftar base Airtable yang dapat diakses oleh token.",
      parameters: [
        {
          name: "apiKey",
          type: "string",
          description: "Personal Access Token (opsional, default: env AIRTABLE_API_KEY)",
          required: false,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const bases = await listBases(params.apiKey as string | undefined);
          return { success: true, data: { bases, total: bases.length } };
        } catch (err) {
          return toResult(err);
        }
      },
    },
    {
      name: "airtable_list_tables",
      description: "Menampilkan daftar table beserta field dalam sebuah base.",
      parameters: [
        { name: "baseId", type: "string", description: "ID base Airtable (misal: appXXXXXXXXXXXXXX)", required: true },
        {
          name: "apiKey",
          type: "string",
          description: "Personal Access Token (opsional, default: env AIRTABLE_API_KEY)",
          required: false,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const tables = await listTables(
            params.baseId as string,
            params.apiKey as string | undefined,
          );
          return { success: true, data: { tables, total: tables.length } };
        } catch (err) {
          return toResult(err);
        }
      },
    },
    {
      name: "airtable_list_records",
      description:
        "Mengambil daftar record dari sebuah table. Mendukung filter formula, view, sort, dan limit.",
      parameters: [
        { name: "baseId", type: "string", description: "ID base Airtable", required: true },
        { name: "table", type: "string", description: "Nama atau ID table", required: true },
        { name: "maxRecords", type: "number", description: "Jumlah maksimal record (default: 100)", required: false, default: 100 },
        { name: "view", type: "string", description: "Nama view Airtable (opsional)", required: false },
        { name: "filterByFormula", type: "string", description: "Formula filter Airtable, misal: {Status}='Aktif'", required: false },
        { name: "sortField", type: "string", description: "Nama field untuk sorting", required: false },
        { name: "sortDirection", type: "string", description: "Arah sort: asc atau desc", required: false, enum: ["asc", "desc"] },
        {
          name: "apiKey",
          type: "string",
          description: "Personal Access Token (opsional, default: env AIRTABLE_API_KEY)",
          required: false,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await listRecords(params.baseId as string, params.table as string, {
            apiKey: params.apiKey as string | undefined,
            maxRecords: params.maxRecords as number | undefined,
            view: params.view as string | undefined,
            filterByFormula: params.filterByFormula as string | undefined,
            sortField: params.sortField as string | undefined,
            sortDirection: params.sortDirection as "asc" | "desc" | undefined,
          });
          return {
            success: true,
            data: { records: result.records, total: result.records.length, offset: result.offset },
          };
        } catch (err) {
          return toResult(err);
        }
      },
    },
    {
      name: "airtable_get_record",
      description: "Mengambil satu record berdasarkan ID.",
      parameters: [
        { name: "baseId", type: "string", description: "ID base Airtable", required: true },
        { name: "table", type: "string", description: "Nama atau ID table", required: true },
        { name: "recordId", type: "string", description: "ID record (misal: recXXXXXXXXXXXXXX)", required: true },
        {
          name: "apiKey",
          type: "string",
          description: "Personal Access Token (opsional, default: env AIRTABLE_API_KEY)",
          required: false,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const record = await getRecord(
            params.baseId as string,
            params.table as string,
            params.recordId as string,
            params.apiKey as string | undefined,
          );
          return { success: true, data: record };
        } catch (err) {
          return toResult(err);
        }
      },
    },
    {
      name: "airtable_create_record",
      description: "Membuat record baru dalam sebuah table. Fields dikirim sebagai objek JSON.",
      parameters: [
        { name: "baseId", type: "string", description: "ID base Airtable", required: true },
        { name: "table", type: "string", description: "Nama atau ID table", required: true },
        { name: "fields", type: "string", description: "Field record sebagai JSON string, misal: {\"Nama\":\"Budi\",\"Status\":\"Aktif\"}", required: true },
        {
          name: "apiKey",
          type: "string",
          description: "Personal Access Token (opsional, default: env AIRTABLE_API_KEY)",
          required: false,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const fields = JSON.parse(params.fields as string) as Record<string, unknown>;
          const result = await createRecords(
            params.baseId as string,
            params.table as string,
            [fields],
            params.apiKey as string | undefined,
          );
          return { success: true, data: result.records[0] };
        } catch (err) {
          return toResult(err);
        }
      },
    },
    {
      name: "airtable_update_record",
      description: "Memperbarui field pada record yang sudah ada.",
      parameters: [
        { name: "baseId", type: "string", description: "ID base Airtable", required: true },
        { name: "table", type: "string", description: "Nama atau ID table", required: true },
        { name: "recordId", type: "string", description: "ID record yang akan diperbarui", required: true },
        { name: "fields", type: "string", description: "Field yang akan diperbarui sebagai JSON string", required: true },
        {
          name: "apiKey",
          type: "string",
          description: "Personal Access Token (opsional, default: env AIRTABLE_API_KEY)",
          required: false,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const fields = JSON.parse(params.fields as string) as Record<string, unknown>;
          const record = await updateRecord(
            params.baseId as string,
            params.table as string,
            params.recordId as string,
            fields,
            params.apiKey as string | undefined,
          );
          return { success: true, data: record };
        } catch (err) {
          return toResult(err);
        }
      },
    },
    {
      name: "airtable_delete_record",
      description: "Menghapus record berdasarkan ID.",
      parameters: [
        { name: "baseId", type: "string", description: "ID base Airtable", required: true },
        { name: "table", type: "string", description: "Nama atau ID table", required: true },
        { name: "recordId", type: "string", description: "ID record yang akan dihapus", required: true },
        {
          name: "apiKey",
          type: "string",
          description: "Personal Access Token (opsional, default: env AIRTABLE_API_KEY)",
          required: false,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await deleteRecord(
            params.baseId as string,
            params.table as string,
            params.recordId as string,
            params.apiKey as string | undefined,
          );
          return { success: result.deleted, data: result };
        } catch (err) {
          return toResult(err);
        }
      },
    },
  ],
};

export {
  listBases,
  listTables,
  listRecords,
  getRecord,
  createRecords,
  updateRecord,
  deleteRecord,
  AirtableError,
} from "./airtable-client.js";
