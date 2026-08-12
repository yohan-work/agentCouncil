import { loadAgentBundles } from "@agent-council/agents";
import { AgentRegistry, PromptRegistry, createRegistries } from "@agent-council/core";
import { describe, expect, it } from "vitest";

describe("Agent and Prompt registries", () => {
  it("registers versioned definitions and prompts", () => {
    const bundles = loadAgentBundles(process.cwd());
    const registries = createRegistries(bundles);

    expect(registries.agents.list().map((agent) => agent.id)).toEqual(["analyst", "falsifier"]);
    expect(registries.agents.get("analyst").version).toBe("1.0.0");
    expect(registries.prompts.get("analyst", "1.0.0").contentHash).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("rejects duplicate agent and prompt versions", () => {
    const [bundle] = loadAgentBundles(process.cwd());
    expect(bundle).toBeDefined();
    if (!bundle) {
      return;
    }
    const agents = new AgentRegistry();
    const prompts = new PromptRegistry();
    agents.register(bundle.definition);
    prompts.register(bundle.definition, bundle.prompt);

    expect(() => agents.register(bundle.definition)).toThrow(/already registered/u);
    expect(() => prompts.register(bundle.definition, bundle.prompt)).toThrow(/already registered/u);
  });
});
