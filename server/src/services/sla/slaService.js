import { db } from '../db/index.js';

export const SLA_DURATIONS = {
  CRITICAL: 24,   // hours
  HIGH: 48,       // hours
  MEDIUM: 168,    // 7 days
  LOW: 336        // 14 days
};

export const slaService = {
  /**
   * Calculate due_at timestamp based on priority and municipal settings
   */
  calculateDueDate(priority = 'MEDIUM') {
    const hours = SLA_DURATIONS[priority] || 48;
    return new Date(Date.now() + hours * 3600000).toISOString();
  },

  /**
   * Compute SLA status metadata for a complaint
   */
  getSlaMetrics(complaint) {
    if (!complaint.due_at) return { status: 'NO_SLA', remainingHours: null, isBreached: false };

    const now = Date.now();
    const dueTime = new Date(complaint.due_at).getTime();
    const diffHours = (dueTime - now) / 3600000;

    const isClosed = ['RESOLVED', 'CLOSED', 'REJECTED'].includes(complaint.status);

    if (isClosed) {
      return {
        status: 'MET',
        remainingHours: 0,
        isBreached: Boolean(complaint.sla_breached)
      };
    }

    if (diffHours < 0) {
      return {
        status: 'BREACHED',
        remainingHours: Math.round(diffHours),
        isBreached: true
      };
    }

    if (diffHours <= 24) {
      return {
        status: 'AT_RISK',
        remainingHours: Math.round(diffHours),
        isBreached: false
      };
    }

    return {
      status: 'ON_TRACK',
      remainingHours: Math.round(diffHours),
      isBreached: false
    };
  },

  /**
   * Background scan for overdue tickets and triggers escalation notifications
   */
  scanAndEscalate() {
    const activeComplaints = db.complaints.filter(c => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status));
    const now = Date.now();

    for (const c of activeComplaints) {
      if (c.due_at) {
        const dueTime = new Date(c.due_at).getTime();
        if (dueTime < now && !c.sla_breached) {
          // Flag breached
          db.updateComplaint(c.id, { sla_breached: true });

          // Audit Log
          db.addAuditLog({
            actor_id: null,
            actor_role: 'system',
            actor_name: 'FixItNow SLA Engine',
            entity: 'complaint',
            entity_id: c.id,
            action: 'SLA_BREACHED',
            old_value: { sla_breached: false },
            new_value: { sla_breached: true },
            reason: `Automated escalation: Target SLA time (${c.due_at}) passed without resolution.`
          });

          // Notify Municipal Admin
          if (c.municipality_id) {
            db.addNotification({
              user_id: null,
              role: 'municipal_admin',
              title: `⚠️ SLA Breached: ${c.complaint_number}`,
              message: `Ticket ${c.complaint_number} (${c.category}) is overdue and escalated.`,
              type: 'SLA_ALERT',
              complaint_id: c.id
            });
          }
        }
      }
    }
  }
};
