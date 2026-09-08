import type { SkillDefinition, ToolResult } from "../types/index.js";
import {
  takeScreenshot,
  getScreenResolution,
  simulateKeyboard,
  simulateMouse,
  getMousePosition,
} from "./screen-control.js";
import { executeShell, getActiveWindow } from "./shell-exec.js";
import { getClipboard, setClipboard } from "./clipboard.js";
import {
  listProcesses,
  killProcess,
  getSystemLoad,
} from "./process-manager.js";
import { sendNotification, speak } from "./notification.js";

export const computerUseSkill: SkillDefinition = {
  name: "computer-use",
  description:
    "Kontrol penuh komputer — screenshot, keyboard/mouse, shell, clipboard, proses, notifikasi, dan text-to-speech.",
  version: "0.1.0",
  tools: [
    {
      name: "screenshot",
      description:
        "Mengambil screenshot layar. Bisa full screen atau region tertentu.",
      parameters: [
        {
          name: "outputPath",
          type: "string",
          description: "Path output (opsional, default: temp folder)",
          required: false,
        },
        {
          name: "delay",
          type: "number",
          description: "Delay dalam milidetik sebelum capture (default: 0)",
          required: false,
          default: 0,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await takeScreenshot({
            outputPath: params.outputPath as string | undefined,
            delay: params.delay as number | undefined,
          });
          return { success: true, data: result };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
    {
      name: "screen_resolution",
      description: "Mendapatkan resolusi layar dan jumlah display.",
      parameters: [],
      handler: async (): Promise<ToolResult> => {
        try {
          const result = await getScreenResolution();
          return { success: true, data: result };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
    {
      name: "type_text",
      description:
        "Mengetik teks menggunakan simulasi keyboard. Bisa dengan modifier (ctrl, alt, shift, cmd/super).",
      parameters: [
        {
          name: "keys",
          type: "string",
          description: 'Teks atau key yang akan diketik (misal: "Hello" atau "a")',
          required: true,
        },
        {
          name: "modifiers",
          type: "string[]",
          description:
            'Modifier keys: ctrl, alt, shift, cmd/super (misal: ["ctrl", "c"] untuk copy)',
          required: false,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await simulateKeyboard(
            params.keys as string,
            params.modifiers as string[] | undefined,
          );
          return { success: true, data: result };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
    {
      name: "mouse_action",
      description:
        "Melakukan aksi mouse — klik, double-click, klik kanan, atau pindah ke koordinat.",
      parameters: [
        {
          name: "action",
          type: "string",
          description: "Aksi: click, doubleclick, rightclick, move",
          required: true,
          enum: ["click", "doubleclick", "rightclick", "move"],
        },
        {
          name: "x",
          type: "number",
          description: "Koordinat X",
          required: false,
        },
        {
          name: "y",
          type: "number",
          description: "Koordinat Y",
          required: false,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await simulateMouse(
            params.action as "click" | "doubleclick" | "rightclick" | "move",
            params.x as number | undefined,
            params.y as number | undefined,
          );
          return { success: true, data: result };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
    {
      name: "mouse_position",
      description: "Mendapatkan posisi kursor mouse saat ini.",
      parameters: [],
      handler: async (): Promise<ToolResult> => {
        try {
          const result = await getMousePosition();
          return { success: true, data: result };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
    {
      name: "run_command",
      description:
        "Menjalankan perintah shell/terminal. Mendukung bash (Linux/Mac) dan PowerShell (Windows).",
      parameters: [
        {
          name: "command",
          type: "string",
          description: "Perintah yang akan dijalankan",
          required: true,
        },
        {
          name: "cwd",
          type: "string",
          description: "Working directory (default: home)",
          required: false,
        },
        {
          name: "timeout",
          type: "number",
          description: "Timeout ms (default: 30000)",
          required: false,
          default: 30000,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await executeShell(params.command as string, {
            cwd: params.cwd as string | undefined,
            timeout: params.timeout as number | undefined,
          });
          return { success: true, data: result };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
    {
      name: "active_window",
      description: "Mendapatkan informasi window/aplikasi yang sedang aktif.",
      parameters: [],
      handler: async (): Promise<ToolResult> => {
        try {
          const result = await getActiveWindow();
          return { success: true, data: result };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
    {
      name: "get_clipboard",
      description: "Membaca isi clipboard (teks yang di-copy).",
      parameters: [],
      handler: async (): Promise<ToolResult> => {
        try {
          const result = await getClipboard();
          return { success: true, data: result };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
    {
      name: "set_clipboard",
      description: "Menyalin teks ke clipboard.",
      parameters: [
        {
          name: "text",
          type: "string",
          description: "Teks yang akan disalin ke clipboard",
          required: true,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await setClipboard(params.text as string);
          return { success: true, data: result };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
    {
      name: "list_processes",
      description:
        "Menampilkan daftar proses yang berjalan, diurutkan dari CPU tertinggi.",
      parameters: [
        {
          name: "filter",
          type: "string",
          description: "Filter nama proses",
          required: false,
        },
        {
          name: "maxResults",
          type: "number",
          description: "Jumlah maksimal (default: 30)",
          required: false,
          default: 30,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await listProcesses(
            params.filter as string | undefined,
            params.maxResults as number | undefined,
          );
          return {
            success: true,
            data: {
              processes: result,
              total: result.length,
            },
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
    {
      name: "kill_process",
      description: "Menghentikan proses berdasarkan PID.",
      parameters: [
        {
          name: "pid",
          type: "number",
          description: "Process ID yang akan dihentikan",
          required: true,
        },
        {
          name: "force",
          type: "boolean",
          description: "Force kill (SIGKILL, default: false)",
          required: false,
          default: false,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await killProcess(
            params.pid as number,
            params.force as boolean | undefined,
          );
          return {
            success: result.success,
            data: result,
            error: result.success ? undefined : result.message,
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
    {
      name: "system_load",
      description:
        "Menampilkan beban sistem — CPU, memori, uptime, jumlah proses.",
      parameters: [],
      handler: async (): Promise<ToolResult> => {
        try {
          const result = await getSystemLoad();
          return { success: true, data: result };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
    {
      name: "notify",
      description: "Mengirim notifikasi desktop.",
      parameters: [
        {
          name: "title",
          type: "string",
          description: "Judul notifikasi",
          required: true,
        },
        {
          name: "message",
          type: "string",
          description: "Isi pesan notifikasi",
          required: true,
        },
        {
          name: "sound",
          type: "boolean",
          description: "Mainkan suara (default: false)",
          required: false,
          default: false,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await sendNotification(
            params.title as string,
            params.message as string,
            { sound: params.sound as boolean | undefined },
          );
          return {
            success: result.success,
            data: result,
            error: result.success ? undefined : result.message,
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
    {
      name: "speak_text",
      description:
        "Text-to-speech — membacakan teks menggunakan suara sistem (backend TTS).",
      parameters: [
        {
          name: "text",
          type: "string",
          description: "Teks yang akan dibacakan",
          required: true,
        },
        {
          name: "rate",
          type: "number",
          description: "Kecepatan bicara (default: 180 wpm)",
          required: false,
          default: 180,
        },
        {
          name: "voice",
          type: "string",
          description: "Nama voice (macOS only, misal: Alex, Samantha)",
          required: false,
        },
      ],
      handler: async (params): Promise<ToolResult> => {
        try {
          const result = await speak(params.text as string, {
            rate: params.rate as number | undefined,
            voice: params.voice as string | undefined,
          });
          return {
            success: result.success,
            data: result,
            error: result.success ? undefined : result.message,
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
  ],
};

export {
  takeScreenshot,
  getScreenResolution,
  simulateKeyboard,
  simulateMouse,
  getMousePosition,
} from "./screen-control.js";
export { executeShell, getActiveWindow } from "./shell-exec.js";
export { getClipboard, setClipboard } from "./clipboard.js";
export {
  listProcesses,
  killProcess,
  getSystemLoad,
} from "./process-manager.js";
export { sendNotification, speak } from "./notification.js";
