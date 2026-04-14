/**
 * validators.js — Input validation helpers
 *
 * Each function returns a human-readable error string if validation fails,
 * or null if the input is valid. The route layer checks for a non-null
 * return and sends a 400 response.
 */

const VALID_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

// ---------------------------------------------------------------------------
// validateCreateTask
// ---------------------------------------------------------------------------

/**
 * Validates the request body for POST /tasks.
 * title is required; all other fields are optional but validated if present.
 *
 * @param {object} body - req.body
 * @returns {string|null} error message, or null if valid
 */
const validateCreateTask = (body) => {
  // title: required, non-empty string
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return 'title is required and must be a non-empty string';
  }
  // status: optional, must be a known value if provided
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  // priority: optional, must be a known value if provided
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  // dueDate: optional, must be a parseable ISO date string if provided
  if (body.dueDate && isNaN(Date.parse(body.dueDate))) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

// ---------------------------------------------------------------------------
// validateUpdateTask
// ---------------------------------------------------------------------------

/**
 * Validates the request body for PUT /tasks/:id.
 * All fields optional, but must be valid if provided.
 *
 * @param {object} body - req.body
 * @returns {string|null} error message, or null if valid
 */
const validateUpdateTask = (body) => {
  // title: if provided, must be a non-empty string
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim() === '')) {
    return 'title must be a non-empty string';
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (body.dueDate && isNaN(Date.parse(body.dueDate))) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

// ---------------------------------------------------------------------------
// validateAssignTask  [NEW — supports PATCH /tasks/:id/assign]
// ---------------------------------------------------------------------------

/**
 * Validates the request body for PATCH /tasks/:id/assign.
 *
 * Rules:
 *   - assignee must be present
 *   - assignee must be a string (not a number, boolean, etc.)
 *   - assignee must not be blank / whitespace-only
 *
 * Design note: We intentionally allow reassigning an already-assigned task.
 * The caller may want to transfer ownership, and rejecting reassignment
 * would require a separate "unassign" endpoint. Keep it simple for now.
 *
 * @param {object} body - req.body
 * @returns {string|null} error message, or null if valid
 */
const validateAssignTask = (body) => {
  // Must be present
  if (body.assignee === undefined || body.assignee === null) {
    return 'assignee is required';
  }
  // Must be a string (reject numbers, booleans, etc.)
  if (typeof body.assignee !== 'string') {
    return 'assignee must be a string';
  }
  // Must not be blank
  if (body.assignee.trim() === '') {
    return 'assignee must not be an empty string';
  }
  return null;
};

module.exports = {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
  VALID_STATUSES,
  VALID_PRIORITIES,
};
