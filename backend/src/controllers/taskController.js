import { matchedData } from 'express-validator';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { findOwnedResource } from '../utils/findOwnedResource.js';

// GET /api/projects/:projectId/tasks
export async function getProjectTasks(req, res) {
  const project = await findOwnedResource(Project, req.params.projectId, req.user.id, 'Project');
  const tasks = await Task.find({ projectId: project._id }).sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: tasks });
}

// POST /api/projects/:projectId/tasks
export async function createTask(req, res) {
  // A task can only be added to a project that exists and belongs to the user.
  const project = await findOwnedResource(Project, req.params.projectId, req.user.id, 'Project');
  const { title, description, status } = req.body;

  // projectId comes from the checked project and userId from the JWT — never from the body.
  const task = await Task.create({
    title,
    description,
    status,
    projectId: project._id,
    userId: req.user.id,
  });

  res.status(201).json({ success: true, data: task });
}

// PUT /api/tasks/:id — edits fields and/or changes the status
export async function updateTask(req, res) {
  const task = await findOwnedResource(Task, req.params.id, req.user.id, 'Task');

  // Only title, description and status are validated, so only they can change.
  // projectId, userId and timestamps in the body are ignored (a task cannot move projects).
  const updates = matchedData(req, { locations: ['body'] });
  Object.assign(task, updates);
  await task.save();

  res.status(200).json({ success: true, data: task });
}

// DELETE /api/tasks/:id
export async function deleteTask(req, res) {
  const task = await findOwnedResource(Task, req.params.id, req.user.id, 'Task');
  await task.deleteOne();

  res.status(200).json({ success: true, data: { message: 'Task deleted successfully' } });
}
