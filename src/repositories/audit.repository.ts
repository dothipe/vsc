import { BaseRepository } from "./base.repository";
import { AuditLogV2 } from "../types";

export class AuditRepository extends BaseRepository<AuditLogV2 & { id?: string }> {
  constructor() {
    super("audit_logs");
  }

  async logAction(
    userId: string,
    userRole: any,
    action: string,
    collection: string,
    docId: string,
    oldData?: any,
    newData?: any
  ): Promise<void> {
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const auditRecord: AuditLogV2 = {
      logId,
      userId,
      userRole,
      action,
      targetCollection: collection,
      targetDocumentId: docId,
      oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
      newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    await this.create(logId, auditRecord, userId, userRole);
  }
}

export const auditRepository = new AuditRepository();
