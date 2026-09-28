import { Link, Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useForm } from '../hooks/useForm';
import { LIMITS, validateRegister } from '../utils/validation';
import { AuthCard } from '../components/AuthCard';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';

export function RegisterPage() {
  const { user, register } = useAuth();
  const { values, fieldErrors, formError, isSubmitting, handleChange, handleSubmit } = useForm({
    initialValues: { name: '', email: '', password: '' },
    validate: validateRegister,
    onSubmit: register,
  });

  // Registration logs the user in straight away.
  if (user) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="Start organising your projects and tasks."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <ErrorMessage message={formError} />

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="Name"
          name="name"
          autoComplete="name"
          maxLength={LIMITS.userName}
          value={values.name}
          onChange={handleChange}
          error={fieldErrors.name}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={handleChange}
          error={fieldErrors.email}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          maxLength={LIMITS.passwordMax}
          placeholder={`At least ${LIMITS.passwordMin} characters`}
          value={values.password}
          onChange={handleChange}
          error={fieldErrors.password}
        />
        <Button type="submit" isLoading={isSubmitting} loadingText="Creating account…">
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
