#!/usr/bin/env node
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const FIX = process.argv.includes("--fix");
const PORT = 27890;
const MARKERS = ["mcp.airtable.com", "nousresearch.github.io/hermes-agent", "client-metadata.json"];

const platform = os.platform();
const home = os.homedir();

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function findPortListeners() {
  if (platform === "win32") {
    const out = sh(`netstat -ano | findstr :${PORT}`);
    const pids = new Set();
    for (const line of out.split("\n")) {
      const pid = line.trim().split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid) && pid !== "0") pids.add(pid);
    }
    return [...pids].map((pid) => ({
      pid,
      name: sh(`powershell -Command "(Get-Process -Id ${pid}).ProcessName"`) || "unknown",
    }));
  }

  const out = sh(`lsof -nP -iTCP:${PORT} -sTCP:LISTEN`) || sh(`lsof -nP -i:${PORT}`);
  const found = [];
  for (const line of out.split("\n").slice(1)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
      found.push({ pid: parts[1], name: parts[0] });
    }
  }
  return found;
}

// Strong = command line names the actual OAuth client/endpoint, so it is almost
// certainly the culprit and safe to stop. Weak = merely shares a word with this
// project ("hermes", "mcp"), which matches editors and shells sitting in this
// repo — reported for review, never killed automatically.
const STRONG_PROC = /mcp\.airtable\.com|nousresearch\.github\.io|client-metadata\.json|airtable/i;
const WEAK_PROC = /hermes|nousresearch|\bmcp\b/i;

function classify(pid, name, cmd) {
  if (String(pid) === String(process.pid) || cmd.includes("stop-oauth-loop")) return null;
  if (STRONG_PROC.test(cmd)) return { pid: String(pid), name, cmd: cmd.slice(0, 160), strong: true };
  if (WEAK_PROC.test(cmd)) return { pid: String(pid), name, cmd: cmd.slice(0, 160), strong: false };
  return null;
}

function findSuspectProcesses() {
  const found = [];

  if (platform === "win32") {
    const out = sh(
      'powershell -Command "Get-CimInstance Win32_Process | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress"',
    );
    try {
      const procs = JSON.parse(out || "[]");
      for (const p of Array.isArray(procs) ? procs : [procs]) {
        const hit = classify(p.ProcessId, p.Name ?? "unknown", `${p.Name ?? ""} ${p.CommandLine ?? ""}`);
        if (hit) found.push(hit);
      }
    } catch {
      /* ignore */
    }
    return found;
  }

  const out = sh("ps ax -o pid=,command=");
  for (const line of out.split("\n")) {
    const m = line.trim().match(/^(\d+)\s+(.*)$/);
    if (!m) continue;
    const [, pid, cmd] = m;
    const hit = classify(pid, cmd.split(/\s+/)[0].split("/").pop(), cmd);
    if (hit) found.push(hit);
  }
  return found;
}

function mcpConfigPaths() {
  const appData = process.env.APPDATA ?? path.join(home, "AppData", "Roaming");
  const candidates = [
    platform === "win32"
      ? path.join(appData, "Claude", "claude_desktop_config.json")
      : platform === "darwin"
        ? path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json")
        : path.join(home, ".config", "Claude", "claude_desktop_config.json"),
    path.join(home, ".claude.json"),
    path.join(home, ".cursor", "mcp.json"),
    path.join(home, ".codeium", "windsurf", "mcp_config.json"),
    path.join(home, ".config", "mcp", "config.json"),
    path.join(process.cwd(), ".mcp.json"),
  ];
  return candidates.filter((p) => fs.existsSync(p));
}

function scanConfigs() {
  const hits = [];
  for (const file of mcpConfigPaths()) {
    let raw;
    try {
      raw = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const matched = MARKERS.filter((m) => raw.includes(m));
    if (raw.includes(String(PORT))) matched.push(`port ${PORT}`);
    if (matched.length) hits.push({ file, matched, raw });
  }
  return hits;
}

function removeServerEntries(hit) {
  let config;
  try {
    config = JSON.parse(hit.raw);
  } catch {
    return { ok: false, reason: "file bukan JSON valid — perlu diedit manual" };
  }

  const servers = config.mcpServers;
  if (!servers || typeof servers !== "object") {
    return { ok: false, reason: "tidak ada blok mcpServers — perlu diedit manual" };
  }

  const removed = [];
  for (const [name, def] of Object.entries(servers)) {
    const blob = JSON.stringify(def);
    if (MARKERS.some((m) => blob.includes(m)) || blob.includes(String(PORT))) {
      delete servers[name];
      removed.push(name);
    }
  }

  if (!removed.length) {
    return { ok: false, reason: "marker ada di file tapi tidak dalam entry mcpServers — perlu dicek manual" };
  }

  const backup = `${hit.file}.backup-${Date.now()}`;
  fs.copyFileSync(hit.file, backup);
  fs.writeFileSync(hit.file, `${JSON.stringify(config, null, 2)}\n`);
  return { ok: true, removed, backup };
}

function killPid(pid) {
  if (platform === "win32") {
    sh(`taskkill /PID ${pid} /F`);
  } else {
    sh(`kill -15 ${pid}`);
  }
}

console.log(`\nHermes — Stop OAuth Loop (${platform})`);
console.log(FIX ? "Mode: FIX (akan mengubah config & menghentikan proses)\n" : "Mode: DIAGNOSA saja (tambahkan --fix untuk memperbaiki)\n");

const listeners = findPortListeners();
console.log(`[1] Proses yang memakai port ${PORT} (callback OAuth):`);
if (listeners.length) {
  for (const l of listeners) console.log(`    PID ${l.pid} — ${l.name}`);
} else {
  console.log(`    (tidak ada). Ini justru menjelaskan loop-nya: callback OAuth tidak pernah diterima,`);
  console.log(`    jadi aplikasi pemicunya mencoba autentikasi berulang kali.`);
}

const suspects = findSuspectProcesses();
const strong = suspects.filter((s) => s.strong);
const weak = suspects.filter((s) => !s.strong);

console.log(`\n[2a] Proses yang jelas terkait Airtable/OAuth ini (akan dihentikan bila --fix):`);
if (strong.length) {
  for (const s of strong) console.log(`    PID ${s.pid} — ${s.name}\n        ${s.cmd}`);
} else {
  console.log("    (tidak ada)");
}

console.log(`\n[2b] Proses yang cuma kebetulan memuat kata "hermes"/"mcp" — TIDAK akan disentuh:`);
if (weak.length) {
  for (const s of weak) console.log(`    PID ${s.pid} — ${s.name}\n        ${s.cmd}`);
  console.log(`    Ini biasanya editor/terminal Anda yang sedang membuka repo Hermes-agent.`);
  console.log(`    Periksa sendiri; hentikan manual hanya bila Anda yakin itu pemicunya.`);
} else {
  console.log("    (tidak ada)");
}

const hits = scanConfigs();
console.log(`\n[3] File konfigurasi MCP yang memuat referensi Airtable/hermes-agent:`);
if (hits.length) {
  for (const h of hits) console.log(`    ${h.file}\n        cocok: ${h.matched.join(", ")}`);
} else {
  console.log("    (tidak ditemukan di lokasi config yang umum)");
  console.log(`    Lokasi yang dicek: ${mcpConfigPaths().length ? mcpConfigPaths().join(", ") : "tidak ada file config yang eksis"}`);
}

if (!FIX) {
  console.log(`\nTidak ada yang diubah. Jalankan ulang dengan --fix untuk:`);
  console.log(`  - menghapus entry MCP Airtable dari config (file asli di-backup otomatis)`);
  console.log(`  - menghentikan HANYA proses di [1] dan [2a]; yang di [2b] dibiarkan`);
  console.log(`\n    node scripts/stop-oauth-loop.mjs --fix\n`);
  process.exit(0);
}

console.log(`\n--- MENJALANKAN PERBAIKAN ---\n`);

for (const hit of hits) {
  const res = removeServerEntries(hit);
  if (res.ok) {
    console.log(`OK  ${hit.file}`);
    console.log(`    entry dihapus: ${res.removed.join(", ")}`);
    console.log(`    backup: ${res.backup}`);
  } else {
    console.log(`SKIP ${hit.file}`);
    console.log(`     ${res.reason}`);
  }
}

const toKill = [...new Map([...listeners, ...strong].map((p) => [p.pid, p])).values()];
if (toKill.length) {
  for (const p of toKill) {
    killPid(p.pid);
    console.log(`KILL PID ${p.pid} — ${p.name}`);
  }
} else {
  console.log("Tidak ada proses yang dihentikan (tidak ada kandidat kuat).");
}
if (weak.length) {
  console.log(`\n${weak.length} proses di [2b] sengaja DIBIARKAN — periksa manual bila loop masih berlanjut.`);
}

console.log(`\nSelesai. Restart aplikasi MCP client Anda (Claude Desktop / Cursor / dll)`);
console.log(`agar config yang sudah dibersihkan terbaca ulang.\n`);
