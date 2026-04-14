/**
 * tasks.js — Express router for all /tasks endpoints
 *
 * Routes:
 *   GET    /tasks              - list all (supports ?status= and ?page=&limit=)
 *   POST   /tasks              - create task
 *   PUT    /tasks/:id          - update task
 *   DELETE /tasks/:id          - delete task
 *   PATCH  /tasks/:id/complete - mark complete
 *   PATCH  /tasks/:id/assign   - assign to a person [NEW]
 *   GET    /tasks/stats        - counts by status + overdue
 *
 * NOTE: /stats is registered BEFORE /:id so Express doesn't treat
 * "stats" as a dynamic :id parameter.
 */

const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
  VALID_STATUSES,
} = require('../utils/validators');

// ---------------------------------------------------------------------------
// GET /tasks/stats
// Must come before /:id routes to avoid "stats" being treated as an id.
// ---------------------------------------------------------------------------

router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

// ---------------------------------------------------------------------------
// GET /tasks
// ---------------------------------------------------------------------------

router.get('/', (req, res) => {
  const { status, page, limit } = req.query;

  // Filter by status if provided
  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }

  // Paginate if page or limit is provided
  if (page !== undefined || limit !== undefined) {
    let pageNum = parseInt(page);
    let limitNum = parseInt(limit);

    // Robust pagination: fallback to defaults for non-numeric or invalid values
    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (isNaN(limitNum) || limitNum < 1) limitNum = 10;

    const tasks = taskService.getPaginated(pageNum, limitNum);
    return res.json(tasks);
  }

  // Default: return all tasks
  const tasks = taskService.getAll();
  res.json(tasks);
});

// ---------------------------------------------------------------------------
// POST /tasks
// ---------------------------------------------------------------------------

router.post('/', (req, res) => {
  const error = validateCreateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.create(req.body);
  res.status(201).json(task);
});

// ---------------------------------------------------------------------------
// PUT /tasks/:id
// ---------------------------------------------------------------------------

router.put('/:id', (req, res) => {
  const error = validateUpdateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.update(req.params.id, req.body);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

// ---------------------------------------------------------------------------
// DELETE /tasks/:id
// ---------------------------------------------------------------------------

router.delete('/:id', (req, res) => {
  const deleted = taskService.remove(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.status(204).send();
});

// ---------------------------------------------------------------------------
// PATCH /tasks/:id/complete
// ---------------------------------------------------------------------------

router.patch('/:id/complete', (req, res) => {
  const task = taskService.completeTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

// ---------------------------------------------------------------------------
// PATCH /tasks/:id/assign  [NEW FEATURE]
//
// Assigns the task to a person. Accepts { assignee: "string" }.
// - 400 if assignee is missing, not a string, or blank
// - 404 if task does not exist
// - Allows reassignment (existing assignee is overwritten)
// ---------------------------------------------------------------------------

router.patch('/:id/assign', (req, res) => {
  // Validate assignee before touching the store
  const error = validateAssignTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.assignTask(req.params.id, req.body.assignee.trim());
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

module.exports = router;
