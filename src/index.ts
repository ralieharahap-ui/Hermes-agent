export { SkillRegistry } from "./core/skill-registry.js";
export { deviceAccessSkill } from "./skills/device-access/index.js";
export { browserAccessSkill } from "./skills/browser-access/index.js";
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
import { browserAccessSkill } from "./skills/browser-access/index.js";

export function createHermesAgent(): SkillRegistry {
  const registry = new SkillRegistry();
  registry.register(deviceAccessSkill);
  registry.register(browserAccessSkill);
  return registry;
}
