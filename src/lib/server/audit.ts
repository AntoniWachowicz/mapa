/**
 * Audit Logging System
 * Records security-relevant events for compliance and debugging.
 */

import { connectToDatabase } from './database.js';
import { createLogger } from './logger.js';

const log = createLogger('audit');

export type AuditAction =
  | 'login_success'
  | 'login_failure'
  | 'object_create'
  | 'object_update'
  | 'object_delete'
  | 'bulk_update'
  | 'template_update'
  | 'database_reset'
  | 'import_excel';

export interface AuditEntry {
  timestamp: Date;
  action: AuditAction;
  userId?: string;
  ip?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  success: boolean;
}

/**
 * Log an audit event to the database
 */
export async function logAudit(entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('audit_log');

    await collection.insertOne({
      ...entry,
      timestamp: new Date()
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    log.error('Failed to write audit log', error instanceof Error ? error : undefined);
  }
}

/**
 * Helper to extract client info from request event
 */
export function getClientInfo(event: { getClientAddress: () => string; locals: { user?: { username: string } | null } }): {
  ip: string;
  userId?: string;
} {
  return {
    ip: event.getClientAddress(),
    userId: event.locals.user?.username
  };
}
