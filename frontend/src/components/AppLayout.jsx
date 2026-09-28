import { Link, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';

// Top bar + page container for all logged-in pages.
export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <>
      <header className="navbar">
        <div className="navbar-inner">
          <Link to="/projects" className="brand">
            Task Manager
          </Link>
          <div className="navbar-user">
            <span className="navbar-name">{user.name}</span>
            <Button variant="secondary" onClick={logout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
