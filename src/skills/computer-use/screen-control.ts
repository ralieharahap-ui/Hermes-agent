import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface ScreenshotResult {
  path: string;
  width?: number;
  height?: number;
  sizeBytes: number;
  sizeHuman: string;
  timestamp: string;
}

export async function takeScreenshot(options?: {
  outputPath?: string;
  region?: { x: number; y: number; width: number; height: number };
  delay?: number;
}): Promise<ScreenshotResult> {
  const platform = os.platform();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath =
    options?.outputPath ??
    path.join(os.tmpdir(), `hermes-screenshot-${timestamp}.png`);

  const delayMs = options?.delay ?? 0;
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

  if (platform === "darwin") {
    let cmd = `screencapture -x "${outputPath}"`;
    if (options?.region) {
      const { x, y, width, height } = options.region;
      cmd = `screencapture -x -R${x},${y},${width},${height} "${outputPath}"`;
    }
    await execAsync(cmd);
  } else if (platform === "win32") {
    const ps = options?.region
      ? `Add-Type -AssemblyName System.Windows.Forms,System.Drawing;$b=New-Object Drawing.Bitmap(${options.region.width},${options.region.height});$g=[Drawing.Graphics]::FromImage($b);$g.CopyFromScreen(${options.region.x},${options.region.y},0,0,$b.Size);$b.Save('${outputPath.replace(/'/g, "''")}');`
      : `Add-Type -AssemblyName System.Windows.Forms,System.Drawing;$s=[Windows.Forms.Screen]::PrimaryScreen.Bounds;$b=New-Object Drawing.Bitmap($s.Width,$s.Height);$g=[Drawing.Graphics]::FromImage($b);$g.CopyFromScreen(0,0,0,0,$s.Size);$b.Save('${outputPath.replace(/'/g, "''")}');`;
    await execAsync(`powershell -Command "${ps}"`);
  } else {
    const tools = ["scrot", "gnome-screenshot", "import"];
    let captured = false;

    for (const tool of tools) {
      try {
        if (tool === "scrot") {
          const cmd = options?.region
            ? `scrot -a ${options.region.x},${options.region.y},${options.region.width},${options.region.height} "${outputPath}"`
            : `scrot "${outputPath}"`;
          await execAsync(cmd);
          captured = true;
          break;
        } else if (tool === "gnome-screenshot") {
          await execAsync(`gnome-screenshot -f "${outputPath}"`);
          captured = true;
          break;
        } else if (tool === "import") {
          const cmd = options?.region
            ? `import -window root -crop ${options.region.width}x${options.region.height}+${options.region.x}+${options.region.y} "${outputPath}"`
            : `import -window root "${outputPath}"`;
          await execAsync(cmd);
          captured = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!captured) {
      throw new Error(
        "Tidak ada tool screenshot tersedia. Install scrot, gnome-screenshot, atau imagemagick.",
      );
    }
  }

  const stat = fs.statSync(outputPath);
  const formatSize = (b: number) =>
    b < 1024
      ? `${b} B`
      : b < 1048576
        ? `${(b / 1024).toFixed(1)} KB`
        : `${(b / 1048576).toFixed(1)} MB`;

  return {
    path: outputPath,
    sizeBytes: stat.size,
    sizeHuman: formatSize(stat.size),
    timestamp: new Date().toISOString(),
  };
}

export async function getScreenResolution(): Promise<{
  width: number;
  height: number;
  displays: number;
}> {
  const platform = os.platform();

  if (platform === "darwin") {
    const { stdout } = await execAsync(
      "system_profiler SPDisplaysDataType | grep Resolution",
    );
    const match = stdout.match(/(\d+)\s*x\s*(\d+)/);
    return {
      width: match ? parseInt(match[1]!) : 0,
      height: match ? parseInt(match[2]!) : 0,
      displays: (stdout.match(/Resolution/g) || []).length,
    };
  } else if (platform === "win32") {
    const { stdout } = await execAsync(
      'powershell -Command "[System.Windows.Forms.Screen]::PrimaryScreen.Bounds | Select Width,Height | ConvertTo-Json"',
    );
    const data = JSON.parse(stdout);
    return { width: data.Width, height: data.Height, displays: 1 };
  } else {
    try {
      const { stdout } = await execAsync("xdpyinfo | grep dimensions");
      const match = stdout.match(/(\d+)x(\d+)/);
      return {
        width: match ? parseInt(match[1]!) : 0,
        height: match ? parseInt(match[2]!) : 0,
        displays: 1,
      };
    } catch {
      try {
        const { stdout } = await execAsync("xrandr | grep ' connected'");
        const match = stdout.match(/(\d+)x(\d+)/);
        return {
          width: match ? parseInt(match[1]!) : 0,
          height: match ? parseInt(match[2]!) : 0,
          displays: (stdout.match(/ connected/g) || []).length,
        };
      } catch {
        return { width: 0, height: 0, displays: 0 };
      }
    }
  }
}

export async function simulateKeyboard(
  keys: string,
  modifiers?: string[],
): Promise<{ success: boolean; message: string }> {
  const platform = os.platform();

  if (platform === "darwin") {
    let keystroke = `keystroke "${keys}"`;
    if (modifiers && modifiers.length > 0) {
      const modMap: Record<string, string> = {
        ctrl: "control down",
        alt: "option down",
        shift: "shift down",
        cmd: "command down",
        super: "command down",
      };
      const mods = modifiers.map((m) => modMap[m.toLowerCase()] ?? m).join(", ");
      keystroke += ` using {${mods}}`;
    }
    await execAsync(
      `osascript -e 'tell application "System Events" to ${keystroke}'`,
    );
  } else if (platform === "win32") {
    const sendKeys = modifiers
      ? modifiers
          .map((m) => {
            const map: Record<string, string> = {
              ctrl: "^",
              alt: "%",
              shift: "+",
            };
            return map[m.toLowerCase()] ?? "";
          })
          .join("") + keys
      : keys;
    await execAsync(
      `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${sendKeys}')"`,
    );
  } else {
    const modMap: Record<string, string> = {
      ctrl: "ctrl",
      alt: "alt",
      shift: "shift",
      super: "super",
      cmd: "super",
    };
    const combo = [
      ...(modifiers ?? []).map((m) => modMap[m.toLowerCase()] ?? m),
      ...keys.split(""),
    ].join("+");

    try {
      await execAsync(`xdotool key ${combo}`);
    } catch {
      throw new Error("xdotool tidak tersedia. Install: sudo apt install xdotool");
    }
  }

  return {
    success: true,
    message: `Keyboard: ${modifiers ? modifiers.join("+") + "+" : ""}${keys}`,
  };
}

export async function simulateMouse(
  action: "click" | "doubleclick" | "rightclick" | "move",
  x?: number,
  y?: number,
): Promise<{ success: boolean; message: string }> {
  const platform = os.platform();

  if (platform === "darwin") {
    if (x !== undefined && y !== undefined) {
      const clickType =
        action === "rightclick"
          ? "right"
          : action === "doubleclick"
            ? "double"
            : "left";
      await execAsync(
        `osascript -e 'tell application "System Events" to click at {${x}, ${y}}'`,
      );
    }
  } else if (platform === "win32") {
    if (x !== undefined && y !== undefined) {
      const button = action === "rightclick" ? "Right" : "Left";
      const clicks = action === "doubleclick" ? 2 : 1;
      await execAsync(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x},${y}); $m = New-Object System.Windows.Forms.MouseEventArgs([System.Windows.Forms.MouseButtons]::${button},${clicks},${x},${y},0)"`,
      );
    }
  } else {
    try {
      if (x !== undefined && y !== undefined) {
        await execAsync(`xdotool mousemove ${x} ${y}`);
      }
      if (action !== "move") {
        const button = action === "rightclick" ? "3" : "1";
        const cmd =
          action === "doubleclick"
            ? `xdotool click --repeat 2 --delay 100 ${button}`
            : `xdotool click ${button}`;
        await execAsync(cmd);
      }
    } catch {
      throw new Error("xdotool tidak tersedia. Install: sudo apt install xdotool");
    }
  }

  return {
    success: true,
    message: `Mouse ${action}${x !== undefined ? ` at (${x}, ${y})` : ""}`,
  };
}

export async function getMousePosition(): Promise<{ x: number; y: number }> {
  const platform = os.platform();

  if (platform === "linux") {
    try {
      const { stdout } = await execAsync(
        "xdotool getmouselocation --shell",
      );
      const xMatch = stdout.match(/X=(\d+)/);
      const yMatch = stdout.match(/Y=(\d+)/);
      return {
        x: xMatch ? parseInt(xMatch[1]!) : 0,
        y: yMatch ? parseInt(yMatch[1]!) : 0,
      };
    } catch {
      return { x: 0, y: 0 };
    }
  } else if (platform === "darwin") {
    const { stdout } = await execAsync(
      `osascript -e 'tell application "System Events" to get position of mouse'`,
    );
    const parts = stdout.trim().split(",").map((s) => parseInt(s.trim()));
    return { x: parts[0] ?? 0, y: parts[1] ?? 0 };
  } else {
    const { stdout } = await execAsync(
      'powershell -Command "[System.Windows.Forms.Cursor]::Position | ConvertTo-Json"',
    );
    const pos = JSON.parse(stdout);
    return { x: pos.X ?? 0, y: pos.Y ?? 0 };
  }
}
