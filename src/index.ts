export { SkillRegistry } from "./core/skill-registry.js";
export { deviceAccessSkill } from "./skills/device-access/index.js";
export type {
  SkillDefinition,
  ToolDefinition,
  ToolParameter,
  ToolResult,
  FileInfo,
  SearchOptions,
  SearchResult,
} from "./skills/types/index.js";

import { SkillRegistry } from "./core/skill-registry.js";
import { deviceAccessSkill } from "./skills/device-access/index.js";

export function createHermesAgent(): SkillRegistry {
  const registry = new SkillRegistry();
  registry.register(deviceAccessSkill);
  return registry;
}

if (process.argv[1] && process.argv[1].endsWith("index")) {
  const registry = createHermesAgent();
  console.log("Hermes Agent — Device Access Skill");
  console.log("===================================");
  console.log(`Skills terdaftar: ${registry.getAllSkills().length}`);
  console.log("\nTools yang tersedia:");
  for (const tool of registry.listTools()) {
    console.log(`  [${tool.skill}] ${tool.name} — ${tool.description}`);
  }
}
