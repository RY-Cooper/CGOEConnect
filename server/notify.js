const db = require('./db');

/**
 * Fire-and-forget notification insert. Never throws; skips self-notifications
 * and deduplicates unread notifications for the same actor+type+entity.
 */
async function notify(userId, actorId, type, entityType, entityId, meta) {
  if (!userId || !actorId || userId === actorId) return;
  try {
    await db.query(
      `INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, meta)
       SELECT $1, $2, $3, $4, $5, $6
       WHERE NOT EXISTS (
         SELECT 1 FROM notifications
         WHERE user_id = $1 AND actor_id = $2 AND type = $3
           AND entity_id = $5 AND read = false
       )`,
      [userId, actorId, type, entityType, entityId, JSON.stringify(meta ?? {})]
    );
  } catch { /* non-fatal */ }
}

module.exports = { notify };
