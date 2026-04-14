/**
 * Unit Tests — taskService.js
 *
 * Tests the service layer directly (no HTTP layer involved).
 * Each describe block maps to one exported function.
 * _reset() is called in beforeEach so tests never share state.
 */

const taskService = require('../src/services/taskService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a task with sensible defaults; override any field you need. */
const makeTask = (overrides = {}) =>
  taskService.create({
    title: 'Default Task',
    description: 'desc',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    ...overrides,
  });

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Always start with a clean in-memory store.
  taskService._reset();
});

// ---------------------------------------------------------------------------
// create()
// ---------------------------------------------------------------------------

describe('create()', () => {
  test('returns a task with all expected fields', () => {
    const task = makeTask({ title: 'Write tests' });

    expect(task).toMatchObject({
      title: 'Write tests',
      description: 'desc',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
    });

    // id must be a uuid-v4-like string
    expect(typeof task.id).toBe('string');
    expect(task.id).toHaveLength(36);

    // createdAt must be a valid ISO date
    expect(new Date(task.createdAt).toISOString()).toBe(task.createdAt);
  });

  test('defaults: status=todo, priority=medium, description empty, dueDate null', () => {
    const task = taskService.create({ title: 'Minimal' });

    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.description).toBe('');
    expect(task.dueDate).toBeNull();
  });

  test('respects explicit status and priority values', () => {
    const task = makeTask({ status: 'in_progress', priority: 'high' });

    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
  });

  test('persists task — subsequent getAll() includes it', () => {
    const task = makeTask({ title: 'Persistent' });
    const all = taskService.getAll();

    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(task.id);
  });

  test('each task gets a unique id', () => {
    const t1 = makeTask({ title: 'A' });
    const t2 = makeTask({ title: 'B' });

    expect(t1.id).not.toBe(t2.id);
  });
});

// ---------------------------------------------------------------------------
// getAll()
// ---------------------------------------------------------------------------

describe('getAll()', () => {
  test('returns empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  test('returns all created tasks', () => {
    makeTask({ title: 'T1' });
    makeTask({ title: 'T2' });

    expect(taskService.getAll()).toHaveLength(2);
  });

  test('returns a copy — mutating the result does not affect the store', () => {
    makeTask({ title: 'Safe' });
    const result = taskService.getAll();

    // Mutate the returned array
    result.push({ id: 'fake', title: 'injected' });

    // Store should be unchanged
    expect(taskService.getAll()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// findById()
// ---------------------------------------------------------------------------

describe('findById()', () => {
  test('finds an existing task by id', () => {
    const task = makeTask({ title: 'Find me' });

    expect(taskService.findById(task.id)).toMatchObject({ title: 'Find me' });
  });

  test('returns undefined for a non-existent id', () => {
    expect(taskService.findById('does-not-exist')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getByStatus()
// ---------------------------------------------------------------------------

describe('getByStatus()', () => {
  test('returns only tasks matching the given status', () => {
    makeTask({ title: 'Todo 1', status: 'todo' });
    makeTask({ title: 'Todo 2', status: 'todo' });
    makeTask({ title: 'In Progress', status: 'in_progress' });

    const todos = taskService.getByStatus('todo');

    expect(todos).toHaveLength(2);
    todos.forEach((t) => expect(t.status).toBe('todo'));
  });

  test('returns empty array when no tasks match status', () => {
    makeTask({ title: 'Existing', status: 'todo' });

    expect(taskService.getByStatus('done')).toEqual([]);
  });

  /**
   * BUG NOTE (unfixed — see BUGS.md #2):
   * The current implementation uses String.prototype.includes() instead of
   * strict equality. A status like "in_progress" would match a search for
   * "progress" or "in". This test documents the *correct* behaviour.
   *
   * NOTE: This test will FAIL against the original code. Once bug #2 is fixed
   * (using === instead of includes) this test will pass.
   */
  test('does NOT do partial string matching on status', () => {
    makeTask({ title: 'In Progress Task', status: 'in_progress' });

    // "progress" is a substring of "in_progress" — should return nothing
    const result = taskService.getByStatus('progress');

    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getPaginated()
// ---------------------------------------------------------------------------

describe('getPaginated()', () => {
  beforeEach(() => {
    // Seed 15 tasks with predictable titles
    for (let i = 1; i <= 15; i++) {
      makeTask({ title: `Task ${i}` });
    }
  });

  /**
   * BUG NOTE (fixed — see BUGS.md #1 and taskService.js):
   * Original code: offset = page * limit → page 1 gives offset 10, skipping
   * the entire first page. Fixed to: (page - 1) * limit.
   */
  test('page 1 returns the first N items (not the second)', () => {
    const result = taskService.getPaginated(1, 5);

    // After fix: page 1 offset = (1-1)*5 = 0 → items 0..4
    expect(result).toHaveLength(5);
    expect(result[0].title).toBe('Task 1');
    expect(result[4].title).toBe('Task 5');
  });

  test('page 2 returns the second batch', () => {
    const result = taskService.getPaginated(2, 5);

    expect(result).toHaveLength(5);
    expect(result[0].title).toBe('Task 6');
  });

  test('last page may return fewer items than limit', () => {
    const result = taskService.getPaginated(3, 5); // items 10..14 = 5 items

    expect(result).toHaveLength(5);
    expect(result[0].title).toBe('Task 11');
  });

  test('page beyond total returns empty array', () => {
    const result = taskService.getPaginated(99, 10);

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getStats()
// ---------------------------------------------------------------------------

describe('getStats()', () => {
  test('returns all-zero counts for empty store', () => {
    const stats = taskService.getStats();

    expect(stats).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('counts tasks by status correctly', () => {
    makeTask({ status: 'todo' });
    makeTask({ status: 'todo' });
    makeTask({ status: 'in_progress' });
    makeTask({ status: 'done' });

    const stats = taskService.getStats();

    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  test('counts overdue tasks (past dueDate, not done)', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
    const futureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow

    makeTask({ status: 'todo', dueDate: pastDate });       // overdue
    makeTask({ status: 'in_progress', dueDate: pastDate }); // overdue
    makeTask({ status: 'done', dueDate: pastDate });        // NOT overdue (done)
    makeTask({ status: 'todo', dueDate: futureDate });      // NOT overdue
    makeTask({ status: 'todo', dueDate: null });            // NOT overdue (no due date)

    const stats = taskService.getStats();

    expect(stats.overdue).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// update()
// ---------------------------------------------------------------------------

describe('update()', () => {
  test('updates specified fields and returns the updated task', () => {
    const task = makeTask({ title: 'Old Title' });
    const updated = taskService.update(task.id, { title: 'New Title', priority: 'high' });

    expect(updated).toMatchObject({ title: 'New Title', priority: 'high' });
    // Unrelated fields remain unchanged
    expect(updated.status).toBe('todo');
  });

  test('returns null for a non-existent id', () => {
    expect(taskService.update('ghost-id', { title: 'x' })).toBeNull();
  });

  test('persists changes — getAll() reflects update', () => {
    const task = makeTask({ title: 'Before' });
    taskService.update(task.id, { title: 'After' });

    const found = taskService.findById(task.id);
    expect(found.title).toBe('After');
  });
});

// ---------------------------------------------------------------------------
// remove()
// ---------------------------------------------------------------------------

describe('remove()', () => {
  test('removes task and returns true', () => {
    const task = makeTask({ title: 'Doomed' });

    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
    expect(taskService.getAll()).toHaveLength(0);
  });

  test('returns false when task does not exist', () => {
    expect(taskService.remove('no-such-id')).toBe(false);
  });

  test('only removes the targeted task, not others', () => {
    const t1 = makeTask({ title: 'Keep' });
    const t2 = makeTask({ title: 'Remove' });

    taskService.remove(t2.id);

    expect(taskService.getAll()).toHaveLength(1);
    expect(taskService.findById(t1.id)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// completeTask()
// ---------------------------------------------------------------------------

describe('completeTask()', () => {
  test('sets status to done and completedAt to a timestamp', () => {
    const task = makeTask({ title: 'Finish me', status: 'in_progress' });
    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.completedAt).not.toBeNull();
    expect(new Date(completed.completedAt).toISOString()).toBe(completed.completedAt);
  });

  test('returns null for non-existent task', () => {
    expect(taskService.completeTask('ghost')).toBeNull();
  });

  /**
   * BUG NOTE (unfixed — see BUGS.md #3):
   * completeTask() currently hardcodes priority: 'medium', which silently
   * overwrites whatever priority the task had. A 'high'-priority task
   * becomes 'medium' after completion — unexpected and data-lossy.
   *
   * This test documents CORRECT behaviour (priority must be preserved).
   * It will FAIL against the original code until bug #3 is fixed.
   */
  test('preserves original priority — does NOT reset it to medium', () => {
    const task = makeTask({ title: 'Urgent', priority: 'high' });
    const completed = taskService.completeTask(task.id);

    expect(completed.priority).toBe('high'); // must not silently become 'medium'
  });

  test('persists completed state in the store', () => {
    const task = makeTask();
    taskService.completeTask(task.id);

    const found = taskService.findById(task.id);
    expect(found.status).toBe('done');
  });
});

// ---------------------------------------------------------------------------
// assignTask() — new feature
// ---------------------------------------------------------------------------

describe('assignTask()', () => {
  test('sets assignee on the task and returns updated task', () => {
    const task = makeTask({ title: 'Assignable' });
    const updated = taskService.assignTask(task.id, 'Alice');

    expect(updated.assignee).toBe('Alice');
  });

  test('returns null for non-existent task', () => {
    expect(taskService.assignTask('ghost', 'Bob')).toBeNull();
  });

  test('allows reassignment to a new owner', () => {
    const task = makeTask({ title: 'Reassign me' });
    taskService.assignTask(task.id, 'Alice');
    const updated = taskService.assignTask(task.id, 'Bob');

    expect(updated.assignee).toBe('Bob');
  });

  test('persists assignee — findById reflects it', () => {
    const task = makeTask({ title: 'Check persist' });
    taskService.assignTask(task.id, 'Charlie');

    expect(taskService.findById(task.id).assignee).toBe('Charlie');
  });
});
