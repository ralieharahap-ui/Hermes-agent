import type { SkillDefinition, ToolDefinition, ToolResult } from "../skills/types/index.js";

export class SkillRegistry {
  private skills = new Map<string, SkillDefinition>();

  register(skill: SkillDefinition): void {
    if (this.skills.has(skill.name)) {
      throw new Error(`Skill "${skill.name}" sudah terdaftar`);
    }
    this.skills.set(skill.name, skill);
  }

  getSkill(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  getAllSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  getTool(skillName: string, toolName: string): ToolDefinition | undefined {
    const skill = this.skills.get(skillName);
    return skill?.tools.find((t) => t.name === toolName);
  }

  findTool(toolName: string): { skill: SkillDefinition; tool: ToolDefinition } | undefined {
    for (const skill of this.skills.values()) {
      const tool = skill.tools.find((t) => t.name === toolName);
      if (tool) return { skill, tool };
    }
    return undefined;
  }

  async executeTool(toolName: string, params: Record<string, unknown>): Promise<ToolResult> {
    const found = this.findTool(toolName);
    if (!found) {
      return { success: false, error: `Tool "${toolName}" tidak ditemukan` };
    }

    const { tool } = found;

    for (const param of tool.parameters) {
      if (param.required && !(param.name in params)) {
        return { success: false, error: `Parameter wajib "${param.name}" tidak diberikan` };
      }
    }

    return tool.handler(params);
  }

  listTools(): Array<{ skill: string; name: string; description: string }> {
    const tools: Array<{ skill: string; name: string; description: string }> = [];
    for (const skill of this.skills.values()) {
      for (const tool of skill.tools) {
        tools.push({
          skill: skill.name,
          name: tool.name,
          description: tool.description,
        });
      }
    }
    return tools;
  }

  toToolDefinitions(): Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: {
        type: "object";
        properties: Record<string, unknown>;
        required: string[];
      };
    };
  }> {
    const definitions = [];

    for (const skill of this.skills.values()) {
      for (const tool of skill.tools) {
        const properties: Record<string, unknown> = {};
        const required: string[] = [];

        for (const param of tool.parameters) {
          const prop: Record<string, unknown> = {
            type: param.type === "string[]" ? "array" : param.type,
            description: param.description,
          };
          if (param.type === "string[]") {
            prop.items = { type: "string" };
          }
          if (param.enum) {
            prop.enum = param.enum;
          }
          if (param.default !== undefined) {
            prop.default = param.default;
          }
          properties[param.name] = prop;
          if (param.required) required.push(param.name);
        }

        definitions.push({
          type: "function" as const,
          function: {
            name: `${skill.name}__${tool.name}`,
            description: `[${skill.name}] ${tool.description}`,
            parameters: { type: "object" as const, properties, required },
          },
        });
      }
    }

    return definitions;
  }
}
