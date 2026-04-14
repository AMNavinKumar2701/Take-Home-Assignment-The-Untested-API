A robust Node.js/Express API for managing tasks, built as part of a technical assignment. This version has been significantly enhanced for production readiness, featuring 100% test coverage, input sanitization, security protection for internal fields, and high-concurrency performance validation.

**Live Project URL:** [https://take-home-assignment-the-untested-api-hxf6.onrender.com](https://take-home-assignment-the-untested-api-hxf6.onrender.com)

##  Quick Start

### Prerequisites
- Node.js (v14+)
- npm

### Installation
```bash
git clone https://github.com/AMNavinKumar2701/Take-Home-Assignment-The-Untested-API.git
cd task-api
npm install
```

### Running the Server
```bash
npm start # runs on port 3000
```

### Running Tests
```bash
npm test         # basic test run
npm run coverage # test run with full coverage report
```

---

## 🛠 Features

- **Full CRUD**: Create, Read, Update, Delete tasks.
- **Advanced Filtering**: Filter by `status` (todo, in_progress, done).
- **Robust Pagination**: Supports `page` and `limit` query parameters with safety fallbacks for invalid inputs.
- **Task Assignment**: `PATCH /tasks/:id/assign` to assign owners.
- **Statistics**: `/tasks/stats` provides real-time counts and overdue task tracking.
- **Data Integrity**: Automatic string trimming and protection of immutable fields (id, timestamps).

---

## 🚦 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasks` | List all tasks |
| GET | `/tasks?status=todo` | Filter by status (strict validation) |
| GET | `/tasks?page=1&limit=10` | Paginated list (resilient parsing) |
| POST | `/tasks` | Create a task |
| PUT | `/tasks/:id` | Update a task (protects internal fields) |
| DELETE | `/tasks/:id` | Delete a task |
| PATCH | `/tasks/:id/complete` | Mark task as complete |
| PATCH | `/tasks/:id/assign` | Assign task to a user |
| GET | `/tasks/stats` | Counts by status + overdue count |

---

## 🚀 Testing the Live API

You can test the production API using the examples below. 

**Base URL:** `https://take-home-assignment-the-untested-api-hxf6.onrender.com`

### 1. Create a Task
- **Method:** `POST`
- **Path:** `/tasks`
- **Sample Input (JSON):**
  ```json
  {
    "title": "Build something great",
    "description": "Learn Express.js deployment",
    "priority": "high",
    "dueDate": "2026-12-31T00:00:00.000Z"
  }
  ```
- **cURL Command:**
  ```bash
  curl -X POST https://take-home-assignment-the-untested-api-hxf6.onrender.com/tasks \
       -H "Content-Type: application/json" \
       -d '{"title": "Build something great", "priority": "high"}'
  ```

### 2. List Tasks (with Pagination)
- **Method:** `GET`
- **Path:** `/tasks?page=1&limit=10`
- **cURL Command:**
  ```bash
  curl "https://take-home-assignment-the-untested-api-hxf6.onrender.com/tasks?status=todo&page=1&limit=5"
  ```

### 3. Assign a Task
- **Method:** `PATCH`
- **Path:** `/tasks/{id}/assign`
- **Sample Input (JSON):**
  ```json
  { "assignee": "Navin Kumar" }
  ```
- **cURL Command:**
  ```bash
  curl -X PATCH https://take-home-assignment-the-untested-api-hxf6.onrender.com/tasks/{id}/assign \
       -H "Content-Type: application/json" \
       -d '{"assignee": "Navin Kumar"}'
  ```

### 4. Mark as Complete
- **Method:** `PATCH`
- **Path:** `/tasks/{id}/complete`
- **cURL Command:**
  ```bash
  curl -X PATCH https://take-home-assignment-the-untested-api-hxf6.onrender.com/tasks/{id}/complete
  ```

### 5. Get Statistics
- **Method:** `GET`
- **Path:** `/tasks/stats`
- **cURL Command:**
  ```bash
  curl https://take-home-assignment-the-untested-api-hxf6.onrender.com/tasks/stats
  ```

---

## 🧪 Testing & Quality

This project maintains a **near 100% test coverage** suite (excluding global error handlers).

- **Unit Tests**: Direct validation of `taskService.js` logic.
- **Integration Tests**: Full HTTP request/response testing via `Supertest`.
- **Hardening Tests**: Specific test suite for edge cases, invalid query params, and malformed JSON.

### Performance Stats (5,000 Tasks)
During load testing with 5,000 in-memory tasks:
- **Write Throughput**: ~9,160 Requests/Sec
- **Read Latency**: ~540ms (for full list)
- **Recommendation**: Always use the built-in pagination for lists > 100 items to maintain sub-100ms response times.

---

## 🐛 Bug Fixes & Hardening

Detailed bug reports and fix logic can be found in [BUGS.md](./BUGS.md). Key fixes include:
- Fixed 1-based pagination offset calculation.
- Fixed status filtering to use strict equality instead of partial matching.
- Prevented task completion from accidentally resetting task priority.
- Added 400 errors for invalid query parameters.

---

## 📧 Submission Info
**Author:** Navin Kumar
**Assignment:** Take-Home Assignment: The Untested API

