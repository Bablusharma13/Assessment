import { useId } from 'react';
import { STATUS_CLASS, TASK_STATUSES } from '../constants/taskStatuses';

// Dropdown with the three task statuses. Used on every TaskCard and in the TaskForm.
// Set hideLabel when the label is obvious from the context (it stays readable for screen readers).
export function StatusSelector({ label = 'Status', hideLabel = false, value, ...rest }) {
  const id = useId();

  return (
    <div className="field">
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : undefined}>
        {label}
      </label>
      <select
        id={id}
        className={`input status-select ${STATUS_CLASS[value]}`}
        value={value}
        {...rest}
      >
        {TASK_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </div>
  );
}
