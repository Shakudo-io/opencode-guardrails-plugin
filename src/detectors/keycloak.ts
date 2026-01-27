/**
 * Keycloak resource detection
 */

import type { DetectionResult } from "./index.js";
import type { GuardrailsConfig } from "../config.js";
import type { ParsedKubectlCommand } from "../parsers/kubectl.js";

// Keycloak-related namespaces
const KEYCLOAK_NAMESPACES = new Set(["keycloak", "hyperplane-core"]);

// Keycloak CRDs (from Keycloak Operator)
const KEYCLOAK_CRDS = new Set([
  "keycloak",
  "keycloaks",
  "keycloakrealm",
  "keycloakrealms",
  "keycloakclient",
  "keycloakclients",
  "keycloakuser",
  "keycloakusers",
  "keycloakrealmimport",
  "keycloakrealmimports",
]);

// Patterns that indicate a Keycloak resource
const KEYCLOAK_NAME_PATTERNS = [/^keycloak/i, /keycloak-/i, /-keycloak$/i, /^kc-/i];

/**
 * Detect if the command targets a Keycloak resource
 */
export function detectKeycloak(
  parsed: ParsedKubectlCommand,
  config: GuardrailsConfig["keycloak"],
  yamlContent?: string
): DetectionResult {
  const resourceType = parsed.resourceType?.toLowerCase() || "";
  const resourceName = parsed.resourceName?.toLowerCase() || "";
  const namespace = parsed.namespace?.toLowerCase() || "";

  // Check if action is allowed
  if (config.allowedActions.includes(parsed.verb)) {
    return {
      triggered: false,
      category: null,
      severity: "warning",
      reason: "",
      resourceDetails: parsed,
    };
  }

  // Check if resource type is a Keycloak CRD
  const isKeycloakCrd = KEYCLOAK_CRDS.has(resourceType);

  // Check if targeting a Keycloak namespace
  const isKeycloakNamespace =
    KEYCLOAK_NAMESPACES.has(namespace) || namespace.startsWith("keycloak");

  // Check if resource name matches Keycloak patterns
  const isKeycloakName = KEYCLOAK_NAME_PATTERNS.some((pattern) => pattern.test(resourceName));

  // Check YAML content for Keycloak references
  let isKeycloakYaml = false;
  if (yamlContent) {
    isKeycloakYaml =
      yamlContent.includes("keycloak.org/") ||
      yamlContent.includes("kind: Keycloak") ||
      KEYCLOAK_NAME_PATTERNS.some((pattern) => pattern.test(yamlContent));
  }

  // Determine if this is a Keycloak resource
  const isKeycloak = isKeycloakCrd || isKeycloakYaml || (isKeycloakNamespace && isKeycloakName);

  if (!isKeycloak) {
    return {
      triggered: false,
      category: null,
      severity: "warning",
      reason: "",
      resourceDetails: parsed,
    };
  }

  // Build reason message
  let reason = `Modifying Keycloak ${resourceType || "resource"}`;
  if (resourceName) {
    reason += ` "${resourceName}"`;
  }
  if (namespace) {
    reason += ` in namespace "${namespace}"`;
  }

  return {
    triggered: true,
    category: "keycloak",
    severity: config.severity === "block" ? "critical" : "warning",
    reason,
    resourceDetails: parsed,
  };
}
