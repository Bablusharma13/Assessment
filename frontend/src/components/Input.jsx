import { useId } from 'react';

// A labelled, controlled text field with an error message underneath.
// Pass `multiline` to render a <textarea> instead of an <input>.
export function Input({ label, error, multiline = false, ...rest }) {
  const id = useId();
  const errorId = `${id}-error`;
  const Field = multiline ? 'textarea' : 'input';

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Field
        id={id}
        className={error ? 'input input-invalid' : 'input'}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
