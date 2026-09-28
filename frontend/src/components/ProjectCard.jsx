import { Link } from 'react-router';
import { formatDate } from '../utils/formatDate';
import { Button } from './Button';

export function ProjectCard({ project, onEdit, onDelete }) {
  return (
    <article className="card project-card">
      <Link to={`/projects/${project._id}`} className="project-card-link">
        <h2 className="card-title">{project.name}</h2>
        <p className="muted card-description">{project.description || 'No description'}</p>
      </Link>

      <div className="card-footer">
        <span className="muted small">Created {formatDate(project.createdAt)}</span>
        <div className="card-actions">
          <Button variant="secondary" onClick={() => onEdit(project)}>
            Edit
          </Button>
          <Button variant="secondary" onClick={() => onDelete(project)}>
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}
