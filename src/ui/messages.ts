/**
 * UI message formatting for guardrail warnings
 */

import type { DetectionResult } from "../detectors/index.js";

/**
 * Format a guardrail warning message for display in the permission prompt
 */
export function formatGuardrailWarning(detection: DetectionResult): string {
  const { category, severity, reason, resourceDetails } = detection;

  const severityIcon = severity === "critical" ? "🔴" : "🟡";
  const categoryName = getCategoryDisplayName(category);
  const impactWarnings = getImpactWarnings(category);

  let message = `⚠️ GUARDRAIL: ${categoryName} Modification Detected\n\n`;

  message += `**Action:** \`${resourceDetails.verb}\`\n`;

  if (resourceDetails.resourceType) {
    message += `**Resource:** ${resourceDetails.resourceType}`;
    if (resourceDetails.resourceName) {
      message += `/${resourceDetails.resourceName}`;
    }
    message += "\n";
  }

  if (resourceDetails.namespace) {
    message += `**Namespace:** ${resourceDetails.namespace}\n`;
  }

  message += `**Severity:** ${severityIcon} ${severity === "critical" ? "Critical" : "Warning"}\n\n`;

  message += `${reason}\n\n`;

  if (impactWarnings.length > 0) {
    message += `**Potential Impact:**\n`;
    for (const warning of impactWarnings) {
      message += `• ${warning}\n`;
    }
  }

  return message;
}

function getCategoryDisplayName(category: DetectionResult["category"]): string {
  switch (category) {
    case "istio":
      return "Istio Service Mesh";
    case "keycloak":
      return "Keycloak Authentication";
    case "custom":
      return "Protected Resource";
    default:
      return "Unknown";
  }
}

function getImpactWarnings(category: DetectionResult["category"]): string[] {
  switch (category) {
    case "istio":
      return [
        "May disrupt traffic routing across the cluster",
        "Could affect service mesh security policies",
        "Risk of service outages or degraded performance",
        "Changes may take time to propagate across the mesh",
      ];
    case "keycloak":
      return [
        "May affect authentication for all applications",
        "Could lock users out of the system",
        "Risk of security policy changes",
        "Session tokens may be invalidated",
      ];
    case "custom":
      return ["This resource has been marked as protected", "Modifications require explicit approval"];
    default:
      return [];
  }
}
