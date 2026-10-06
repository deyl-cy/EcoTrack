import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../AuthContext';
import { toast } from '../utils/alert';

/** Redirects home and explains why. */
function Denied({ to }) {
  useEffect(() => { toast.warning("You don't have access to that page."); }, []);
  return <Navigate to={to} replace />;
}

/** Route guard: must be logged in, and (optionally) have one of the given roles. */
export default function Guard({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="text-center mt-5 text-muted">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Denied to={homeFor(user.role)} />;

  return children;
}
