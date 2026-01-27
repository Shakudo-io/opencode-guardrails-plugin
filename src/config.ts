/**
 * Configuration loading and validation for the Guardrails plugin
 */

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

const CustomPatternSchema = z.object({
  name: z.string(),
  patterns: z.array(z.string()),
  namespaces: z.array(z.string()).optional(),
  severity: z.enum(["block", "warn"]),
  message: z.string(),
});

const GuardrailsConfigSchema = z.object({
  enabled: z.boolean().default(true),

  istio: z
    .object({
      enabled: z.boolean().default(true),
      severity: z.enum(["block", "warn", "allow"]).default("block"),
      allowedNamespaces: z.array(z.string()).default([]),
      allowedResources: z.array(z.string()).default([]),
    })
    .default({}),

  keycloak: z
    .object({
      enabled: z.boolean().default(true),
      severity: z.enum(["block", "warn", "allow"]).default("block"),
      allowedActions: z.array(z.string()).default([]),
    })
    .default({}),

  customPatterns: z.array(CustomPatternSchema).default([]),

  audit: z
    .object({
      enabled: z.boolean().default(true),
      logFile: z.string().optional(),
    })
    .default({}),
});

export type GuardrailsConfig = z.infer<typeof GuardrailsConfigSchema>;
export type CustomPattern = z.infer<typeof CustomPatternSchema>;

const DEFAULT_CONFIG: GuardrailsConfig = {
  enabled: true,
  istio: {
    enabled: true,
    severity: "block",
    allowedNamespaces: [],
    allowedResources: [],
  },
  keycloak: {
    enabled: true,
    severity: "block",
    allowedActions: [],
  },
  customPatterns: [],
  audit: {
    enabled: true,
  },
};

/**
 * Load configuration from guardrails.json in the project directory
 * or from ~/.config/opencode/guardrails.json
 */
export async function loadConfig(directory: string): Promise<GuardrailsConfig> {
  const configPaths = [
    path.join(directory, "guardrails.json"),
    path.join(directory, ".opencode", "guardrails.json"),
    path.join(process.env.HOME || "", ".config", "opencode", "guardrails.json"),
  ];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(content);
        const validated = GuardrailsConfigSchema.parse(parsed);
        console.log(`[Guardrails] Loaded config from ${configPath}`);
        return validated;
      }
    } catch (error) {
      console.warn(`[Guardrails] Failed to load config from ${configPath}:`, error);
    }
  }

  console.log("[Guardrails] Using default configuration");
  return DEFAULT_CONFIG;
}
