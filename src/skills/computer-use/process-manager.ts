import * as os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: string;
  memory: string;
  status?: string;
}

export async function listProcesses(
  filter?: string,
  maxResults = 30,
): Promise<ProcessInfo[]> {
  const platform = os.platform();

  if (platform === "win32") {
    try {
      const { stdout } = await execAsync(
        'powershell -Command "Get-Process | Sort-Object CPU -Descending | Select-Object -First 50 Id,ProcessName,CPU,@{N=\'Mem\';E={[math]::Round($_.WorkingSet64/1MB,1)}} | ConvertTo-Json"',
      );
      const procs: Array<{ Id: number; ProcessName: string; CPU: number; Mem: number }> =
        JSON.parse(stdout);
      let results = procs.map((p) => ({
        pid: p.Id,
        name: p.ProcessName,
        cpu: `${(p.CPU ?? 0).toFixed(1)}`,
        memory: `${p.Mem} MB`,
      }));

      if (filter) {
        const q = filter.toLowerCase();
        results = results.filter((p) => p.name.toLowerCase().includes(q));
      }

      return results.slice(0, maxResults);
    } catch {
      return [];
    }
  }

  try {
    const { stdout } = await execAsync(
      "ps aux --sort=-%cpu | head -60",
    );
    const lines = stdout.trim().split("\n").slice(1);
    let results: ProcessInfo[] = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 11) {
        results.push({
          pid: parseInt(parts[1]!),
          name: parts.slice(10).join(" "),
          cpu: `${parts[2]}%`,
          memory: `${parts[3]}%`,
          status: parts[7],
        });
      }
    }

    if (filter) {
      const q = filter.toLowerCase();
      results = results.filter((p) => p.name.toLowerCase().includes(q));
    }

    return results.slice(0, maxResults);
  } catch {
    return [];
  }
}

export async function killProcess(
  pid: number,
  force = false,
): Promise<{ success: boolean; message: string }> {
  const platform = os.platform();

  try {
    if (platform === "win32") {
      const flag = force ? "/F" : "";
      await execAsync(`taskkill ${flag} /PID ${pid}`);
    } else {
      const signal = force ? "-9" : "-15";
      await execAsync(`kill ${signal} ${pid}`);
    }
    return { success: true, message: `Process ${pid} terminated` };
  } catch (err) {
    return {
      success: false,
      message: `Gagal menghentikan process: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function getSystemLoad(): Promise<{
  cpuUsage: string;
  loadAverage: number[];
  memoryUsed: string;
  memoryFree: string;
  memoryPercent: string;
  uptime: string;
  processCount: number;
}> {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const formatMem = (b: number) => `${(b / 1073741824).toFixed(1)} GB`;

  const uptimeSec = os.uptime();
  const days = Math.floor(uptimeSec / 86400);
  const hours = Math.floor((uptimeSec % 86400) / 3600);
  const mins = Math.floor((uptimeSec % 3600) / 60);

  let processCount = 0;
  try {
    if (os.platform() === "win32") {
      const { stdout } = await execAsync(
        'powershell -Command "(Get-Process).Count"',
      );
      processCount = parseInt(stdout.trim());
    } else {
      const { stdout } = await execAsync("ps aux | wc -l");
      processCount = parseInt(stdout.trim()) - 1;
    }
  } catch {
    /* ignore */
  }

  const loadAvg = os.loadavg();

  return {
    cpuUsage: `${((loadAvg[0]! / os.cpus().length) * 100).toFixed(1)}%`,
    loadAverage: loadAvg.map((l) => parseFloat(l.toFixed(2))),
    memoryUsed: formatMem(usedMem),
    memoryFree: formatMem(freeMem),
    memoryPercent: `${((usedMem / totalMem) * 100).toFixed(1)}%`,
    uptime: `${days}d ${hours}h ${mins}m`,
    processCount,
  };
}
