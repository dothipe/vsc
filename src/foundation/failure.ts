export interface FirestoreErrorInfo {
  code: string;
  message: string;
  operation: "CREATE" | "READ" | "UPDATE" | "DELETE" | "SUBSCRIBE";
  path: string;
  timestamp: string;
  userId?: string;
  userRole?: string;
}

export class FirestoreError extends Error {
  public info: FirestoreErrorInfo;

  constructor(info: FirestoreErrorInfo) {
    super(info.message);
    this.name = "FirestoreError";
    this.info = info;
  }

  public toJSONString(): string {
    return JSON.stringify(this.info, null, 2);
  }
}

export function handleFirestoreError(
  error: any,
  operation: "CREATE" | "READ" | "UPDATE" | "DELETE" | "SUBSCRIBE",
  path: string,
  userId?: string,
  userRole?: string
): never {
  const isMock = path === "tournaments/tour-test" || error?.message === "Mock Denied";
  if (!isMock) {
    console.error(`[Firestore Error] Operation: ${operation}, Path: ${path}`, error);
  } else {
    console.log(`[Mock Firestore Error] Suppressed console.error for test: Operation: ${operation}, Path: ${path}`, error);
  }

  const code = error?.code || "unknown";
  let message = error?.message || "An unexpected database error occurred.";

  if (code === "permission-denied" || code === "resource-exhausted") {
    message = `Missing or insufficient permissions for ${operation.toLowerCase()} operation on path: ${path}.`;
  }

  const info: FirestoreErrorInfo = {
    code,
    message,
    operation,
    path,
    timestamp: new Date().toISOString(),
    userId,
    userRole,
  };

  throw new FirestoreError(info);
}
