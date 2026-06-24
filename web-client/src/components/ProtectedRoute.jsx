import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';

const HOME_PATH = {
  admin: '/admin/dashboard',
  staff: '/staff/dashboard',
  lecturer: '/dashboard',
  student: '/dashboard',
};

/**
 * Wraps routes that require authentication.
 * - If user is not logged in, redirects to /login (preserving the intended URL).
 * - If `roles` is provided, only those roles may access; others are sent to
 *   their home page.
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, authLoading } = useApp();
  const location = useLocation();

  if (authLoading) return null; // still checking token

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={HOME_PATH[user.role] || '/dashboard'} replace />;
  }

  return children;
}
