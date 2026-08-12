import type { AgentBundle } from "@agent-council/agents";
import type { AgentDefinition, PromptVersion } from "@agent-council/shared";
import {
  agentDefinitionSchema,
  nowIso,
  promptVersionSchema,
  sha256,
} from "@agent-council/shared";

function registryKey(agentId: string, version: string): string {
  return `${agentId}@${version}`;
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

export class AgentRegistry {
  private readonly entries = new Map<string, AgentDefinition>();

  register(definition: AgentDefinition): void {
    const parsed = agentDefinitionSchema.parse(definition);
    const key = registryKey(parsed.id, parsed.version);
    if (this.entries.has(key)) {
      throw new Error(`Agent ${key} is already registered.`);
    }
    this.entries.set(key, parsed);
  }

  get(agentId: string, version?: string): AgentDefinition {
    if (version) {
      const definition = this.entries.get(registryKey(agentId, version));
      if (!definition) {
        throw new Error(`Agent ${registryKey(agentId, version)} is not registered.`);
      }
      return definition;
    }
    const matches = [...this.entries.values()]
      .filter((definition) => definition.id === agentId)
      .sort((left, right) => compareVersions(right.version, left.version));
    const latest = matches[0];
    if (!latest) {
      throw new Error(`Agent ${agentId} is not registered.`);
    }
    return latest;
  }

  list(): AgentDefinition[] {
    return [...this.entries.values()].sort((left, right) =>
      registryKey(left.id, left.version).localeCompare(registryKey(right.id, right.version)),
    );
  }
}

export class PromptRegistry {
  private readonly entries = new Map<string, PromptVersion>();

  register(definition: AgentDefinition, content: string, createdAt = nowIso()): void {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error(`Prompt for ${definition.id}@${definition.version} is empty.`);
    }
    const key = registryKey(definition.id, definition.version);
    if (this.entries.has(key)) {
      throw new Error(`Prompt ${key} is already registered.`);
    }
    this.entries.set(
      key,
      promptVersionSchema.parse({
        agentId: definition.id,
        agentVersion: definition.version,
        promptPath: definition.promptPath,
        contentHash: sha256(trimmed),
        content: trimmed,
        createdAt,
      }),
    );
  }

  get(agentId: string, version: string): PromptVersion {
    const entry = this.entries.get(registryKey(agentId, version));
    if (!entry) {
      throw new Error(`Prompt ${registryKey(agentId, version)} is not registered.`);
    }
    return entry;
  }

  list(): PromptVersion[] {
    return [...this.entries.values()].sort((left, right) =>
      registryKey(left.agentId, left.agentVersion).localeCompare(
        registryKey(right.agentId, right.agentVersion),
      ),
    );
  }
}

export function createRegistries(bundles: AgentBundle[]): {
  agents: AgentRegistry;
  prompts: PromptRegistry;
} {
  const agents = new AgentRegistry();
  const prompts = new PromptRegistry();
  for (const bundle of bundles) {
    agents.register(bundle.definition);
    prompts.register(bundle.definition, bundle.prompt);
  }
  return { agents, prompts };
}
