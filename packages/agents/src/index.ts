import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { AgentDefinition } from "@agent-council/shared";
import {
  analystOutputSchema,
  analystRevisionOutputSchema,
  falsifierOutputSchema,
} from "@agent-council/shared";
import type { z } from "zod";

import { analystDefinition } from "./analyst/definition";
import { falsifierDefinition } from "./falsifier/definition";

export type AgentBundle = {
  definition: AgentDefinition;
  prompt: string;
};

export const outputSchemas = new Map<string, z.ZodType<unknown>>([
  ["analyst-output.v1", analystOutputSchema],
  ["analyst-revision-output.v1", analystRevisionOutputSchema],
  ["falsifier-output.v1", falsifierOutputSchema],
]);

export function loadAgentBundles(projectRoot = process.cwd()): AgentBundle[] {
  return [analystDefinition, falsifierDefinition].map((definition) => ({
    definition,
    prompt: readFileSync(resolve(projectRoot, definition.promptPath), "utf8").trim(),
  }));
}

export { analystDefinition, falsifierDefinition };
export {
  analystOutputSchema,
  analystRevisionOutputSchema,
  falsifierOutputSchema,
} from "@agent-council/shared";
