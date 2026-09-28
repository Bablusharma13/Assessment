# Project & Task Management Tool — FRD and Planning

## 1. Functional Requirements (FRD)

### 1.1 Purpose

A simple internal tool where a logged-in user manages their own projects and the tasks inside them.

### 1.2 Feature list

| #   | Feature                        | Description                                                                 |
| --- | ------------------------------ | --------------------------------------------------------------------------- |
| F1  | Register                       | Create an account with name, email and password                             |
| F2  | Login                          | Log in with email and password and receive a JWT                            |
| F3  | Logout                         | Clear the stored token on the client                                        |
| F4  | Project list                   | See all of your own projects, newest first                                  |
| F5  | Create / edit / delete project | Name (required) and description (optional). Deleting also deletes tasks     |
| F6  | Project details                | See one project and its tasks                                               |
| F7  | Create / edit / delete task    | Title (required), description (optional), status (defaults to Todo)         |
| F8  | Update task status             | Change between Todo, In Progress and Done from a dropdown on the task card  |
| F9  | Route protection               | Logged-out users go to Login; an expired or invalid token logs the user out |

### 1.3 User flow

```
Register ──► (auto-login) ──┐
Login ──────────────────────┴──► Project List ──► Create Project (modal)
                                      │
                                      ▼ open a project
                                Project Details ──► Create Task (modal)
                                      │
                                      ▼
                         Change status via StatusSelector on a TaskCard
                         Edit / Delete task (modal)
Any 401 from the API ──► token cleared ──► Login ("Session expired")
```

### 1.4 Basic validations

| Entity    | Rule                                                          | Error                                  |
| --------- | ------------------------------------------------------------- | -------------------------------------- |
| Register  | `name` required, trimmed, max 50 characters                   | 400                                    |
|           | `email` required and a valid email (stored in lowercase)      | 400                                    |
|           | `password` required, 8+ characters (max 72 bytes for bcrypt)  | 400                                    |
|           | email must be unique                                          | 400 "This email is already registered" |
| Login     | `email` and `password` required                               | 400                                    |
|           | wrong email or wrong password                                 | 401 (same generic message for both)    |
| Project   | `name` required, not blank after trimming, max 100 characters | 400                                    |
|           | `description` optional, max 500 characters                    | 400                                    |
|           | project must belong to the authenticated user                 | 403                                    |
| Task      | `title` required, not blank, max 100 characters               | 400                                    |
|           | `status` must be `Todo`, `In Progress` or `Done`              | 400                                    |
|           | project must exist                                            | 404                                    |
|           | project/task must belong to the authenticated user            | 403                                    |
| All `:id` | must be a valid MongoDB ObjectId                              | 400                                    |

The frontend repeats the basic checks for instant feedback; the backend is the source of truth.

### 1.5 Assumptions

1. Each user sees only their own data. There are no teams, sharing or roles.
2. Registration logs the user in immediately (returns a token).
3. Deleting a project deletes all of its tasks.
4. A task belongs to exactly one project and cannot be moved.
5. No pagination, search, due dates or assignees (not required).
6. The JWT is valid for 1 day. There is no refresh token.
7. `PUT /api/tasks/:id` handles both editing fields and changing the status.
8. Another user's resource returns **403**; a missing resource returns **404**.

## 2. Database design (MongoDB + Mongoose)

```
User 1 ──── * Project 1 ──── * Task
  └─────────────────────────────┘  (Task.userId for fast ownership checks)
```

| Model   | Fields                                                                                                              | Indexes                           |
| ------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| User    | `name`, `email` (unique, lowercase), `password` (bcrypt hash, `select: false`), timestamps                          | unique `email`                    |
| Project | `name`, `description`, `userId` (ref User), timestamps                                                              | `{ userId: 1, createdAt: -1 }`    |
| Task    | `title`, `description`, `status` (enum, default `Todo`), `projectId` (ref Project), `userId` (ref User), timestamps | `{ projectId: 1, createdAt: -1 }` |

- **Project.userId → User**: marks the owner; every project query filters by it.
- **Task.projectId → Project**: lists a project's tasks and deletes them with the project.
- **Task.userId → User**: intentionally duplicated so task ownership is checked in one query without loading the project.
- **References, not embedding**: tasks are created and updated on their own, and embedded arrays grow without limit.

## 3. API design

Success response: `{ "success": true, "data": ... }`
Error response: `{ "success": false, "message": "...", "errors": [{ "field", "message" }] }` (`errors` only for validation)

| Method | Endpoint                         | Auth | Body                                | Success               | Common errors      |
| ------ | -------------------------------- | ---- | ----------------------------------- | --------------------- | ------------------ |
| POST   | `/api/auth/register`             | No   | `{ name, email, password }`         | 201 `{ token, user }` | 400                |
| POST   | `/api/auth/login`                | No   | `{ email, password }`               | 200 `{ token, user }` | 400, 401           |
| GET    | `/api/projects`                  | Yes  | –                                   | 200 `[project]`       | 401                |
| POST   | `/api/projects`                  | Yes  | `{ name, description? }`            | 201 `project`         | 400, 401           |
| GET    | `/api/projects/:id`              | Yes  | –                                   | 200 `project`         | 400, 401, 403, 404 |
| PUT    | `/api/projects/:id`              | Yes  | `{ name?, description? }`           | 200 `project`         | 400, 401, 403, 404 |
| DELETE | `/api/projects/:id`              | Yes  | –                                   | 200 `{ message }`     | 400, 401, 403, 404 |
| GET    | `/api/projects/:projectId/tasks` | Yes  | –                                   | 200 `[task]`          | 400, 401, 403, 404 |
| POST   | `/api/projects/:projectId/tasks` | Yes  | `{ title, description?, status? }`  | 201 `task`            | 400, 401, 403, 404 |
| PUT    | `/api/tasks/:id`                 | Yes  | `{ title?, description?, status? }` | 200 `task`            | 400, 401, 403, 404 |
| DELETE | `/api/tasks/:id`                 | Yes  | –                                   | 200 `{ message }`     | 400, 401, 403, 404 |
| GET    | `/api/health`                    | No   | –                                   | 200                   | –                  |

Protected endpoints require `Authorization: Bearer <token>`.

## 4. Backend architecture

```
Request → cors → express.json → route → [authenticate] → [validation] → controller → Mongoose
                                   └── any thrown error ──► errorHandler → consistent JSON
```

- `routes/` only connect URLs to middleware and controllers.
- `controllers/` contain the request logic.
- `middleware/` holds JWT authentication, validation, 404 and the central error handler.
- `utils/AppError.js` lets any layer throw an error with a status code.
- Express 5 forwards errors from async handlers to the error handler automatically.

## 5. Frontend architecture

- Vite + React + React Router. `fetch` is wrapped in a single `services/api.js`.
- `services/` (auth, project, task) are the only place that talks to the API.
- `context/AuthContext` stores the user and token and exposes login/logout.
- `pages/` own data loading and state; `components/` are reusable presentational pieces.
- The JWT is stored in `localStorage`: simple and survives a refresh, but readable by JavaScript if an XSS bug exists. This is mitigated by React's escaping, a 1-day expiry and logout on any 401. An httpOnly cookie would be more secure but needs cross-site cookie and CSRF setup between Vercel and Render.

## 6. Implementation plan

1. Backend setup (config, app, error handling, health check)
2. Authentication (User model, register, login, JWT middleware)
3. Project CRUD with ownership checks
4. Task CRUD with status updates
5. Frontend authentication (API layer, auth context, protected routes)
6. Project and task UI with reusable components
7. Integration testing and error-handling fixes
8. README, deployment (Render, Vercel, MongoDB Atlas), Loom preparation
