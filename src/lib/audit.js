/**
 * Audit & timestamp utilities for tracking changes and record modifications
 */

/**
 * Format a date/time for display
 * @param {Date|string} date - Date to format
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export function formatDateTime(date, includeTime = true) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (Number.isNaN(dateObj.getTime())) {
    return 'Unknown';
  }

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return dateObj.toLocaleDateString('en-US', options);
}

/**
 * Get relative time display (e.g., "2 hours ago", "3 days ago")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (Number.isNaN(dateObj.getTime())) {
    return 'Unknown';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return formatDateTime(date, false);
}

/**
 * Create an audit entry for a record change
 * @param {Object} options - Audit entry options
 * @returns {Object} Audit entry object
 */
export function createAuditEntry({
  action, // 'create', 'update', 'delete', etc.
  recordType, // 'cow', 'breeding', 'health', etc.
  recordId,
  userId = 'current-user', // Would come from auth context
  userName = 'You',
  changes = {}, // { field: { before, after } }
  notes = '',
}) {
  return {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action,
    recordType,
    recordId,
    userId,
    userName,
    changes,
    notes,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/**
 * Format an audit entry for display
 * @param {Object} entry - Audit entry object
 * @returns {string} Formatted audit message
 */
export function formatAuditEntry(entry) {
  const timeStr = formatDateTime(entry.timestamp);
  const actionStr = entry.action.charAt(0).toUpperCase() + entry.action.slice(1);

  return `${actionStr} by ${entry.userName} on ${timeStr}`;
}

/**
 * Get display text for what changed
 * @param {Object} changes - Changes object { field: { before, after } }
 * @returns {string} Human-readable change summary
 */
export function getChangeSummary(changes) {
  const fields = Object.entries(changes)
    .map(([field, { before, after }]) => `${field}: "${before}" → "${after}"`)
    .join(', ');

  return fields || 'No changes recorded';
}

/**
 * Create a change history entry
 * @param {string} fieldName - Field that changed
 * @param {any} oldValue - Previous value
 * @param {any} newValue - New value
 * @returns {Object} Change entry
 */
export function createChangeEntry(fieldName, oldValue, newValue) {
  return {
    field: fieldName,
    before: oldValue,
    after: newValue,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get last modified info for display
 * @param {Object} record - Record object with updatedAt/lastModified
 * @returns {Object} { timestamp, relativeTime, formattedTime }
 */
export function getLastModifiedInfo(record) {
  const timestamp = record.updatedAt || record.lastModified || record.createdAt;

  if (!timestamp) {
    return {
      timestamp: null,
      relativeTime: 'Unknown',
      formattedTime: 'Unknown',
    };
  }

  return {
    timestamp,
    relativeTime: getRelativeTime(timestamp),
    formattedTime: formatDateTime(timestamp),
  };
}

/**
 * Compare two values and return if they're different
 * @param {any} value1 - First value
 * @param {any} value2 - Second value
 * @returns {boolean} True if values are different
 */
export function hasChanged(value1, value2) {
  if (typeof value1 === 'object' && typeof value2 === 'object') {
    return JSON.stringify(value1) !== JSON.stringify(value2);
  }
  return value1 !== value2;
}

/**
 * Get a change description for logging
 * @param {Object} before - State before change
 * @param {Object} after - State after change
 * @returns {Object} Changes grouped by field
 */
export function getChangedFields(before, after) {
  const changes = {};

  Object.keys({ ...before, ...after }).forEach((key) => {
    if (hasChanged(before[key], after[key])) {
      changes[key] = {
        before: before[key],
        after: after[key],
      };
    }
  });

  return changes;
}

/**
 * Log action to audit trail (mock implementation)
 * In production, this would send to backend logging service
 * @param {Object} auditEntry - Audit entry to log
 */
export function logToAuditTrail(auditEntry) {
  // In production, send to backend API
  console.info('[AUDIT]', auditEntry);

  // Store in browser session (would be cleared on page reload)
  const auditLog = sessionStorage.getItem('auditLog');
  const log = auditLog ? JSON.parse(auditLog) : [];
  log.push(auditEntry);
  sessionStorage.setItem('auditLog', JSON.stringify(log));
}

/**
 * Get audit trail from session
 * @returns {Array} Audit log entries
 */
export function getAuditTrail() {
  const auditLog = sessionStorage.getItem('auditLog');
  return auditLog ? JSON.parse(auditLog) : [];
}

/**
 * Clear audit trail (for testing)
 */
export function clearAuditTrail() {
  sessionStorage.removeItem('auditLog');
}
