export { SkillRegistry } from "./core/skill-registry.js";
export { deviceAccessSkill } from "./skills/device-access/index.js";
export { browserAccessSkill } from "./skills/browser-access/index.js";
export { computerUseSkill } from "./skills/computer-use/index.js";
export { airtableAccessSkill } from "./skills/airtable-access/index.js";
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
import { computerUseSkill } from "./skills/computer-use/index.js";
import { airtableAccessSkill } from "./skills/airtable-access/index.js";

export function createHermesAgent(): SkillRegistry {
  const registry = new SkillRegistry();
  registry.register(deviceAccessSkill);
  registry.register(browserAccessSkill);
  registry.register(computerUseSkill);
  registry.register(airtableAccessSkill);
  return registry;
}
