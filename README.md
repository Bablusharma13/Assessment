# Project & Task Management Tool

A simple internal tool where a logged-in user creates projects, adds tasks to them and moves each task through **Todo → In Progress → Done**. Every user sees only their own data.

| Deliverable       | Link                                                  |
| ----------------- | ----------------------------------------------------- |
| Frontend (Vercel) | https://task-manager-rose-rho.vercel.app                                        |
| Backend (Render)  | https://task-manager-api-jhw6.onrender.com            |
| Health check      | https://task-manager-api-jhw6.onrender.com/api/health |
| GitHub repository | https://github.com/Bablusharma13/Assessment           |
| FRD & planning    | [docs/PLANNING.md](docs/PLANNING.md)                  |

The backend runs on Render's free plan, which sleeps when idle, so the first request can take up to a minute.

## Features

- **Authentication:** register, log in, log out. Passwords are hashed with bcrypt, and a JWT (valid for 1 day) protects every project and task API.
- **Projects:** create, list (newest first), open, edit and delete. Deleting a project also deletes its tasks.
- **Tasks:** create, edit and delete tasks inside a project, and change the status from a dropdown on each card.
- **Ownership:** users can only read or change their own projects and tasks. Another user's item returns `403`, a missing item `404`, and an invalid id `400`.
- **Validation** on both sides. The backend is the source of truth; the frontend repeats the checks for instant feedback.
- **Clean UI:** loading, empty and error states, success toasts in the top-right corner, a responsive three-column task board, and an automatic logout with a "Session expired" message when the token is no longer valid.

## Tech stack

| Layer    | Technology                                                                          |
| -------- | ----------------------------------------------------------------------------------- |
| Backend  | Node.js, Express 5, MongoDB, Mongoose, JSON Web Tokens, bcryptjs, express-validator |
| Frontend | React 19, Vite, React Router, plain CSS, `fetch`                                    |
| Quality  | ESLint, Prettier, Node's built-in test runner + Supertest (85 backend tests)        |
| Hosting  | Vercel (frontend), Render (backend), MongoDB Atlas (database)                       |

## Architecture

```
Browser (React on Vercel)
   │  fetch + "Authorization: Bearer <JWT>"
   ▼
Express API (Render)
   cors → express.json → route → authenticate → validation → controller
                                                               │
                                     every error → errorHandler │ → consistent JSON
                                                               ▼
                                                  MongoDB Atlas (Mongoose)
```

**Backend.** Routes only connect URLs to middleware and controllers. Controllers hold the request logic. The `authenticate` middleware verifies the JWT and puts the user id on `req.user`, and ownership is always derived from that id, never from the request body. `findOwnedResource()` is the one place that enforces "missing → 404, someone else's → 403". Every error ends up in a single `errorHandler`, so all responses share one format:

```json
{ "success": true, "data": {} }
{ "success": false, "message": "Validation failed", "errors": [{ "field": "name", "message": "Project name is required" }] }
```

**Frontend.** `services/api.js` is the only file that calls `fetch`. It adds the token, parses JSON, turns failures into an `ApiError`, and logs the user out on a `401`. The pages load data and hold state. The components are small and reusable. The shared hooks are `useForm` (for the four controlled forms), `useLoadData` (loading, error and retry for a page) and `useFlashMessage`.

**Data model.** `User 1 ── * Project 1 ── * Task`. `Task` also stores `userId`, so task ownership is checked in one query. Indexes: `users.email` (unique), `projects {userId, createdAt}`, `tasks {projectId, createdAt}`.

## Folder structure

```
├── docs/PLANNING.md          FRD, database design, API design, plan
├── backend/
│   ├── server.js             connects to MongoDB, then starts Express
│   ├── src/
│   │   ├── app.js            middleware, routes, 404 and error handler
│   │   ├── config/           env.js (reads and checks env vars), db.js
│   │   ├── routes/           URL → middleware → controller (no logic)
│   │   ├── controllers/      auth, project and task request logic
│   │   ├── middleware/       authenticate, validate, notFound, errorHandler
│   │   ├── validators/       express-validator rules per resource
│   │   ├── models/           User, Project, Task (Mongoose schemas)
│   │   └── utils/            AppError, token (JWT), findOwnedResource
│   └── tests/                auth, project, task and app tests
└── frontend/
    ├── vercel.json           SPA rewrite so page refreshes work
    └── src/
        ├── services/         api.js (fetch wrapper) + auth/project/task services
        ├── context/          AuthContext + AuthProvider (session state)
        ├── hooks/            useForm, useLoadData, useFlashMessage
        ├── components/       Button, Input, Modal, TaskCard, StatusSelector, …
        ├── pages/            Login, Register, ProjectList, ProjectDetails
        ├── constants/        task statuses
        └── utils/            client validation, date formatting
```

## Local setup

**Requirements:** Node.js 22 and a MongoDB database (local, or a free MongoDB Atlas cluster).

### 1. Backend

Create `backend/.env`:

```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/task-manager
JWT_SECRET=<long random string, see below>
FRONTEND_URL=http://localhost:5173
```

```bash
cd backend
npm install
npm run dev               # http://localhost:5000, check /api/health
```

### 2. Frontend (in a second terminal)

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:5000
```

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

### Environment variables

`backend/.env`:

| Variable       | Description                                               | Local example                            |
| -------------- | --------------------------------------------------------- | ---------------------------------------- |
| `PORT`         | Port the API listens on (Render sets it automatically)    | `5000`                                   |
| `MONGODB_URI`  | MongoDB connection string                                 | `mongodb://127.0.0.1:27017/task-manager` |
| `JWT_SECRET`   | Long random string used to sign JWTs                      | output of the command below              |
| `FRONTEND_URL` | Exact frontend origin allowed by CORS (no trailing slash) | `http://localhost:5173`                  |
| `NODE_ENV`     | Optional. Set to `production` on Render                   | not needed locally                       |

Generate a secret: `node -p "require('crypto').randomBytes(32).toString('hex')"`

The server refuses to start if a required variable is missing or if `FRONTEND_URL` is `*`. A trailing slash or stray spaces in `FRONTEND_URL` are removed automatically.

`frontend/.env`:

| Variable       | Description                          | Local example           |
| -------------- | ------------------------------------ | ----------------------- |
| `VITE_API_URL` | Backend base URL (no trailing slash) | `http://localhost:5000` |

`.env` files are git-ignored and never committed. On Render and Vercel, the same variables are set in the dashboard.

### Scripts

| Folder   | Command          | What it does                                    |
| -------- | ---------------- | ----------------------------------------------- |
| backend  | `npm run dev`    | Start with auto-restart (nodemon)               |
| backend  | `npm start`      | Start for production                            |
| backend  | `npm test`       | Run the 85 API tests (needs MongoDB, see below) |
| backend  | `npm run lint`   | ESLint                                          |
| frontend | `npm run dev`    | Vite dev server                                 |
| frontend | `npm run build`  | Production build into `dist/`                   |
| frontend | `npm run lint`   | ESLint                                          |
| both     | `npm run format` | Prettier                                        |

Tests use a separate database, `mongodb://127.0.0.1:27017/task-manager-test`, which they wipe. Set `TEST_MONGODB_URI` to point them somewhere else. They never use `MONGODB_URI` from `.env`.

## API

All endpoints except auth and health need `Authorization: Bearer <token>`.

| Method | Endpoint                         | Body                                | Success                   |
| ------ | -------------------------------- | ----------------------------------- | ------------------------- |
| POST   | `/api/auth/register`             | `{ name, email, password }`         | `201 { token, user }`     |
| POST   | `/api/auth/login`                | `{ email, password }`               | `200 { token, user }`     |
| GET    | `/api/projects`                  | –                                   | `200 [project]`           |
| POST   | `/api/projects`                  | `{ name, description? }`            | `201 project`             |
| GET    | `/api/projects/:id`              | –                                   | `200 project`             |
| PUT    | `/api/projects/:id`              | `{ name?, description? }`           | `200 project`             |
| DELETE | `/api/projects/:id`              | –                                   | `200` (tasks deleted too) |
| GET    | `/api/projects/:projectId/tasks` | –                                   | `200 [task]`              |
| POST   | `/api/projects/:projectId/tasks` | `{ title, description?, status? }`  | `201 task`                |
| PUT    | `/api/tasks/:id`                 | `{ title?, description?, status? }` | `200 task`                |
| DELETE | `/api/tasks/:id`                 | –                                   | `200`                     |
| GET    | `/api/health`                    | –                                   | `200 { status: "ok" }`    |

Status codes: `400` validation or invalid id · `401` missing/invalid/expired token or wrong credentials · `403` another user's resource · `404` not found · `413` request body over 10 kB · `500` unexpected error (details are only logged on the server).

## Testing

**Automated (backend).** `npm test` in `backend/` runs 85 tests with Node's built-in test runner and Supertest against a real MongoDB test database. They cover:

- register and login, including a duplicate email, wrong credentials, bcrypt hashing and the 72-byte password limit
- JWT handling: a missing, invalid, forged, malformed or expired token
- project and task CRUD, newest-first ordering, cascade delete and status changes
- ownership: user A gets `403` for every read and write on user B's projects and tasks
- validation: required and blank fields, length limits, the status enum, and invalid ObjectIds
- NoSQL operator payloads (`{"$ne": null}`) and mass-assignment attempts (`userId`, `projectId`, `_id`, timestamps)
- invalid JSON, unreadable bodies, unknown routes, and a document deleted between load and save

**Lint and format.** `npm run lint` and `npx prettier --check .` pass in both `backend/` and `frontend/`.

**End-to-end (local).** The full flow was run in Chromium against the production frontend build (`vite build` + `vite preview`), the backend and a local MongoDB, automated with Playwright (the script is not part of this repo). The flow was: register (with validation errors) → auto-login → create project → open it → create tasks → Todo → In Progress → Done → edit and delete a task → refresh a deep link → edit and delete the project → log out → protected route redirects to login → wrong password → log in. The same run checked an invalid or expired token, another user's project (`403`), an invalid id, an unknown route, the server being unreachable or returning `500`, logging out in another tab, a 375 px mobile layout, and that the browser console shows no errors or warnings.

There are no automated frontend tests; see [Future improvements](#future-improvements).

**Production (backend).** The same API checks were run against the deployed backend (Render + MongoDB Atlas). They covered health, register and login, project and task CRUD, status updates, cross-user `403`s, invalid ids, NoSQL operator payloads, forged or expired tokens, mass assignment and CORS, and all passed. The only difference from local is a URL with broken percent-encoding (e.g. `%E0%A4%A`): Render's edge rejects it before it reaches the app, so it gets an HTML error page instead of the app's JSON `400`. The test users were deleted afterwards.

The deployed frontend has **not** been tested yet (see [Deployment](#deployment)).

## Deployment

1. **MongoDB Atlas.** Create a free cluster and a database user. Under _Network Access_, allow `0.0.0.0/0` (Render has no fixed IP on the free plan). Copy the `mongodb+srv://…` connection string and add a database name, e.g. `…mongodb.net/task-manager`.
2. **Render (backend).** Create a new _Web Service_ from the GitHub repo with root directory `backend`, build command `npm install` and start command `npm start`. Set `MONGODB_URI`, `JWT_SECRET` and `FRONTEND_URL`, plus `NODE_ENV=production`. Render sets `PORT` itself. Check that `https://<RENDER_URL>/api/health` returns `200`.
3. **Vercel (frontend).** Import the repo with root directory `frontend` (the Vite preset is detected). Set `VITE_API_URL=https://<RENDER_URL>`. Vite bakes this value in at build time, so redeploy after changing it. `vercel.json` rewrites all paths to `index.html`, so refreshing `/projects/123` works.
4. **CORS.** Set `FRONTEND_URL` on Render to the exact Vercel URL, e.g. `https://my-app.vercel.app`, with no trailing slash and no `*`, then redeploy the backend.

**Production check** (run on the deployed URLs before sharing them):

- [ ] `https://<RENDER_URL>/api/health` returns `{"success":true,"data":{"status":"ok"}}`
- [ ] Register a new user; you land on the project list
- [ ] Create, edit and delete a project
- [ ] Create a task, move it Todo → In Progress → Done, then edit and delete it
- [ ] Refresh on `/projects/<id>`: the page loads (Vercel rewrite) and you stay logged in
- [ ] Log out, then open `/projects`: you are sent to `/login`
- [ ] The browser console shows no CORS errors, and requests go to Render, not `localhost`

**Troubleshooting:**

| Symptom                        | Likely cause                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------- |
| CORS error in the browser      | `FRONTEND_URL` doesn't exactly match the Vercel origin                            |
| Frontend calls `localhost`     | `VITE_API_URL` wasn't set before the Vercel build                                 |
| Render deploy fails on startup | a missing env var (the log names it) or Atlas network access                      |
| 404 when refreshing a page     | `vercel.json` missing, or the wrong root directory                                |
| First request is very slow     | Render's free plan sleeps after 15 minutes of inactivity and takes ~1 min to wake |

## Assumptions and design decisions

- Each user works alone: no teams, sharing or roles. Registration logs the user in straight away.
- A task belongs to exactly one project and can't be moved to another project.
- **JWT in `localStorage`.** It's simple and survives a refresh, and it works across the Vercel and Render domains. The trade-off is that JavaScript can read it if an XSS bug exists. This is mitigated by React's escaping, not rendering raw HTML, a 1-day expiry, and logging out on any `401`. An httpOnly cookie would be safer, but it needs cross-site cookie and CSRF setup.
- **403 vs 404.** Another user's resource returns `403`, as the brief asks. Returning `404` would also hide that the id exists.
- **Passwords.** Minimum 8 characters, maximum 72 bytes (bcrypt ignores anything longer).
- **Input validation.** Every text field must be a real string. This blocks MongoDB operator injection such as `{"email": {"$ne": null}}`, and there is a test for it.
- **CORS is not authentication.** It only stops other websites' JavaScript from reading responses. Every project and task route still checks the JWT and ownership.

## Known limitations

Kept simple on purpose:

- Deleting a project runs two separate operations without a transaction: tasks first, then the project. If the same user creates a task at the exact moment they delete its project, that task can be left behind.
- There is no pagination and no rate limiting, including on login.
- The JWT lives in `localStorage` (see above), and there is no refresh token, so users log in again after 1 day.
- The registration form says when an email is already taken, so it reveals which emails have accounts. Login deliberately does not.
- Render's free plan sleeps when idle, so the first request after a break can take about a minute.

## Future improvements

- Rate limiting on the auth routes
- Pagination for projects and tasks
- httpOnly-cookie sessions with CSRF protection
- A MongoDB transaction for the cascade delete
- Frontend component tests and a committed end-to-end test suite
- Drag-and-drop between the board columns

## AI Usage Declaration

This project was built with AI assistance. The tool was **Claude Code** (Anthropic), used as a coding assistant in the editor. It was used for:

- **Planning:** drafting the FRD, the database and API design, and the implementation plan in `docs/PLANNING.md`. I reviewed and approved it before any code was written.
- **Implementation:** writing most of the backend (models, validators, controllers, middleware) and the frontend (API layer, auth context, pages and components), phase by phase against that plan.
- **Tests:** writing the backend test suite and running the local API and browser end-to-end checks described in [Testing](#testing).
- **Reviews and debugging:** security and code reviews that deliberately tried to break the app (cross-user access, injection, malformed tokens, mass assignment, invalid input). Each real issue it found was fixed. An example is the unhandled `DocumentNotFoundError` in commit `c98d404`.
- **Documentation:** this README and code comments.

I set the requirements and the scope, made the design decisions, reviewed the generated code, ran it, and checked the behaviour myself. Commits that AI helped with carry a `Co-Authored-By: Claude` trailer.
