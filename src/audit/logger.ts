/**
 * Audit logging for guardrail events
 */

import * as fs from "fs";
import type { DetectionResult } from "../detectors/index.js";

export interface AuditEntry {
  type: "triggered" | "approved" | "denied" | "bypassed";
  detection: DetectionResult;
  sessionID: string;
  command: string;
  timestamp: string;
  approvedBy?: string;
}

let logFile: string | null = null;

/**
 * Set the audit log file path
 */
export function setLogFile(path: string | undefined): void {
  logFile = path || null;
}

/**
 * Log an audit entry
 */
export async function auditLog(entry: AuditEntry): Promise<void> {
  // Always log to console
  const logLine = `[Guardrails Audit] ${entry.type}: ${entry.detection.category} - ${entry.detection.reason}`;
  console.log(logLine);

  // Write to file if configured
  if (logFile) {
    try {
      const jsonLine = JSON.stringify(entry) + "\n";
      fs.appendFileSync(logFile, jsonLine);
    } catch (error) {
      console.error("[Guardrails] Failed to write audit log:", error);
    }
  }
}
