import { useState } from 'react';
import * as projectService from '../services/projectService';
import { useLoadData } from '../hooks/useLoadData';
import { useFlashMessage } from '../hooks/useFlashMessage';
import { Button } from '../components/Button';
import { Loader } from '../components/Loader';
import { ErrorMessage } from '../components/ErrorMessage';
import { Toast } from '../components/Toast';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectForm } from '../components/ProjectForm';

export function ProjectListPage() {
  const {
    data: projects,
    setData: setProjects,
    isLoading,
    error,
    canRetry,
    retry,
  } = useLoadData(projectService.getProjects);

  // Which dialog is open: null, { type: 'create' }, { type: 'edit', project } or { type: 'delete', project }
  const [dialog, setDialog] = useState(null);
  const [successMessage, showSuccess] = useFlashMessage();

  const closeDialog = () => setDialog(null);

  async function handleCreate(values) {
    const newProject = await projectService.createProject(values);
    setProjects((current) => [newProject, ...current]);
    closeDialog();
    showSuccess('Project created');
  }

  async function handleUpdate(values) {
    const updatedProject = await projectService.updateProject(dialog.project._id, values);
    setProjects((current) =>
      current.map((project) => (project._id === updatedProject._id ? updatedProject : project))
    );
    closeDialog();
    showSuccess('Project updated');
  }

  async function handleDelete() {
    const deletedId = dialog.project._id;
    await projectService.deleteProject(deletedId);
    setProjects((current) => current.filter((project) => project._id !== deletedId));
    closeDialog();
    showSuccess('Project deleted');
  }

  if (isLoading) {
    return <Loader text="Loading projects…" />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={canRetry ? retry : undefined} />;
  }

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h1>Your projects</h1>
          <p className="muted">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <Button onClick={() => setDialog({ type: 'create' })}>New project</Button>
      </div>

      <Toast message={successMessage} />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          message="Create your first project to start adding tasks."
          action={<Button onClick={() => setDialog({ type: 'create' })}>Create a project</Button>}
        />
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onEdit={() => setDialog({ type: 'edit', project })}
              onDelete={() => setDialog({ type: 'delete', project })}
            />
          ))}
        </div>
      )}

      {dialog?.type === 'create' && (
        <Modal title="New project" onClose={closeDialog}>
          <ProjectForm
            submitLabel="Create project"
            onSubmit={handleCreate}
            onCancel={closeDialog}
          />
        </Modal>
      )}

      {dialog?.type === 'edit' && (
        <Modal title="Edit project" onClose={closeDialog}>
          <ProjectForm
            initialValues={{ name: dialog.project.name, description: dialog.project.description }}
            submitLabel="Save changes"
            onSubmit={handleUpdate}
            onCancel={closeDialog}
          />
        </Modal>
      )}

      {dialog?.type === 'delete' && (
        <ConfirmDialog
          title="Delete project?"
          message={`"${dialog.project.name}" and all of its tasks will be permanently deleted.`}
          onConfirm={handleDelete}
          onCancel={closeDialog}
        />
      )}
    </section>
  );
}
