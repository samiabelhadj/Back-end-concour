const prisma = require('../config/db');

/**
 * Call this after any meaningful action.
 *
 * @param {object} opts
 * @param {number|null}  opts.userId       - req.user.userId (null if unauthenticated)
 * @param {string}       opts.action       - short verb, e.g. 'ANONYMISATION_TRIGGERED'
 * @param {string|null}  opts.targetTable  - prisma model name, e.g. 'anonymisation'
 * @param {number|null}  opts.targetId     - the PK of the affected row
 * @param {string|null}  opts.description  - human-readable detail
 * @param {string|null}  opts.ipAddress    - req.ip or req.headers['x-forwarded-for']
 */
async function audit(opts) {
  try {
    await prisma.auditLog.create({
      data: {
        user_id:      opts.userId      ?? null,
        action:       opts.action,
        target_table: opts.targetTable ?? null,
        target_id:    opts.targetId    ?? null,
        description:  opts.description ?? null,
        ip_address:   opts.ipAddress   ?? null,
      }
    });
  } catch (err) {
    // Never let audit failure crash the main flow
    console.error('[AUDIT ERROR]', err.message);
  }
}

module.exports = { audit };