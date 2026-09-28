import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import * as projectService from '../services/projectService';
import * as taskService from '../services/taskService';
import { TASK_STATUSES, STATUS_CLASS } from '../constants/taskStatuses';
import { useLoadData } from '../hooks/useLoadData';
import { useFlashMessage } from '../hooks/useFlashMessage';
import { Button } from '../components/Button';
import { Loader } from '../components/Loader';
import { ErrorMessage } from '../components/ErrorMessage';
import { SuccessMessage } from '../components/SuccessMessage';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TaskCard } from '../components/TaskCard';
import { TaskForm } from '../components/TaskForm';

export function ProjectDetailsPage() {
  const { id: projectId } = useParams();

  // Load the project and its tasks at the same time.
  const loadProjectWithTasks = useCallback(async () => {
    const [project, tasks] = await Promise.all([
      projectService.getProject(projectId),
      taskService.getTasks(projectId),
    ]);
    return { project, tasks };
  }, [projectId]);

  const { data, setData, isLoading, error, retry } = useLoadData(loadProjectWithTasks);

  // Which dialog is open: null, { type: 'create' }, { type: 'edit', task } or { type: 'delete', task }
  const [dialog, setDialog] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [successMessage, showSuccess] = useFlashMessage();

  const closeDialog = () => setDialog(null);

  function updateTasks(changeTasks) {
    setData((current) => ({ ...current, tasks: changeTasks(current.tasks) }));
  }

  function replaceTask(updatedTask) {
    updateTasks((tasks) =>
      tasks.map((task) => (task._id === updatedTask._id ? updatedTask : task))
    );
  }

  async function handleCreate(values) {
    const newTask = await taskService.createTask(projectId, values);
    updateTasks((tasks) => [newTask, ...tasks]);
    closeDialog();
    showSuccess('Task created');
  }

  async function handleUpdate(values) {
    replaceTask(await taskService.updateTask(dialog.task._id, values));
    closeDialog();
    showSuccess('Task updated');
  }

  async function handleDelete() {
    const deletedId = dialog.task._id;
    await taskService.deleteTask(deletedId);
    updateTasks((tasks) => tasks.filter((task) => task._id !== deletedId));
    closeDialog();
    showSuccess('Task deleted');
  }

  // Status changes save immediately with PUT /api/tasks/:id { status }.
  async function handleStatusChange(task, status) {
    setUpdatingTaskId(task._id);
    setActionError('');
    try {
      replaceTask(await taskService.updateTask(task._id, { status }));
      showSuccess(`Moved "${task.title}" to ${status}`);
    } catch (statusError) {
      setActionError(statusError.message);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  if (isLoading) {
    return <Loader text="Loading project…" />;
  }

  if (error) {
    return (
      <div className="stack">
        <Link to="/projects">← All projects</Link>
        <ErrorMessage message={error} onRetry={retry} />
      </div>
    );
  }

  const { project, tasks } = data;

  return (
    <section className="stack">
      <Link to="/projects">← All projects</Link>

      <div className="page-header">
        <div>
          <h1>{project.name}</h1>
          {project.description && <p className="muted">{project.description}</p>}
        </div>
        <Button onClick={() => setDialog({ type: 'create' })}>New task</Button>
      </div>

      <SuccessMessage message={successMessage} />
      <ErrorMessage message={actionError} />

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          message="Add the first task for this project."
          action={<Button onClick={() => setDialog({ type: 'create' })}>Add a task</Button>}
        />
      ) : (
        <div className="board">
          {TASK_STATUSES.map((status) => {
            const columnTasks = tasks.filter((task) => task.status === status);
            return (
              <section key={status} className={`board-column ${STATUS_CLASS[status]}`}>
                <h2 className="board-column-title">
                  {status} <span className="count">{columnTasks.length}</span>
                </h2>
                {columnTasks.length === 0 && <p className="muted small">No tasks</p>}
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    isUpdating={updatingTaskId === task._id}
                    onStatusChange={handleStatusChange}
                    onEdit={() => setDialog({ type: 'edit', task })}
                    onDelete={() => setDialog({ type: 'delete', task })}
                  />
                ))}
              </section>
            );
          })}
        </div>
      )}

      {dialog?.type === 'create' && (
        <Modal title="New task" onClose={closeDialog}>
          <TaskForm submitLabel="Create task" onSubmit={handleCreate} onCancel={closeDialog} />
        </Modal>
      )}

      {dialog?.type === 'edit' && (
        <Modal title="Edit task" onClose={closeDialog}>
          <TaskForm
            initialValues={{
              title: dialog.task.title,
              description: dialog.task.description,
              status: dialog.task.status,
            }}
            submitLabel="Save changes"
            onSubmit={handleUpdate}
            onCancel={closeDialog}
          />
        </Modal>
      )}

      {dialog?.type === 'delete' && (
        <ConfirmDialog
          title="Delete task?"
          message={`"${dialog.task.title}" will be permanently deleted.`}
          onConfirm={handleDelete}
          onCancel={closeDialog}
        />
      )}
    </section>
  );
}
