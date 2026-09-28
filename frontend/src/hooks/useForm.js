import { useState } from 'react';

// Turns the backend's [{ field, message }] list into { field: message }.
function toFieldErrors(errors = []) {
  return Object.fromEntries(errors.map(({ field, message }) => [field, message]));
}

// Shared logic for every form in the app (login, register, project, task):
// controlled values, client validation, submitting state and API errors.
export function useForm({ initialValues, validate, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = validate(values);
    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      // Field errors go under the inputs; any other error is shown above the form.
      const apiFieldErrors = toFieldErrors(error.errors);
      setFieldErrors(apiFieldErrors);
      setFormError(Object.keys(apiFieldErrors).length > 0 ? '' : error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { values, fieldErrors, formError, isSubmitting, handleChange, handleSubmit };
}
