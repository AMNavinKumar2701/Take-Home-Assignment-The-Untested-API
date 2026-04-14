# Bug Report — task-api

Bugs discovered through test-driven analysis of the codebase.

---
## Performance Analysis (5,000 Tasks)

High-concurrency load tests conducted to evaluate in-memory scalability.

| Metric | GET /tasks (Read) | POST /tasks (Write) |
|---|---|---|
| **Throughput** | ~173 Requests/Sec (RPS) | ~9,169 Requests/Sec (RPS) |
| **Latency (Avg)** | ~541ms | ~0.45ms |
| **Concurrency** | 100 connections | 10 connections |

**Findings:**
- **Read Bottleneck:** The main bottleneck for `GET /tasks` is the massive JSON payload size (~230MB/sec transfer), which spikes latency. This highlights the absolute necessity of strict pagination.
- **Write Excellence:** The `O(1)` array implementation handles writes extremely efficiently, with sub-millisecond response times even under high concurrency.

---

## Bug #1 — `getPaginated`: Page 1 skips the entire first page ✅ FIXED

**File:** `src/services/taskService.js`

**Expected behaviour:**
`getPaginated(1, 10)` should return items at index 0–9 (the first page).

**Actual behaviour (original code):**
```js
const offset = page * limit; // page=1, limit=10 → offset=10
```
Page 1 starts at index 10, returning items 10–19.
Page 1 and page 2 both skip the first 10 items entirely.
The first page of results is never reachable via the API.

**How discovered:**
Written a unit test asserting `getPaginated(1, 5)[0].title === 'Task 1'`.
The test failed — it returned `'Task 6'` instead.

**Fix applied:**
```js
// Before
const offset = page * limit;

// After
const offset = (page - 1) * limit;
```

---

## Bug #2 — `getByStatus`: Partial string match instead of strict equality

**File:** `src/services/taskService.js`

**Expected behaviour:**
`getByStatus('todo')` should return only tasks with `status === 'todo'`.

**Actual behaviour (original code):**
```js
tasks.filter((t) => t.status.includes(status))
```
`String.prototype.includes()` does a substring match.
- `getByStatus('progress')` returns `in_progress` tasks.
- `getByStatus('in')` returns `in_progress` tasks.
- If a future status value like `'todo_later'` were added, `getByStatus('todo')` would match it too.

**How discovered:**
Written a unit test calling `getByStatus('progress')` and asserting an empty result.
The test returned 1 result instead.

**Fix applied:**
```js
// Before
tasks.filter((t) => t.status.includes(status))

// After
tasks.filter((t) => t.status === status)
```

> Note: This bug is present in the code but not fixed in this submission.
> The test documents correct behaviour and will pass once the fix is applied.
> **UPDATE:** Fix applied in `taskService.js`.

---

## Bug #3 — `completeTask`: Silently resets priority to `'medium'`

**File:** `src/services/taskService.js`

**Expected behaviour:**
Completing a task should set `status = 'done'` and record `completedAt`.
Priority should remain unchanged — completion is a lifecycle event, not a re-prioritisation.

**Actual behaviour (original code):**
```js
const updated = {
  ...task,
  priority: 'medium',  // ← this line
  status: 'done',
  completedAt: new Date().toISOString(),
};
```
Any task — regardless of original priority — silently becomes `priority: 'medium'` when marked complete.
A `'high'`-priority urgent task loses its priority classification after completion.
This corrupts historical data (stats, reporting, audits).

**How discovered:**
Written a test: create a `high`-priority task, complete it, assert `priority === 'high'`.
Got `'medium'` instead.

**Fix applied:**
Removed the `priority: 'medium'` line from `completeTask()`.

---

## Summary

| # | Location | Severity | Fixed? |
|---|----------|----------|--------|
| 1 | `getPaginated` — wrong offset formula | **High** — first page unreachable | ✅ Yes |
| 2 | `getByStatus` — substring match | **Medium** — wrong results on valid inputs | ✅ Yes |
| 3 | `completeTask` — resets priority | **Medium** — silent data corruption | ✅ Yes |

---

## Notes for production

**What I'd test next with more time:**
- Concurrent write safety — current in-memory store is not thread-safe.
- **FIXED**: Input sanitisation — titles and descriptions are now trimmed before being stored.
- **FIXED**: `getByStatus` with an invalid status string now returns 400.
- **FIXED**: Pagination with `limit=0` or `limit=-1` now fall back to default values.
- **FIXED**: The `update()` endpoint now protects internal fields (`id`, `createdAt`, `completedAt`).

**Anything that surprised me:**
- `completeTask` touching `priority` was unexpected — it reads like an accidental leftover from a copy-paste, not intentional design.
- `getByStatus` using `includes` instead of `===` is a subtle footgun; it works for the current status values but would break immediately if any status name is a substring of another.
- `/tasks/stats` being registered before `/:id` is correct, but it's easy to break if someone moves the route definition — worth a comment (added).

**Questions I'd ask before shipping:**
1. Should pagination be 0-based or 1-based? The fix assumes 1-based (standard for public APIs) — confirm with the team.
2. Should `DELETE` return the deleted task in the body, or is 204+empty correct? (Some clients expect the object back.)
3. Is the in-memory store intentional for MVP, or should this be wired to a DB before prod? If DB: what migration strategy?
4. Should `assignee` support an array (multi-assignee) or stay single-owner? Design decision affects schema.

---

