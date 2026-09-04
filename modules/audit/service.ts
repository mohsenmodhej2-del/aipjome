import { database, newId, timestamp } from '../core/database';

export async function writeAudit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string,
  after: unknown,
  scopeUsed: string | null = null,
) {
  await database()
    .prepare(
      'INSERT INTO audit_log (id, actor_id, action, entity, entity_id, after, scope_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      newId(),
      actorId,
      action,
      entity,
      entityId,
      JSON.stringify(after),
      scopeUsed,
      timestamp(),
    )
    .run();
}
