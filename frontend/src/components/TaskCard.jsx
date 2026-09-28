import { Button } from './Button';
import { StatusSelector } from './StatusSelector';

// One task on the board. The parent page does the API calls; this card only reports clicks.
export function TaskCard({ task, isUpdating, onStatusChange, onEdit, onDelete }) {
  return (
    <article className="card task-card">
      <h3 className="card-title">{task.title}</h3>
      {task.description && <p className="muted card-description">{task.description}</p>}

      <StatusSelector
        label={`Status of "${task.title}"`}
        hideLabel
        value={task.status}
        disabled={isUpdating}
        onChange={(event) => onStatusChange(task, event.target.value)}
      />

      <div className="card-actions">
        <Button variant="secondary" onClick={() => onEdit(task)} disabled={isUpdating}>
          Edit
        </Button>
        <Button variant="secondary" onClick={() => onDelete(task)} disabled={isUpdating}>
          Delete
        </Button>
      </div>
    </article>
  );
}
