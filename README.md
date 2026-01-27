# OpenCode Guardrails Plugin

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Protect your Kubernetes cluster from accidental modifications to critical infrastructure. This plugin intercepts attempts to modify **Istio** service mesh resources or **Keycloak** authentication services, requiring explicit human approval before execution.

## Features

### Core Protection
- **Istio Guardrails**: Detect modifications to VirtualServices, Gateways, DestinationRules, AuthorizationPolicies, and all Istio CRDs
- **Keycloak Guardrails**: Detect modifications to Keycloak StatefulSets, ConfigMaps, Secrets, and related resources
- **Real-time Interception**: Catches `kubectl apply`, `delete`, `patch`, `edit`, and other mutating commands
- **Deep YAML Inspection**: Analyzes file contents when applying manifests to detect Istio/Keycloak resources

### Approval Flow
- **Enhanced Permission Prompts**: Detailed warnings showing exactly what will be modified
- **Contextual Information**: Resource type, namespace, and potential impact displayed
- **Audit Logging**: All guardrail triggers and approvals logged for compliance

### Safety Features
- **Read-Only Bypass**: `kubectl get`, `describe`, `logs` commands are never blocked
- **Dry-Run Support**: Commands with `--dry-run` flag are allowed
- **Configurable Severity**: Choose between blocking, warning, or allowing per resource category
- **Custom Patterns**: Add your own protected resources beyond Istio and Keycloak

---

## Quick Start for Humans

### Prerequisites

- [OpenCode](https://opencode.ai) installed and configured
- `kubectl` configured with cluster access
- [Bun](https://bun.sh) runtime (recommended) or Node.js 18+

### Step 1: Install the Plugin

```bash
# Using bun (recommended)
bun add -g opencode-guardrails

# Or using npm
npm install -g opencode-guardrails
```

### Step 2: Enable the Plugin

Add to your global config (`~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-guardrails"]
}
```

Or per-project (`opencode.json` in project root):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-guardrails"]
}
```

### Step 3: Start OpenCode

```bash
opencode
```

The plugin loads automatically. Try a protected command:

```
> kubectl apply -f istio-gateway.yaml
```

You'll see:

```
⚠️ GUARDRAIL: Istio Modification Detected

Action: kubectl apply -f istio-gateway.yaml
Resource: Gateway
Namespace: istio-system
Severity: 🔴 Critical

This command will modify Istio networking configuration which could:
• Disrupt traffic routing across the cluster
• Affect service mesh security policies
• Cause service outages

Allow this command?
  [once]    [always]    [reject]
```

---

## Quick Start for AI Agents

If you're an AI agent, follow these steps:

### 1. Install

```bash
bun add -g opencode-guardrails
```

### 2. Configure

Ensure the plugin is listed in the OpenCode configuration:

```json
{
  "plugin": ["opencode-guardrails"]
}
```

### 3. Behavior

When you attempt to run protected commands, the user will be prompted for approval. You will receive either:
- **Approval**: Command executes normally
- **Rejection**: Error message indicating the command was blocked

### 4. Protected Resources

| Category | Resources |
|----------|-----------|
| **Istio** | VirtualService, Gateway, DestinationRule, ServiceEntry, Sidecar, EnvoyFilter, AuthorizationPolicy, PeerAuthentication, RequestAuthentication, Telemetry, WasmPlugin, ProxyConfig |
| **Keycloak** | Any resource with `keycloak` in the name, resources in `keycloak` or `hyperplane-core` namespaces |

### 5. Safe Commands (Never Blocked)

These commands are always allowed without prompts:
- `kubectl get ...`
- `kubectl describe ...`
- `kubectl logs ...`
- `kubectl explain ...`
- `kubectl diff ...`
- Any command with `--dry-run` flag

---

## Installation Options

### Option A: Global Install (Recommended)

```bash
# Install globally with bun
bun add -g opencode-guardrails

# Or with npm
npm install -g opencode-guardrails
```

### Option B: Local Plugin Directory

Create the plugin in your project's `.opencode/plugin/` directory:

```bash
mkdir -p .opencode/plugin/guardrails
cd .opencode/plugin/guardrails

# Create plugin files (see Project Structure below)
```

### Option C: From Source

```bash
git clone https://github.com/your-org/opencode-guardrails-plugin.git
cd opencode-guardrails-plugin
bun install
bun link
```

---

## Configuration Reference

Create `guardrails.json` in your project root or `~/.config/opencode/`:

```json
{
  "enabled": true,
  
  "istio": {
    "enabled": true,
    "severity": "block",
    "allowedNamespaces": [],
    "allowedResources": []
  },
  
  "keycloak": {
    "enabled": true,
    "severity": "block",
    "allowedActions": ["get", "describe", "logs"]
  },
  
  "customPatterns": [
    {
      "name": "production-databases",
      "patterns": ["postgres-prod-*", "mysql-prod-*"],
      "namespaces": ["databases"],
      "severity": "block",
      "message": "Production database modification requires approval"
    }
  ],
  
  "audit": {
    "enabled": true,
    "logFile": "/var/log/opencode-guardrails.json"
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Master switch for the plugin |
| `istio.enabled` | boolean | `true` | Enable Istio resource protection |
| `istio.severity` | string | `"block"` | `"block"`, `"warn"`, or `"allow"` |
| `istio.allowedNamespaces` | string[] | `[]` | Namespaces exempt from protection |
| `istio.allowedResources` | string[] | `[]` | Specific resources to allow |
| `keycloak.enabled` | boolean | `true` | Enable Keycloak resource protection |
| `keycloak.severity` | string | `"block"` | `"block"`, `"warn"`, or `"allow"` |
| `keycloak.allowedActions` | string[] | `[]` | kubectl verbs that are always allowed |
| `customPatterns` | array | `[]` | Additional patterns to protect |
| `audit.enabled` | boolean | `true` | Enable audit logging |
| `audit.logFile` | string | `null` | Path to audit log file |

---

## Protected Resources

### Istio Resources

The plugin protects all Istio CRDs:

| Resource | Aliases | API Group |
|----------|---------|-----------|
| VirtualService | vs | networking.istio.io |
| Gateway | gw | networking.istio.io |
| DestinationRule | dr | networking.istio.io |
| ServiceEntry | se | networking.istio.io |
| Sidecar | - | networking.istio.io |
| EnvoyFilter | - | networking.istio.io |
| WorkloadEntry | we | networking.istio.io |
| WorkloadGroup | wg | networking.istio.io |
| AuthorizationPolicy | - | security.istio.io |
| PeerAuthentication | - | security.istio.io |
| RequestAuthentication | - | security.istio.io |
| Telemetry | - | telemetry.istio.io |
| WasmPlugin | - | extensions.istio.io |
| ProxyConfig | - | networking.istio.io |

### Keycloak Resources

The plugin protects Keycloak-related resources by:

1. **Name matching**: Any resource with `keycloak` in its name
2. **Namespace matching**: All resources in `keycloak` or `hyperplane-core` namespaces
3. **CRD matching**: Keycloak operator CRDs (`Keycloak`, `KeycloakRealm`, `KeycloakClient`, `KeycloakUser`)

---

## Usage Examples

### Basic Protection

```bash
# This will trigger a guardrail prompt
> kubectl delete virtualservice my-app-routing -n istio-system

⚠️ GUARDRAIL: Istio Modification Detected

Action: kubectl delete virtualservice my-app-routing -n istio-system
Resource: VirtualService/my-app-routing
Namespace: istio-system
Severity: 🔴 Critical

Deleting this VirtualService will remove routing rules for my-app.

Allow this command?
  [once]    [always]    [reject]
```

### Safe Commands (No Prompt)

```bash
# These commands are never blocked
> kubectl get virtualservices -A
> kubectl describe gateway my-gateway -n istio-system
> kubectl logs -l app=istiod -n istio-system
> kubectl apply -f test.yaml --dry-run=client
```

### Custom Patterns

Protect additional resources by adding custom patterns:

```json
{
  "customPatterns": [
    {
      "name": "cert-manager",
      "patterns": ["certificate", "issuer", "clusterissuer"],
      "namespaces": ["cert-manager"],
      "severity": "warn",
      "message": "Modifying certificates may affect TLS across the cluster"
    },
    {
      "name": "argocd",
      "patterns": ["application", "appproject"],
      "namespaces": ["argocd"],
      "severity": "block",
      "message": "ArgoCD application changes require approval"
    }
  ]
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenCode Session                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Agent: "kubectl apply -f istio-gateway.yaml"                  │
│                           │                                      │
│                           ▼                                      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              GUARDRAILS PLUGIN                           │   │
│   │                                                          │   │
│   │  ┌─────────────────┐    ┌─────────────────────────┐     │   │
│   │  │ permission.ask  │───▶│ Pattern Detection       │     │   │
│   │  │ hook            │    │ • Parse kubectl command │     │   │
│   │  └─────────────────┘    │ • Check Istio patterns  │     │   │
│   │                         │ • Check Keycloak patterns│     │   │
│   │  ┌─────────────────┐    │ • Check custom patterns │     │   │
│   │  │ tool.execute    │    └───────────┬─────────────┘     │   │
│   │  │ .before hook    │                │                    │   │
│   │  └─────────────────┘                ▼                    │   │
│   │                         ┌─────────────────────────┐     │   │
│   │                         │ Match Found?            │     │   │
│   │                         │ YES → Require approval  │     │   │
│   │                         │ NO  → Allow silently    │     │   │
│   │                         └─────────────────────────┘     │   │
│   └─────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│              [Permission Prompt to User]                         │
│                           │                                      │
│              [once] / [always] / [reject]                        │
└─────────────────────────────────────────────────────────────────┘
```

### Hook Strategy

| Hook | Purpose |
|------|---------|
| `permission.ask` | Primary interception point for kubectl commands |
| `tool.execute.before` | Deep YAML inspection for `kubectl apply -f` |

---

## Project Structure

```
opencode-guardrails-plugin/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
└── src/
    ├── index.ts              # Main plugin entry point
    ├── config.ts             # Configuration loading
    ├── detectors/
    │   ├── index.ts          # Detector registry
    │   ├── istio.ts          # Istio pattern detection
    │   ├── keycloak.ts       # Keycloak pattern detection
    │   └── types.ts          # Detection result types
    ├── parsers/
    │   ├── kubectl.ts        # kubectl command parser
    │   └── yaml.ts           # YAML content analyzer
    ├── handlers/
    │   ├── permission.ts     # permission.ask hook
    │   └── tool.ts           # tool.execute.before hook
    ├── ui/
    │   └── messages.ts       # Warning message formatting
    └── audit/
        └── logger.ts         # Audit logging
```

---

## Updating the Plugin

OpenCode caches plugins in `~/.config/opencode/node_modules/`. To update:

### Step 1: Update Version

Edit `~/.config/opencode/package.json`:

```json
{
  "dependencies": {
    "opencode-guardrails": "0.2.0"
  }
}
```

### Step 2: Clear Cache

```bash
rm -rf ~/.config/opencode/node_modules/opencode-guardrails
rm -f ~/.config/opencode/bun.lock
```

### Step 3: Reinstall

```bash
cd ~/.config/opencode
bun install
```

### Step 4: Restart OpenCode

```bash
# Exit OpenCode completely (Ctrl+C)
# Then restart
opencode
```

---

## Troubleshooting

### Plugin Not Loading

1. Check the plugin is in your config:
   ```bash
   cat ~/.config/opencode/opencode.json | grep guardrails
   ```

2. Check for errors in OpenCode startup output

3. Verify the package is installed:
   ```bash
   ls ~/.config/opencode/node_modules/ | grep guardrails
   ```

### Commands Not Being Intercepted

1. Verify the resource is in a protected category
2. Check your `guardrails.json` configuration
3. Ensure the command is a mutating verb (not `get`, `describe`, etc.)

### False Positives

Add exceptions to your configuration:

```json
{
  "istio": {
    "allowedNamespaces": ["istio-test"],
    "allowedResources": ["test-gateway"]
  }
}
```

### View Audit Log

```bash
tail -f /var/log/opencode-guardrails.json | jq
```

---

## Security Considerations

### Bypass Attempts

The plugin protects against common bypass attempts:

| Attempt | Protection |
|---------|------------|
| Piped YAML: `cat file.yaml \| kubectl apply -f -` | Detects stdin redirection |
| Kustomize: `kubectl kustomize . \| kubectl apply -f -` | Hooks into piped commands |
| Base64 encoded: `echo "..." \| base64 -d \| kubectl apply -f -` | Flags for manual review |
| MCP kubectl tools | `tool.execute.before` covers all tools |

### Audit Trail

All guardrail events are logged:

```json
{
  "timestamp": "2026-01-27T12:00:00Z",
  "sessionID": "ses_abc123",
  "action": "triggered",
  "category": "istio",
  "command": "kubectl delete virtualservice my-app -n istio-system",
  "resourceType": "VirtualService",
  "resourceName": "my-app",
  "namespace": "istio-system",
  "decision": "approved",
  "approvedBy": "user"
}
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Guidelines

- Follow existing code style
- Add tests for new detection patterns
- Update documentation for new features
- Keep commits atomic and well-described

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Links

- [OpenCode Documentation](https://opencode.ai/docs/)
- [OpenCode Plugin Guide](https://opencode.ai/docs/plugins/)
- [Istio Documentation](https://istio.io/latest/docs/)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Report Issues](https://github.com/your-org/opencode-guardrails-plugin/issues)
