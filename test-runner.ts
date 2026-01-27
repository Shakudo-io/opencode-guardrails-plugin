import { parseKubectlCommand } from "./src/parsers/kubectl";
import { detectIstio } from "./src/detectors/istio";
import { detectKeycloak } from "./src/detectors/keycloak";
import type { GuardrailsConfig } from "./src/config";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e instanceof Error ? e.message : e}`);
    failed++;
  }
}

function expect(value: any) {
  return {
    toBe(expected: any) {
      if (value !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
      }
    },
    toContain(expected: string) {
      if (!String(value).includes(expected)) {
        throw new Error(`Expected "${value}" to contain "${expected}"`);
      }
    },
  };
}

const defaultIstioConfig: GuardrailsConfig["istio"] = {
  enabled: true,
  severity: "block",
  allowedNamespaces: [],
  allowedResources: [],
};

const defaultKeycloakConfig: GuardrailsConfig["keycloak"] = {
  enabled: true,
  severity: "block",
  allowedActions: ["get", "describe", "logs"],
};

console.log("\n=== kubectl parser tests ===");

test("parses apply command", () => {
  const result = parseKubectlCommand("kubectl apply -f gateway.yaml");
  expect(result.verb).toBe("apply");
});

test("parses delete command with resource", () => {
  const result = parseKubectlCommand("kubectl delete virtualservice my-vs");
  expect(result.verb).toBe("delete");
  expect(result.resourceType).toBe("virtualservice");
  expect(result.resourceName).toBe("my-vs");
});

test("extracts namespace from -n flag", () => {
  const result = parseKubectlCommand("kubectl get pods -n istio-system");
  expect(result.namespace).toBe("istio-system");
});

test("extracts namespace from --namespace flag", () => {
  const result = parseKubectlCommand("kubectl get pods --namespace keycloak");
  expect(result.namespace).toBe("keycloak");
});

test("extracts filename from -f flag", () => {
  const result = parseKubectlCommand("kubectl apply -f gateway.yaml");
  expect(result.filename).toBe("gateway.yaml");
});

test("handles type/name format", () => {
  const result = parseKubectlCommand("kubectl delete deployment/nginx");
  expect(result.resourceType).toBe("deployment");
  expect(result.resourceName).toBe("nginx");
});

console.log("\n=== Istio detector tests ===");

const istioResources = ["virtualservice", "vs", "gateway", "gw", "destinationrule", "dr", "envoyfilter", "authorizationpolicy"];
for (const resource of istioResources) {
  test(`detects ${resource} as Istio resource`, () => {
    const parsed = parseKubectlCommand(`kubectl delete ${resource} my-resource`);
    const result = detectIstio(parsed, defaultIstioConfig);
    expect(result.triggered).toBe(true);
    expect(result.category).toBe("istio");
  });
}

test("triggers for istio-system namespace", () => {
  const parsed = parseKubectlCommand("kubectl delete configmap my-config -n istio-system");
  const result = detectIstio(parsed, defaultIstioConfig);
  expect(result.triggered).toBe(true);
});

test("does not trigger for regular deployments", () => {
  const parsed = parseKubectlCommand("kubectl delete deployment nginx");
  const result = detectIstio(parsed, defaultIstioConfig);
  expect(result.triggered).toBe(false);
});

test("allows resources in allowed namespaces", () => {
  const config = { ...defaultIstioConfig, allowedNamespaces: ["istio-test"] };
  const parsed = parseKubectlCommand("kubectl delete vs my-vs -n istio-test");
  const result = detectIstio(parsed, config);
  expect(result.triggered).toBe(false);
});

console.log("\n=== Keycloak detector tests ===");

const keycloakCrds = ["keycloak", "keycloaks", "keycloakrealm", "keycloakclient"];
for (const crd of keycloakCrds) {
  test(`detects ${crd} CRD`, () => {
    const parsed = parseKubectlCommand(`kubectl delete ${crd} my-resource`);
    const result = detectKeycloak(parsed, defaultKeycloakConfig);
    expect(result.triggered).toBe(true);
    expect(result.category).toBe("keycloak");
  });
}

test("allows get action for keycloak", () => {
  const parsed = parseKubectlCommand("kubectl get keycloak my-keycloak");
  const result = detectKeycloak(parsed, defaultKeycloakConfig);
  expect(result.triggered).toBe(false);
});

test("blocks delete action for keycloak", () => {
  const parsed = parseKubectlCommand("kubectl delete keycloak my-keycloak");
  const result = detectKeycloak(parsed, defaultKeycloakConfig);
  expect(result.triggered).toBe(true);
});

console.log("\n========================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
