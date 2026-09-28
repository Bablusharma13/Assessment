import { matchedData } from 'express-validator';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { findOwnedResource } from '../utils/findOwnedResource.js';

// GET /api/projects
export async function getProjects(req, res) {
  const projects = await Project.find({ userId: req.user.id }).sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: projects });
}

// POST /api/projects
export async function createProject(req, res) {
  const { name, description } = req.body;

  // The owner comes from the verified JWT, never from the request body.
  const project = await Project.create({ name, description, userId: req.user.id });

  res.status(201).json({ success: true, data: project });
}

// GET /api/projects/:id
export async function getProject(req, res) {
  const project = await findOwnedResource(Project, req.params.id, req.user.id, 'Project');

  res.status(200).json({ success: true, data: project });
}

// PUT /api/projects/:id
export async function updateProject(req, res) {
  const project = await findOwnedResource(Project, req.params.id, req.user.id, 'Project');

  // matchedData returns only the validated fields (name, description).
  // Anything else in the body — userId, createdAt, _id — is ignored.
  const updates = matchedData(req, { locations: ['body'] });
  Object.assign(project, updates);
  await project.save();

  res.status(200).json({ success: true, data: project });
}

// DELETE /api/projects/:id
export async function deleteProject(req, res) {
  const project = await findOwnedResource(Project, req.params.id, req.user.id, 'Project');

  // Tasks are deleted first. If the request fails halfway, the project still exists,
  // so the user can simply delete it again — no task is ever left without a project.
  await Task.deleteMany({ projectId: project._id });
  await project.deleteOne();

  res.status(200).json({ success: true, data: { message: 'Project deleted successfully' } });
}
