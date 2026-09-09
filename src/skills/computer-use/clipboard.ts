import * as os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function getClipboard(): Promise<{ text: string }> {
  const platform = os.platform();

  if (platform === "darwin") {
    const { stdout } = await execAsync("pbpaste");
    return { text: stdout };
  } else if (platform === "win32") {
    const { stdout } = await execAsync(
      "powershell -Command Get-Clipboard",
    );
    return { text: stdout.trim() };
  } else {
    try {
      const { stdout } = await execAsync("xclip -selection clipboard -o");
      return { text: stdout };
    } catch {
      try {
        const { stdout } = await execAsync("xsel --clipboard --output");
        return { text: stdout };
      } catch {
        throw new Error(
          "Clipboard tidak tersedia. Install xclip atau xsel.",
        );
      }
    }
  }
}

export async function setClipboard(
  text: string,
): Promise<{ success: boolean; length: number }> {
  const platform = os.platform();
  const safeText = text.replace(/'/g, "'\\''");

  if (platform === "darwin") {
    await execAsync(`echo '${safeText}' | pbcopy`);
  } else if (platform === "win32") {
    await execAsync(
      `powershell -Command "Set-Clipboard -Value '${safeText.replace(/'/g, "''")}'\"`,
    );
  } else {
    try {
      await execAsync(
        `echo '${safeText}' | xclip -selection clipboard`,
      );
    } catch {
      try {
        await execAsync(
          `echo '${safeText}' | xsel --clipboard --input`,
        );
      } catch {
        throw new Error(
          "Clipboard tidak tersedia. Install xclip atau xsel.",
        );
      }
    }
  }

  return { success: true, length: text.length };
}
