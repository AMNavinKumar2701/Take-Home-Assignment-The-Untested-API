/**
 * Integration Tests — API Routes
 *
 * Uses Supertest to fire real HTTP requests against the Express app.
 * Tests the full request/response cycle: routing, validation, service, response shape.
 *
 * Each describe block maps to one endpoint or logical group.
 * The in-memory store is reset via POST / service._reset() in beforeEach
 * to keep tests fully isolated.
 */

const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

// ---------------------------------------------------------------------------
// Helper — create a task via the API and return its body
// ---------------------------------------------------------------------------
const createTask = (overrides = {}) =>
  request(app)
    .post('/tasks')
    .send({
      title: 'Test Task',
      description: 'Integration test task',
      status: 'todo',
      priority: 'medium',
      ...overrides,
    });

beforeEach(() => {
  taskService._reset();
});

// ===========================================================================
// GET /tasks
// ===========================================================================

describe('GET /tasks', () => {
  test('returns 200 and empty array when no tasks exist', async () => {
    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all tasks', async () => {
    await createTask({ title: 'Task A' });
    await createTask({ title: 'Task B' });

    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // Filtering by status
  // -------------------------------------------------------------------------

  test('?status=todo returns only todo tasks', async () => {
    await createTask({ title: 'Todo Task', status: 'todo' });
    await createTask({ title: 'Done Task', status: 'done' });

    const res = await request(app).get('/tasks?status=todo');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('todo');
  });

  test('?status filter returns empty array for unmatched status', async () => {
    await createTask({ title: 'Todo Only', status: 'todo' });

    const res = await request(app).get('/tasks?status=done');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  /**
   * BUG NOTE (fixed — see BUGS.md #1):
   * Before fix: page=1 returned items starting at index 10, skipping the first page.
   * After fix: page=1 starts at index 0.
   */
  test('?page=1&limit=2 returns the first 2 tasks', async () => {
    await createTask({ title: 'First' });
    await createTask({ title: 'Second' });
    await createTask({ title: 'Third' });

    const res = await request(app).get('/tasks?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('First');
  });

  test('?page=2&limit=2 returns the second batch', async () => {
    await createTask({ title: 'First' });
    await createTask({ title: 'Second' });
    await createTask({ title: 'Third' });

    const res = await request(app).get('/tasks?page=2&limit=2');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Third');
  });

  test('pagination beyond total returns empty array', async () => {
    await createTask({ title: 'Only Task' });

    const res = await request(app).get('/tasks?page=99&limit=10');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ===========================================================================
// POST /tasks
// ===========================================================================

describe('POST /tasks', () => {
  test('creates a task and returns 201 with full task object', async () => {
    const res = await createTask({ title: 'New Task', description: 'Desc', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'New Task',
      description: 'Desc',
      priority: 'high',
      status: 'todo',
      completedAt: null,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  test('400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({ description: 'No title' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  test('400 when title is empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  test('400 when status is invalid', async () => {
    const res = await request(app).post('/tasks').send({ title: 'T', status: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/i);
  });

  test('400 when priority is invalid', async () => {
    const res = await request(app).post('/tasks').send({ title: 'T', priority: 'critical' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority/i);
  });

  test('400 when dueDate is not a valid ISO string', async () => {
    const res = await request(app).post('/tasks').send({ title: 'T', dueDate: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dueDate/i);
  });

  test('accepts valid dueDate ISO string', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Dated', dueDate: '2025-12-31T00:00:00.000Z' });

    expect(res.status).toBe(201);
    expect(res.body.dueDate).toBe('2025-12-31T00:00:00.000Z');
  });
});

// ===========================================================================
// PUT /tasks/:id
// ===========================================================================

describe('PUT /tasks/:id', () => {
  test('updates a task and returns the updated object', async () => {
    const created = await createTask({ title: 'Old' });
    const id = created.body.id;

    const res = await request(app)
      .put(`/tasks/${id}`)
      .send({ title: 'New Title', priority: 'high' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New Title');
    expect(res.body.priority).toBe('high');
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app).put('/tasks/ghost-id').send({ title: 'X' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('400 when title update is empty string', async () => {
    const created = await createTask();
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
  });

  test('400 when status update is invalid', async () => {
    const created = await createTask();
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ status: 'nope' });

    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// DELETE /tasks/:id
// ===========================================================================

describe('DELETE /tasks/:id', () => {
  test('deletes a task and returns 204 with no body', async () => {
    const created = await createTask();
    const id = created.body.id;

    const res = await request(app).delete(`/tasks/${id}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app).delete('/tasks/ghost-id');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('task is truly removed — subsequent GET /tasks does not include it', async () => {
    const created = await createTask({ title: 'Deleted' });
    const id = created.body.id;

    await request(app).delete(`/tasks/${id}`);

    const all = await request(app).get('/tasks');
    expect(all.body.find((t) => t.id === id)).toBeUndefined();
  });
});

// ===========================================================================
// PATCH /tasks/:id/complete
// ===========================================================================

describe('PATCH /tasks/:id/complete', () => {
  test('marks task as done and returns updated task', async () => {
    const created = await createTask({ status: 'in_progress' });
    const id = created.body.id;

    const res = await request(app).patch(`/tasks/${id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app).patch('/tasks/ghost-id/complete');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('completedAt is a valid ISO string', async () => {
    const created = await createTask();
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);

    expect(new Date(res.body.completedAt).toISOString()).toBe(res.body.completedAt);
  });

  /**
   * BUG NOTE (unfixed — see BUGS.md #3):
   * completeTask() resets priority to 'medium'. This test documents the
   * correct behaviour — priority should be unchanged after completion.
   * Will FAIL on original code; passes once bug #3 is fixed.
   */
  test('does NOT change priority when completing a high-priority task', async () => {
    const created = await createTask({ priority: 'high' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);

    expect(res.body.priority).toBe('high');
  });
});

// ===========================================================================
// GET /tasks/stats
// ===========================================================================

describe('GET /tasks/stats', () => {
  test('returns zero counts for empty store', async () => {
    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('counts tasks correctly by status', async () => {
    await createTask({ status: 'todo' });
    await createTask({ status: 'todo' });
    await createTask({ status: 'in_progress' });
    await createTask({ status: 'done' });

    const res = await request(app).get('/tasks/stats');

    expect(res.body.todo).toBe(2);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
  });

  test('overdue count excludes done tasks and tasks without dueDate', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();

    await createTask({ status: 'todo', dueDate: past });        // overdue
    await createTask({ status: 'in_progress', dueDate: past }); // overdue
    await createTask({ status: 'done', dueDate: past });        // NOT overdue (done)
    await createTask({ status: 'todo', dueDate: future });      // NOT overdue (future)
    await createTask({ status: 'todo' });                        // NOT overdue (no date)

    const res = await request(app).get('/tasks/stats');

    expect(res.body.overdue).toBe(2);
  });
});

// ===========================================================================
// PATCH /tasks/:id/assign  — new feature
// ===========================================================================

describe('PATCH /tasks/:id/assign', () => {
  test('assigns a user and returns 200 with updated task', async () => {
    const created = await createTask({ title: 'Assignable' });
    const id = created.body.id;

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  test('returns 404 when task does not exist', async () => {
    const res = await request(app)
      .patch('/tasks/ghost-id/assign')
      .send({ assignee: 'Bob' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('returns 400 when assignee is missing', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/i);
  });

  test('returns 400 when assignee is an empty string', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/i);
  });

  test('returns 400 when assignee is not a string', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 123 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/i);
  });

  test('allows reassignment — overwrites existing assignee', async () => {
    const created = await createTask();
    const id = created.body.id;

    await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'Alice' });
    const res = await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'Bob' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  test('returned task includes all original fields plus assignee', async () => {
    const created = await createTask({ title: 'Full Task', priority: 'high' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Charlie' });

    expect(res.body).toMatchObject({
      title: 'Full Task',
      priority: 'high',
      assignee: 'Charlie',
    });
  });
});

// ===========================================================================
// Production Hardening & Edge Cases
// ===========================================================================

describe('Production Hardening & Edge Cases', () => {
  test('GET /tasks?status=invalid returns 400', async () => {
    const res = await request(app).get('/tasks?status=super-done');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid status/i);
  });

  test('GET /tasks?page=0&limit=-5 falls back to 1 and 10', async () => {
    await createTask({ title: 'Task 1' });
    const res = await request(app).get('/tasks?page=0&limit=-5');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1); // Should return the task using default limits
  });

  test('POST /tasks trims title and description', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: '   Trim Me   ', description: '   Space   ' });

    expect(res.body.title).toBe('Trim Me');
    expect(res.body.description).toBe('Space');
  });

  test('PUT /tasks/:id trims updated title', async () => {
    const created = await createTask();
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: '   New Title   ' });

    expect(res.body.title).toBe('New Title');
  });

  test('PUT /tasks/:id cannot overwrite id or createdAt', async () => {
    const created = await createTask();
    const originalId = created.body.id;
    const originalCreatedAt = created.body.createdAt;

    const res = await request(app)
      .put(`/tasks/${originalId}`)
      .send({ id: 'hacked-id', createdAt: '2000-01-01T00:00:00.000Z', title: 'New' });

    expect(res.body.id).toBe(originalId);
    expect(res.body.createdAt).toBe(originalCreatedAt);
  });

  test('PUT /tasks/:id returns 400 for invalid priority', async () => {
    const created = await createTask();
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ priority: 'ultra-high' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority/i);
  });

  test('PUT /tasks/:id returns 400 for invalid dueDate', async () => {
    const created = await createTask();
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ dueDate: 'yesterday' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dueDate/i);
  });
});
