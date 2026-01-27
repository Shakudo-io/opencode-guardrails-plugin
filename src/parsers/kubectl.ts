/**
 * kubectl command parser
 */

export interface ParsedKubectlCommand {
  verb: string;
  resourceType?: string;
  resourceName?: string;
  namespace?: string;
  filename?: string;
  flags: Record<string, string>;
  raw: string;
}

/**
 * Parse a kubectl command into its components
 */
export function parseKubectlCommand(command: string): ParsedKubectlCommand {
  const result: ParsedKubectlCommand = {
    verb: "",
    flags: {},
    raw: command,
  };

  // Tokenize the command, handling quoted strings
  const tokens = tokenize(command);

  let i = 0;

  // Skip 'kubectl' if present
  if (tokens[i]?.toLowerCase() === "kubectl") {
    i++;
  }

  // Get the verb (apply, delete, patch, etc.)
  if (i < tokens.length) {
    result.verb = tokens[i++].toLowerCase();
  }

  // Parse remaining tokens
  while (i < tokens.length) {
    const token = tokens[i];

    if (token === "-n" || token === "--namespace") {
      // Namespace flag
      if (i + 1 < tokens.length) {
        result.namespace = tokens[++i];
      }
    } else if (token.startsWith("-n=")) {
      result.namespace = token.substring(3);
    } else if (token.startsWith("--namespace=")) {
      result.namespace = token.substring(12);
    } else if (token === "-f" || token === "--filename") {
      // Filename flag
      if (i + 1 < tokens.length) {
        result.filename = tokens[++i];
      }
    } else if (token.startsWith("-f=")) {
      result.filename = token.substring(3);
    } else if (token.startsWith("--filename=")) {
      result.filename = token.substring(11);
    } else if (token === "-o" || token === "--output") {
      // Output flag
      if (i + 1 < tokens.length) {
        result.flags["output"] = tokens[++i];
      }
    } else if (token.startsWith("-o=")) {
      result.flags["output"] = token.substring(3);
    } else if (token.startsWith("--output=")) {
      result.flags["output"] = token.substring(9);
    } else if (token.startsWith("--")) {
      // Long flag
      if (token.includes("=")) {
        const [key, value] = token.substring(2).split("=", 2);
        result.flags[key] = value;
      } else {
        result.flags[token.substring(2)] = "true";
      }
    } else if (token.startsWith("-")) {
      // Short flag (skip)
      continue;
    } else if (!result.resourceType) {
      // First non-flag argument is the resource type
      // Handle type/name format (e.g., "deployment/nginx")
      if (token.includes("/")) {
        const [type, name] = token.split("/", 2);
        result.resourceType = type.toLowerCase();
        result.resourceName = name;
      } else {
        result.resourceType = token.toLowerCase();
      }
    } else if (!result.resourceName) {
      // Second non-flag argument is the resource name
      result.resourceName = token;
    }

    i++;
  }

  return result;
}

/**
 * Tokenize a command string, handling quoted strings
 */
function tokenize(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === " " || char === "\t") {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}
