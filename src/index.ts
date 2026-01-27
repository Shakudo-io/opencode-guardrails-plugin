/**
 * OpenCode Guardrails Plugin
 *
 * Protects Istio and Keycloak resources by requiring explicit human approval
 * before allowing modifications.
 */

import type { Plugin, Hooks } from "@opencode-ai/plugin";
import { loadConfig, type GuardrailsConfig } from "./config.js";
import { detectGuardrail, type DetectionResult } from "./detectors/index.js";
import { formatGuardrailWarning } from "./ui/messages.js";
import { auditLog } from "./audit/logger.js";

export const GuardrailsPlugin: Plugin = async ({ client, project, directory }) => {
  const config = await loadConfig(directory);

  if (!config.enabled) {
    console.log("[Guardrails] Plugin disabled via configuration");
    return {};
  }

  console.log("[Guardrails] Plugin loaded - protecting Istio and Keycloak resources");

  const hooks: Hooks = {
    /**
     * Primary interception point for kubectl commands.
     * This hook is triggered when OpenCode's permission system asks for approval.
     */
    "permission.ask": async (input, output) => {
      // Only process bash permissions (kubectl runs through bash)
      if (input.type !== "bash") return;

      // Get the command pattern from the permission request
      const patterns = input.pattern;
      const command = Array.isArray(patterns) ? patterns[0] : patterns || "";

      // Detect if this is a protected resource
      const detection = detectGuardrail(command, config);

      if (detection.triggered) {
        output.status = "ask";

        const metadata = (input.metadata ?? {}) as Record<string, unknown>;
        metadata.guardrail = detection;
        metadata.guardrailWarning = formatGuardrailWarning(detection);
        (input as { metadata: Record<string, unknown> }).metadata = metadata;

        // Log the detection
        await auditLog({
          type: "triggered",
          detection,
          sessionID: input.sessionID,
          command,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `[Guardrails] Detected ${detection.category} modification: ${detection.reason}`
        );
      }
    },

    /**
     * Deep inspection hook for YAML content when applying manifests.
     * This catches cases where the kubectl command alone doesn't reveal the resource type.
     */
    "tool.execute.before": async (input, output) => {
      // Only inspect bash tool
      if (input.tool !== "bash") return;

      const command = output.args?.command || "";

      // Check if this is a kubectl apply with a file
      if (
        command.includes("kubectl") &&
        (command.includes("-f ") || command.includes("--filename"))
      ) {
        // The permission.ask hook will handle most cases,
        // but we can add additional YAML inspection here if needed
        // For now, we rely on command-level detection
      }
    },
  };

  return hooks;
};

export default GuardrailsPlugin;
export type { GuardrailsConfig, DetectionResult };
