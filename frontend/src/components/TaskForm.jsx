import { useForm } from '../hooks/useForm';
import { LIMITS, validateTask } from '../utils/validation';
import { Input } from './Input';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';
import { StatusSelector } from './StatusSelector';

const EMPTY_TASK = { title: '', description: '', status: 'Todo' };

// Used for both "New task" and "Edit task".
export function TaskForm({ initialValues = EMPTY_TASK, submitLabel, onSubmit, onCancel }) {
  const { values, fieldErrors, formError, isSubmitting, handleChange, handleSubmit } = useForm({
    initialValues,
    validate: validateTask,
    onSubmit,
  });

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <ErrorMessage message={formError} />
      <Input
        label="Title"
        name="title"
        maxLength={LIMITS.taskTitle}
        autoFocus
        value={values.title}
        onChange={handleChange}
        error={fieldErrors.title}
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
      <StatusSelector name="status" value={values.status} onChange={handleChange} />
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
