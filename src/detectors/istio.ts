/**
 * Istio resource detection
 */

import type { DetectionResult } from "./index.js";
import type { GuardrailsConfig } from "../config.js";
import type { ParsedKubectlCommand } from "../parsers/kubectl.js";

// All Istio resource types and their aliases
const ISTIO_RESOURCES = new Set([
  // networking.istio.io
  "virtualservice",
  "virtualservices",
  "vs",
  "gateway",
  "gateways",
  "gw",
  "destinationrule",
  "destinationrules",
  "dr",
  "serviceentry",
  "serviceentries",
  "se",
  "sidecar",
  "sidecars",
  "envoyfilter",
  "envoyfilters",
  "workloadentry",
  "workloadentries",
  "we",
  "workloadgroup",
  "workloadgroups",
  "wg",
  "proxyconfig",
  "proxyconfigs",

  // security.istio.io
  "authorizationpolicy",
  "authorizationpolicies",
  "peerauthentication",
  "peerauthentications",
  "requestauthentication",
  "requestauthentications",

  // telemetry.istio.io
  "telemetry",
  "telemetries",

  // extensions.istio.io
  "wasmplugin",
  "wasmplugins",
]);

// Istio system namespaces
const ISTIO_NAMESPACES = new Set(["istio-system", "istio-ingress", "istio-egress"]);

// Istio API versions for YAML detection
const ISTIO_API_VERSIONS = [
  "networking.istio.io/",
  "security.istio.io/",
  "telemetry.istio.io/",
  "extensions.istio.io/",
];

/**
 * Detect if the command targets an Istio resource
 */
export function detectIstio(
  parsed: ParsedKubectlCommand,
  config: GuardrailsConfig["istio"],
  yamlContent?: string
): DetectionResult {
  const resourceType = parsed.resourceType?.toLowerCase() || "";
  const resourceName = parsed.resourceName?.toLowerCase() || "";
  const namespace = parsed.namespace?.toLowerCase() || "";

  // Check if resource type is an Istio resource
  const isIstioResourceType = ISTIO_RESOURCES.has(resourceType);

  // Check if targeting an Istio namespace
  const isIstioNamespace = ISTIO_NAMESPACES.has(namespace) || namespace.startsWith("istio-");

  // Check YAML content for Istio API versions
  let isIstioYaml = false;
  if (yamlContent) {
    isIstioYaml = ISTIO_API_VERSIONS.some((apiVersion) => yamlContent.includes(apiVersion));
  }

  // Determine if this is an Istio resource
  const isIstio = isIstioResourceType || isIstioYaml || (isIstioNamespace && resourceType);

  if (!isIstio) {
    return {
      triggered: false,
      category: null,
      severity: "warning",
      reason: "",
      resourceDetails: parsed,
    };
  }

  // Check allowed exceptions
  if (config.allowedNamespaces.includes(namespace)) {
    return {
      triggered: false,
      category: null,
      severity: "warning",
      reason: "",
      resourceDetails: parsed,
    };
  }

  if (resourceName && config.allowedResources.includes(resourceName)) {
    return {
      triggered: false,
      category: null,
      severity: "warning",
      reason: "",
      resourceDetails: parsed,
    };
  }

  // Build reason message
  let reason = `Modifying Istio ${resourceType || "resource"}`;
  if (resourceName) {
    reason += ` "${resourceName}"`;
  }
  if (namespace) {
    reason += ` in namespace "${namespace}"`;
  }

  return {
    triggered: true,
    category: "istio",
    severity: config.severity === "block" ? "critical" : "warning",
    reason,
    resourceDetails: parsed,
  };
}
