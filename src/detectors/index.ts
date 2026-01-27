/**
 * Detection registry - combines all detectors
 */

import type { GuardrailsConfig } from "../config.js";
import { detectIstio } from "./istio.js";
import { detectKeycloak } from "./keycloak.js";
import { parseKubectlCommand } from "../parsers/kubectl.js";

export interface DetectionResult {
  triggered: boolean;
  category: "istio" | "keycloak" | "custom" | null;
  severity: "critical" | "warning";
  reason: string;
  resourceDetails: {
    verb: string;
    resourceType?: string;
    resourceName?: string;
    namespace?: string;
  };
}

const SAFE_VERBS = ["get", "describe", "logs", "explain", "api-resources", "diff", "top", "auth"];

/**
 * Main detection function - checks command against all guardrail patterns
 */
export function detectGuardrail(
  command: string,
  config: GuardrailsConfig,
  yamlContent?: string
): DetectionResult {
  // Parse the kubectl command
  const parsed = parseKubectlCommand(command);

  // Skip if not a kubectl command
  if (!command.includes("kubectl")) {
    return createNoMatch(parsed);
  }

  // Skip safe (read-only) commands
  if (SAFE_VERBS.includes(parsed.verb)) {
    return createNoMatch(parsed);
  }

  // Skip dry-run commands
  if (command.includes("--dry-run")) {
    return createNoMatch(parsed);
  }

  // Check for Istio resources
  if (config.istio.enabled) {
    const istioResult = detectIstio(parsed, config.istio, yamlContent);
    if (istioResult.triggered) {
      return istioResult;
    }
  }

  // Check for Keycloak resources
  if (config.keycloak.enabled) {
    const keycloakResult = detectKeycloak(parsed, config.keycloak, yamlContent);
    if (keycloakResult.triggered) {
      return keycloakResult;
    }
  }

  // Check custom patterns
  for (const pattern of config.customPatterns) {
    const customResult = detectCustomPattern(parsed, pattern);
    if (customResult.triggered) {
      return customResult;
    }
  }

  return createNoMatch(parsed);
}

function createNoMatch(parsed: ReturnType<typeof parseKubectlCommand>): DetectionResult {
  return {
    triggered: false,
    category: null,
    severity: "warning",
    reason: "",
    resourceDetails: parsed,
  };
}

function detectCustomPattern(
  parsed: ReturnType<typeof parseKubectlCommand>,
  pattern: GuardrailsConfig["customPatterns"][0]
): DetectionResult {
  const resourceType = parsed.resourceType?.toLowerCase() || "";
  const resourceName = parsed.resourceName?.toLowerCase() || "";
  const namespace = parsed.namespace?.toLowerCase() || "";

  // Check resource type patterns
  for (const p of pattern.patterns) {
    if (resourceType.includes(p.toLowerCase()) || resourceName.includes(p.toLowerCase())) {
      // Check namespace filter if specified
      if (pattern.namespaces && pattern.namespaces.length > 0) {
        const namespaceMatch = pattern.namespaces.some(
          (ns) => namespace === ns.toLowerCase() || ns === "*"
        );
        if (!namespaceMatch) continue;
      }

      return {
        triggered: true,
        category: "custom",
        severity: pattern.severity === "block" ? "critical" : "warning",
        reason: pattern.message,
        resourceDetails: parsed,
      };
    }
  }

  return createNoMatch(parsed);
}

export { detectIstio } from "./istio.js";
export { detectKeycloak } from "./keycloak.js";
