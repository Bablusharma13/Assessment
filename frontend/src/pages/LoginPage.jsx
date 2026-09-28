import { Link, Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useForm } from '../hooks/useForm';
import { validateLogin } from '../utils/validation';
import { AuthCard } from '../components/AuthCard';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';

export function LoginPage() {
  const { user, login, sessionExpired } = useAuth();
  const location = useLocation();
  const { values, fieldErrors, formError, isSubmitting, handleChange, handleSubmit } = useForm({
    initialValues: { email: '', password: '' },
    validate: validateLogin,
    onSubmit: login,
  });

  // Already logged in (or just logged in): go to the page the user wanted, or the project list.
  if (user) {
    return <Navigate to={location.state?.from || '/projects'} replace />;
  }

  return (
    <AuthCard
      title="Log in"
      subtitle="Welcome back! Log in to manage your projects."
      footer={
        <>
          New here? <Link to="/register">Create an account</Link>
        </>
      }
    >
      {sessionExpired && (
        <p className="alert alert-info" role="status">
          Your session has expired. Please log in again.
        </p>
      )}
      <ErrorMessage message={formError} />

      <form onSubmit={handleSubmit} noValidate>
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
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange}
          error={fieldErrors.password}
        />
        <Button type="submit" isLoading={isSubmitting} loadingText="Logging in…">
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
