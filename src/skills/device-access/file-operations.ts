import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { FileInfo } from "../types/index.js";
import { getFileInfo } from "./file-search.js";

const execAsync = promisify(exec);

export async function openFile(filePath: string): Promise<{ success: boolean; message: string }> {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    return { success: false, message: `File tidak ditemukan: ${resolved}` };
  }

  const platform = os.platform();
  let command: string;

  if (platform === "win32") {
    command = `start "" "${resolved}"`;
  } else if (platform === "darwin") {
    command = `open "${resolved}"`;
  } else {
    command = `xdg-open "${resolved}"`;
  }

  try {
    await execAsync(command);
    return { success: true, message: `File dibuka: ${path.basename(resolved)}` };
  } catch (err) {
    return {
      success: false,
      message: `Gagal membuka file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function openFileLocation(filePath: string): Promise<{ success: boolean; message: string }> {
  const resolved = path.resolve(filePath);
  const dir = fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);

  const platform = os.platform();
  let command: string;

  if (platform === "win32") {
    command = `explorer "${dir}"`;
  } else if (platform === "darwin") {
    command = `open "${dir}"`;
  } else {
    command = `xdg-open "${dir}"`;
  }

  try {
    await execAsync(command);
    return { success: true, message: `Folder dibuka: ${dir}` };
  } catch (err) {
    return {
      success: false,
      message: `Gagal membuka folder: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function copyFile(
  source: string,
  destination: string,
): Promise<{ success: boolean; file: FileInfo }> {
  const srcResolved = path.resolve(source);
  const destResolved = path.resolve(destination);

  const destDir = path.dirname(destResolved);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(srcResolved, destResolved);
  const info = await getFileInfo(destResolved);
  return { success: true, file: info };
}

export async function moveFile(
  source: string,
  destination: string,
): Promise<{ success: boolean; file: FileInfo }> {
  const srcResolved = path.resolve(source);
  const destResolved = path.resolve(destination);

  const destDir = path.dirname(destResolved);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.renameSync(srcResolved, destResolved);
  const info = await getFileInfo(destResolved);
  return { success: true, file: info };
}

export async function getDeviceInfo(): Promise<{
  hostname: string;
  platform: string;
  arch: string;
  homeDir: string;
  tempDir: string;
  totalMemory: string;
  freeMemory: string;
  cpus: number;
  username: string;
}> {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const formatMem = (bytes: number) => `${(bytes / 1073741824).toFixed(1)} GB`;

  return {
    hostname: os.hostname(),
    platform: `${os.platform()} ${os.release()}`,
    arch: os.arch(),
    homeDir: os.homedir(),
    tempDir: os.tmpdir(),
    totalMemory: formatMem(totalMem),
    freeMemory: formatMem(freeMem),
    cpus: os.cpus().length,
    username: os.userInfo().username,
  };
}

export async function getDiskUsage(): Promise<
  Array<{ mount: string; total: string; used: string; available: string; usePercent: string }>
> {
  const platform = os.platform();

  if (platform === "win32") {
    try {
      const { stdout } = await execAsync(
        "wmic logicaldisk get caption,freespace,size /format:csv",
      );
      const lines = stdout.trim().split("\n").filter((l) => l.trim());
      const results = [];
      for (const line of lines.slice(1)) {
        const parts = line.split(",");
        if (parts.length >= 4) {
          const mount = parts[1]?.trim();
          const free = parseInt(parts[2]?.trim() ?? "0");
          const total = parseInt(parts[3]?.trim() ?? "0");
          if (total > 0) {
            const used = total - free;
            const formatSize = (b: number) => `${(b / 1073741824).toFixed(1)} GB`;
            results.push({
              mount: mount ?? "",
              total: formatSize(total),
              used: formatSize(used),
              available: formatSize(free),
              usePercent: `${Math.round((used / total) * 100)}%`,
            });
          }
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  try {
    const { stdout } = await execAsync("df -h --output=target,size,used,avail,pcent 2>/dev/null || df -h");
    const lines = stdout.trim().split("\n");
    const results = [];
    for (const line of lines.slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        results.push({
          mount: parts[0]!,
          total: parts[1]!,
          used: parts[2]!,
          available: parts[3]!,
          usePercent: parts[4]!,
        });
      }
    }
    return results.filter((r) => !r.mount.startsWith("/snap") && !r.mount.startsWith("/boot"));
  } catch {
    return [];
  }
}
