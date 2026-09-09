import * as os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function sendNotification(
  title: string,
  message: string,
  options?: { icon?: string; sound?: boolean },
): Promise<{ success: boolean; message: string }> {
  const platform = os.platform();

  try {
    if (platform === "darwin") {
      const sound = options?.sound ? ' sound name "Glass"' : "";
      await execAsync(
        `osascript -e 'display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"${sound}'`,
      );
    } else if (platform === "win32") {
      await execAsync(
        `powershell -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');$n=New-Object System.Windows.Forms.NotifyIcon;$n.Icon=[System.Drawing.SystemIcons]::Information;$n.Visible=$true;$n.ShowBalloonTip(5000,'${title.replace(/'/g, "''")}','${message.replace(/'/g, "''")}','Info')"`,
      );
    } else {
      await execAsync(
        `notify-send "${title.replace(/"/g, '\\"')}" "${message.replace(/"/g, '\\"')}"`,
      );
    }

    return { success: true, message: `Notifikasi terkirim: ${title}` };
  } catch (err) {
    return {
      success: false,
      message: `Gagal mengirim notifikasi: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function speak(
  text: string,
  options?: { rate?: number; voice?: string },
): Promise<{ success: boolean; message: string }> {
  const platform = os.platform();
  const rate = options?.rate ?? 180;

  try {
    if (platform === "darwin") {
      const voice = options?.voice ? `-v "${options.voice}"` : "";
      await execAsync(`say ${voice} -r ${rate} "${text.replace(/"/g, '\\"')}"`);
    } else if (platform === "win32") {
      await execAsync(
        `powershell -Command "Add-Type -AssemblyName System.Speech;$s=New-Object System.Speech.Synthesis.SpeechSynthesizer;$s.Rate=${Math.round((rate - 150) / 30)};$s.Speak('${text.replace(/'/g, "''")}')"`,
      );
    } else {
      try {
        await execAsync(
          `espeak -s ${rate} "${text.replace(/"/g, '\\"')}" 2>/dev/null`,
        );
      } catch {
        await execAsync(
          `spd-say -r ${Math.round(((rate - 150) / 150) * 100)} "${text.replace(/"/g, '\\"')}"`,
        );
      }
    }

    return { success: true, message: `TTS: "${text.slice(0, 60)}..."` };
  } catch (err) {
    return {
      success: false,
      message: `TTS tidak tersedia: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
