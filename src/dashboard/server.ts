import express from "express";
import * as path from "node:path";
import { createHermesAgent } from "../index.js";

const app = express();
const registry = createHermesAgent();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "../../public")));

app.get("/api/skills", (_req, res) => {
  const skills = registry.getAllSkills().map((s) => ({
    name: s.name,
    description: s.description,
    version: s.version,
    tools: s.tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
  }));
  res.json({ skills });
});

app.get("/api/tools", (_req, res) => {
  res.json({ tools: registry.listTools() });
});

app.post("/api/execute", async (req, res) => {
  const { tool, params } = req.body as { tool: string; params: Record<string, unknown> };

  if (!tool) {
    res.status(400).json({ success: false, error: "Parameter 'tool' wajib diisi" });
    return;
  }

  const result = await registry.executeTool(tool, params ?? {});
  res.json(result);
});

app.get("/api/tool-definitions", (_req, res) => {
  res.json({ definitions: registry.toToolDefinitions() });
});

const PORT = parseInt(process.env.HERMES_PORT ?? "3141", 10);

app.listen(PORT, () => {
  console.log(`\n  Hermes Dashboard aktif di http://localhost:${PORT}`);
  console.log(`  Skills: ${registry.getAllSkills().length}`);
  console.log(`  Tools:  ${registry.listTools().length}\n`);
});

export { app };
