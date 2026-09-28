// Client-side checks for instant feedback. They mirror the backend rules and messages;
// the backend still validates everything again.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LIMITS = {
  userName: 50,
  passwordMin: 8,
  passwordMax: 72,
  projectName: 100,
  taskTitle: 100,
  description: 500,
};

function checkRequiredText(errors, field, value, label, maxLength) {
  const trimmed = value.trim();
  if (!trimmed) {
    errors[field] = `${label} is required`;
  } else if (trimmed.length > maxLength) {
    errors[field] = `${label} must be at most ${maxLength} characters`;
  }
}

function checkDescription(errors, description) {
  if (description.trim().length > LIMITS.description) {
    errors.description = `Description must be at most ${LIMITS.description} characters`;
  }
}

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Email is required';
  if (!password) errors.password = 'Password is required';
  return errors;
}

export function validateRegister({ name, email, password }) {
  const errors = {};
  checkRequiredText(errors, 'name', name, 'Name', LIMITS.userName);

  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Please provide a valid email';
  }

  if (password.length < LIMITS.passwordMin) {
    errors.password = `Password must be at least ${LIMITS.passwordMin} characters`;
  }
  return errors;
}

export function validateProject({ name, description }) {
  const errors = {};
  checkRequiredText(errors, 'name', name, 'Project name', LIMITS.projectName);
  checkDescription(errors, description);
  return errors;
}

export function validateTask({ title, description }) {
  const errors = {};
  checkRequiredText(errors, 'title', title, 'Title', LIMITS.taskTitle);
  checkDescription(errors, description);
  return errors;
}
