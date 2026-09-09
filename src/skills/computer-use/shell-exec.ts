import * as os from "node:os";
import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface ShellResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export async function executeShell(
  command: string,
  options?: { cwd?: string; timeout?: number; shell?: string },
): Promise<ShellResult> {
  const start = Date.now();
  const timeout = options?.timeout ?? 30000;
  const cwd = options?.cwd ?? os.homedir();
  const shell =
    options?.shell ??
    (os.platform() === "win32" ? "powershell.exe" : "/bin/bash");

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout,
      shell,
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      command,
      stdout: stdout.slice(0, 50000),
      stderr: stderr.slice(0, 10000),
      exitCode: 0,
      durationMs: Date.now() - start,
    };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
    return {
      command,
      stdout: (e.stdout ?? "").slice(0, 50000),
      stderr: (e.stderr ?? e.message ?? "").slice(0, 10000),
      exitCode: e.code ?? 1,
      durationMs: Date.now() - start,
    };
  }
}

export async function executeShellStream(
  command: string,
  options?: { cwd?: string; timeout?: number },
): Promise<ShellResult> {
  const start = Date.now();
  const timeout = options?.timeout ?? 30000;
  const cwd = options?.cwd ?? os.homedir();
  const shell = os.platform() === "win32" ? "powershell.exe" : "/bin/bash";

  return new Promise((resolve) => {
    const child = spawn(shell, ["-c", command], { cwd });
    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        command,
        stdout: stdout.slice(0, 50000),
        stderr: "Timeout: command exceeded " + timeout + "ms",
        exitCode: 124,
        durationMs: Date.now() - start,
      });
    }, timeout);

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        command,
        stdout: stdout.slice(0, 50000),
        stderr: stderr.slice(0, 10000),
        exitCode: code ?? 0,
        durationMs: Date.now() - start,
      });
    });
  });
}

export async function getActiveWindow(): Promise<{
  title: string;
  pid: number;
  class?: string;
}> {
  const platform = os.platform();

  if (platform === "darwin") {
    try {
      const { stdout } = await execAsync(
        `osascript -e 'tell application "System Events" to get {name, unix id} of first process whose frontmost is true'`,
      );
      const parts = stdout.trim().split(",");
      return {
        title: parts[0]?.trim() ?? "",
        pid: parseInt(parts[1]?.trim() ?? "0"),
      };
    } catch {
      return { title: "unknown", pid: 0 };
    }
  } else if (platform === "win32") {
    try {
      const { stdout } = await execAsync(
        'powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object -First 1 MainWindowTitle,Id | ConvertTo-Json"',
      );
      const data = JSON.parse(stdout);
      return { title: data.MainWindowTitle ?? "", pid: data.Id ?? 0 };
    } catch {
      return { title: "unknown", pid: 0 };
    }
  } else {
    try {
      const { stdout: winId } = await execAsync(
        "xdotool getactivewindow",
      );
      const id = winId.trim();
      const { stdout: name } = await execAsync(
        `xdotool getactivewindow getwindowname`,
      );
      const { stdout: pid } = await execAsync(
        `xdotool getactivewindow getwindowpid`,
      );
      const { stdout: cls } = await execAsync(
        `xprop -id ${id} WM_CLASS 2>/dev/null || echo ""`,
      );
      const classMatch = cls.match(/"([^"]+)"/);
      return {
        title: name.trim(),
        pid: parseInt(pid.trim()) || 0,
        class: classMatch?.[1],
      };
    } catch {
      return { title: "unknown", pid: 0 };
    }
  }
}
