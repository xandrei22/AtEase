import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * RBAC: Protects routes by role.
 * - requiredRole 'customer' => redirect to /login if not customer
 * - requiredRole 'admin' => redirect to /admin/login if not admin
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (requiredRole === 'customer') {
    if (!isAuthenticated || user?.role !== 'customer') {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
  }

  if (requiredRole === 'admin') {
    if (!isAuthenticated || user?.role !== 'admin') {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    return children;
  }

  return children;
}
