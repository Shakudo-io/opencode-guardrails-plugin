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
    "permission.ask": async (input, output) => {
      try {
        if (input.type !== "bash") {
          return;
        }

        const patterns = input.pattern;
        const command = Array.isArray(patterns) ? patterns[0] : patterns || "";

        const detection = detectGuardrail(command, config);

        if (detection.triggered) {
          output.status = "ask";

          auditLog({
            type: "triggered",
            detection,
            sessionID: input.sessionID,
            command,
            timestamp: new Date().toISOString(),
          }).catch(() => {});
        }
      } catch {
      }
    },

    "tool.execute.before": async (input, output) => {
      try {
        if (input.tool !== "bash") return;
        const command = output.args?.command || "";
        if (
          command.includes("kubectl") &&
          (command.includes("-f ") || command.includes("--filename"))
        ) {
        }
      } catch {
      }
    },
  };

  return hooks;
};

export default GuardrailsPlugin;
export type { GuardrailsConfig, DetectionResult };
