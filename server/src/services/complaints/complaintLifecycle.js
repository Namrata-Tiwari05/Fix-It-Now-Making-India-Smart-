import { db } from '../db/index.js';

export const ALLOWED_TRANSITIONS = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['ASSIGNED', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS', 'ON_HOLD', 'UNDER_REVIEW'],
  IN_PROGRESS: ['RESOLUTION_SUBMITTED', 'ON_HOLD'],
  ON_HOLD: ['IN_PROGRESS', 'UNDER_REVIEW'],
  RESOLUTION_SUBMITTED: ['VERIFICATION', 'REOPENED'],
  VERIFICATION: ['RESOLVED', 'REOPENED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS'],
  REJECTED: ['UNDER_REVIEW']
};

export const complaintLifecycleService = {
  /**
   * Validate if transition from current to next state is permitted
   * @param {string} currentStatus 
   * @param {string} nextStatus 
   * @returns {boolean}
   */
  isValidTransition(currentStatus, nextStatus) {
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    return allowed.includes(nextStatus);
  },

  /**
   * Update complaint status with strict state machine and audit logging
   */
  transitionStatus({ complaintId, nextStatus, actor, reason = null }) {
    const complaint = db.getComplaintById(complaintId);
    if (!complaint) {
      throw { statusCode: 404, message: 'Complaint not found' };
    }

    if (!this.isValidTransition(complaint.status, nextStatus)) {
      throw {
        statusCode: 400,
        message: `Invalid state transition: Cannot change status from '${complaint.status}' to '${nextStatus}'. Permitted transitions: [${(ALLOWED_TRANSITIONS[complaint.status] || []).join(', ')}]`
      };
    }

    const previousStatus = complaint.status;
    const updates = { status: nextStatus };

    if (nextStatus === 'REOPENED') {
      updates.reopen_count = (complaint.reopen_count || 0) + 1;
    }

    const updated = db.updateComplaint(complaintId, updates);

    // Immutable Audit Log
    db.addAuditLog({
      actor_id: actor.id,
      actor_role: actor.role,
      actor_name: actor.name,
      entity: 'complaint',
      entity_id: complaint.id,
      action: 'STATUS_CHANGE',
      old_value: { status: previousStatus },
      new_value: { status: nextStatus },
      reason
    });

    // Notifications
    if (complaint.citizen_id) {
      db.addNotification({
        user_id: complaint.citizen_id,
        role: 'citizen',
        title: `Status Updated: ${nextStatus.replace('_', ' ')}`,
        message: `Your report ${complaint.complaint_number} status changed from ${previousStatus} to ${nextStatus}.`,
        type: 'STATUS_CHANGE',
        complaint_id: complaint.id
      });
    }

    return updated;
  }
};
