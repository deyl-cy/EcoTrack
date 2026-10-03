import { Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../AuthContext';

/** Route guard: must be logged in, and (optionally) have one of the given roles. */
export default function Guard({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="text-center mt-5 text-muted">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;

  return children;
}
