import { apiRequest } from './api';

export function getTasks(projectId) {
  return apiRequest(`/api/projects/${projectId}/tasks`);
}

export function createTask(projectId, task) {
  return apiRequest(`/api/projects/${projectId}/tasks`, { method: 'POST', body: task });
}

// Used both for editing a task and for changing only its status.
export function updateTask(taskId, changes) {
  return apiRequest(`/api/tasks/${taskId}`, { method: 'PUT', body: changes });
}

export function deleteTask(taskId) {
  return apiRequest(`/api/tasks/${taskId}`, { method: 'DELETE' });
}
