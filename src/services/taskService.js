/**
 * taskService.js — In-memory Task Manager service layer
 *
 * All task data lives in the `tasks` array. There is no database.
 * Data resets on server restart (or via _reset() in tests).
 *
 * Bug fixes applied:
 *   #1 — getPaginated: offset was `page * limit` (skipped first page).
 *        Fixed to `(page - 1) * limit` so page=1 starts at index 0.
 *   #2 — getByStatus: used String.includes() (partial match).
 *        Fixed to strict equality (===) to avoid false positives.
 *   #3 — completeTask: hardcoded `priority: 'medium'` on completion.
 *        Removed — priority should be preserved unchanged.
 *
 * New feature:
 *   assignTask() — stores an assignee name on the task object.
 */

const { v4: uuidv4 } = require('uuid');

// In-memory store — intentionally simple, no persistence
let tasks = [];

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/** Returns a shallow copy of the entire tasks array. */
const getAll = () => [...tasks];

/** Returns the task with the given id, or undefined if not found. */
const findById = (id) => tasks.find((t) => t.id === id);

/**
 * Returns tasks whose status EXACTLY matches the given string.
 *
 * FIX #2: was t.status.includes(status) — substring matching caused
 * unintended matches (e.g. "progress" matching "in_progress").
 */
const getByStatus = (status) => tasks.filter((t) => t.status === status);

/**
 * Returns a slice of tasks for the given 1-based page number and limit.
 *
 * FIX #1: offset was page * limit, which skipped the entire first page
 * when page=1 (offset=10 for limit=10). Correct formula: (page - 1) * limit.
 *
 * @param {number} page  - 1-based page number
 * @param {number} limit - items per page
 */
const getPaginated = (page, limit) => {
  const offset = (page - 1) * limit; // FIX: was page * limit
  return tasks.slice(offset, offset + limit);
};

/**
 * Returns counts per status and number of overdue tasks.
 * A task is overdue if it has a dueDate in the past AND is not 'done'.
 */
const getStats = () => {
  const now = new Date();
  const counts = { todo: 0, in_progress: 0, done: 0 };
  let overdue = 0;

  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status]++;
    if (t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now) {
      overdue++;
    }
  });

  return { ...counts, overdue };
};

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Creates a new task with a generated UUID and timestamps.
 * assignee defaults to null (unassigned).
 */
const create = ({ title, description = '', status = 'todo', priority = 'medium', dueDate = null }) => {
  const task = {
    id: uuidv4(),
    title: title.trim(),
    description: typeof description === 'string' ? description.trim() : '',
    status,
    priority,
    dueDate,
    assignee: null,   // null = unassigned; set via assignTask()
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
};

/**
 * Merges fields into the task with the given id.
 * Returns the updated task, or null if not found.
 */
const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  // Filter out internal fields that should NOT be updated via PUT
  const { id: _, createdAt, completedAt, ...allowedFields } = fields;

  // Cleanup inputs
  if (allowedFields.title) allowedFields.title = allowedFields.title.trim();
  if (allowedFields.description) allowedFields.description = allowedFields.description.trim();

  const updated = { ...tasks[index], ...allowedFields };
  tasks[index] = updated;
  return updated;
};

/** Removes a task by id. Returns true if removed, false if not found. */
const remove = (id) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  return true;
};

/**
 * Marks a task as complete: sets status='done' and records completedAt.
 *
 * FIX #3: was also setting priority: 'medium', silently overwriting
 * whatever priority the task had. Removed — priority is not affected
 * by task completion.
 *
 * Returns the updated task, or null if not found.
 */
const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    // NOTE: priority intentionally NOT set here (see FIX #3 above)
    status: 'done',
    completedAt: new Date().toISOString(),
  };

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};

/**
 * Assigns a task to an owner by name.
 * Allows reassignment — calling again overwrites the previous assignee.
 *
 * @param {string} id       - task uuid
 * @param {string} assignee - name of the person to assign the task to
 * @returns updated task object, or null if task not found
 */
const assignTask = (id, assignee) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  tasks[index] = { ...tasks[index], assignee };
  return tasks[index];
};

// ---------------------------------------------------------------------------
// Test utility — DO NOT call in production code
// ---------------------------------------------------------------------------

/** Clears the in-memory store. Used by tests to reset state between cases. */
const _reset = () => {
  tasks = [];
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  getAll,
  findById,
  getByStatus,
  getPaginated,
  getStats,
  create,
  update,
  remove,
  completeTask,
  assignTask,  // new feature
  _reset,
};
