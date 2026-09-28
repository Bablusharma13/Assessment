import { apiRequest } from './api';

export function getProjects() {
  return apiRequest('/api/projects');
}

export function getProject(projectId) {
  return apiRequest(`/api/projects/${projectId}`);
}

export function createProject(project) {
  return apiRequest('/api/projects', { method: 'POST', body: project });
}

export function updateProject(projectId, changes) {
  return apiRequest(`/api/projects/${projectId}`, { method: 'PUT', body: changes });
}

export function deleteProject(projectId) {
  return apiRequest(`/api/projects/${projectId}`, { method: 'DELETE' });
}
