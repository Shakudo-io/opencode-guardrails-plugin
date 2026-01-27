/**
 * OpenCode Guardrails Plugin
 *
 * Protects Istio and Keycloak resources by requiring explicit human approval
 * before allowing modifications.
 */

import type { Plugin, Hooks } from "@opencode-ai/plugin";
import { loadConfig, type GuardrailsConfig } from "./config.js";
import { detectGuardrail, type DetectionResult } from "./detectors/index.js";
import { auditLog } from "./audit/logger.js";

export const GuardrailsPlugin: Plugin = ({ client, project, directory }) => {
  let config: GuardrailsConfig;
  try {
    config = loadConfig(directory);
  } catch {
    return {};
  }

  if (!config.enabled) {
    return {};
  }

  const hooks: Hooks = {
    "tool.execute.before": async (input, output) => {
      if (input.tool !== "bash") return;
      
      const command = output.args?.command || "";
      const detection = detectGuardrail(command, config);

      if (detection.triggered) {
        auditLog({
          type: "blocked",
          detection,
          sessionID: input.sessionID,
          command,
          timestamp: new Date().toISOString(),
        }).catch(() => {});

        throw new Error(
          `🛡️ GUARDRAIL BLOCKED: ${detection.category} modification detected.\n\n` +
          `Command: ${command}\n` +
          `Resource: ${detection.resourceType || "unknown"}\n` +
          `Reason: ${detection.reason}\n\n` +
          `This command would modify protected ${detection.category} resources. ` +
          `If you need to run this command, please ask the user for explicit approval first.`
        );
      }
    },
  };

  return hooks;
};

export default GuardrailsPlugin;
export type { GuardrailsConfig, DetectionResult };
