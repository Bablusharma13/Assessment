import { useForm } from '../hooks/useForm';
import { LIMITS, validateProject } from '../utils/validation';
import { Input } from './Input';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';

const EMPTY_PROJECT = { name: '', description: '' };

// Used for both "New project" and "Edit project".
export function ProjectForm({ initialValues = EMPTY_PROJECT, submitLabel, onSubmit, onCancel }) {
  const { values, fieldErrors, formError, isSubmitting, handleChange, handleSubmit } = useForm({
    initialValues,
    validate: validateProject,
    onSubmit,
  });

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <ErrorMessage message={formError} />
      <Input
        label="Project name"
        name="name"
        maxLength={LIMITS.projectName}
        autoFocus
        value={values.name}
        onChange={handleChange}
        error={fieldErrors.name}
      />
      <Input
        label="Description (optional)"
        name="description"
        multiline
        maxLength={LIMITS.description}
        value={values.description}
        onChange={handleChange}
        error={fieldErrors.description}
      />
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} loadingText="Saving…">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
