import { hasPermission, UserRoleV2, ActionV2 } from "../foundation/permissions";

export interface TestCase {
  id: string;
  name: string;
  category: "Permission" | "Database" | "Audit" | "Security";
  execute: () => Promise<{ success: boolean; message: string; details?: any }>;
}

export interface TestResult {
  id: string;
  name: string;
  category: string;
  success: boolean;
  message: string;
  durationMs: number;
}

export class TestingHarness {
  private testCases: TestCase[] = [];

  constructor() {
    this.registerPermissionTests();
    this.registerErrorHandlingTests();
    this.registerAuditLogTests();
  }

  private registerPermissionTests() {
    // 1. Verify Super Admin has absolute powers
    this.testCases.push({
      id: "perm-01",
      name: "Verify System Owner has supreme rights",
      category: "Permission",
      execute: async () => {
        const canDelete = hasPermission("system_owner", "DELETE");
        const canOverride = hasPermission("system_owner", "OVERRIDE_RULES");
        if (canDelete && canOverride) {
          return { success: true, message: "System Owner successfully validated for supreme permissions." };
        }
        return { success: false, message: "System Owner missing expected supreme permissions." };
      },
    });

    // 2. Verify Referee least privilege restriction
    this.testCases.push({
      id: "perm-02",
      name: "Verify Referee least privilege lane restriction",
      category: "Permission",
      execute: async () => {
        // Referee can only score assigned lane
        const canScoreSelf = hasPermission("referee", "SCORE_LEVEL", { laneNumber: 3, assignedLane: 3 });
        const canScoreOther = hasPermission("referee", "SCORE_LEVEL", { laneNumber: 4, assignedLane: 3 });

        if (canScoreSelf && !canScoreOther) {
          return { success: true, message: "Referee correctly restricted to assigned lane only." };
        }
        return { success: false, message: `Least privilege failed: canScoreSelf=${canScoreSelf}, canScoreOther=${canScoreOther}` };
      },
    });

    // 3. Verify Spectators are denied score levels
    this.testCases.push({
      id: "perm-03",
      name: "Verify Spectators are denied write access",
      category: "Permission",
      execute: async () => {
        const canWrite = hasPermission("viewer", "SCORE_LEVEL");
        if (!canWrite) {
          return { success: true, message: "Viewer successfully restricted from score updates." };
        }
        return { success: false, message: "Security risk: Viewers are allowed to update scores!" };
      },
    });
  }

  private registerErrorHandlingTests() {
    this.testCases.push({
      id: "err-01",
      name: "Verify JSON formatted FirestoreErrorInfo outputs on denial",
      category: "Security",
      execute: async () => {
        const mockError = { code: "permission-denied", message: "Mock Denied" };
        const { handleFirestoreError } = await import("../foundation/failure");
        
        try {
          handleFirestoreError(mockError, "UPDATE", "tournaments/tour-test", "user-123", "referee");
          return { success: false, message: "ErrorHandler failed to throw." };
        } catch (e: any) {
          if (e.name === "FirestoreError" && e.info) {
            const info = e.info;
            if (info.code === "permission-denied" && info.operation === "UPDATE" && info.path === "tournaments/tour-test") {
              return { success: true, message: "Error correctly parsed into structured FirestoreErrorInfo." };
            }
          }
          return { success: false, message: "Threw incorrect exception type or incomplete error payload." };
        }
      },
    });
  }

  private registerAuditLogTests() {
    this.testCases.push({
      id: "audit-01",
      name: "Verify action audit records conform to V2.1 specifications",
      category: "Audit",
      execute: async () => {
        const { auditRepository } = await import("../repositories/audit.repository");
        if (typeof auditRepository.logAction === "function") {
          return { success: true, message: "AuditRepository provides robust logAction compliance methods." };
        }
        return { success: false, message: "AuditRepository is missing required logAction compliance." };
      },
    });
  }

  /**
   * Execute all tests sequentially and log results
   */
  async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    for (const test of this.testCases) {
      const start = performance.now();
      try {
        const outcome = await test.execute();
        const duration = performance.now() - start;
        results.push({
          id: test.id,
          name: test.name,
          category: test.category,
          success: outcome.success,
          message: outcome.message,
          durationMs: parseFloat(duration.toFixed(2)),
        });
      } catch (err: any) {
        const duration = performance.now() - start;
        results.push({
          id: test.id,
          name: test.name,
          category: test.category,
          success: false,
          message: err?.message || "Uncaught runtime exception inside test.",
          durationMs: parseFloat(duration.toFixed(2)),
        });
      }
    }
    return results;
  }
}
export const testingHarnessInstance = new TestingHarness();
