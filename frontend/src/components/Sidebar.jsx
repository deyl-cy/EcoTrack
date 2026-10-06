import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../AuthContext';
import { confirmLogout, toast } from '../utils/alert';
import Logo from './Logo';

// [path, label, bootstrap-icon]
export const NAV = {
  Admin: [
    ['/dashboard', 'Dashboard', 'grid-1x2-fill'], ['/bins', 'Bins', 'trash3-fill'],
    ['/schedules', 'Schedules', 'calendar-check-fill'], ['/vehicles', 'Vehicles', 'truck'],
    ['/users', 'Personnel', 'people-fill'], ['/reports', 'Reports', 'bar-chart-line-fill'],
  ],
  Supervisor: [
    ['/dashboard', 'Dashboard', 'grid-1x2-fill'], ['/bins', 'Bins', 'trash3-fill'],
    ['/routes', 'Routes', 'signpost-split-fill'], ['/schedules', 'Schedules', 'calendar-check-fill'],
    ['/monitor', 'Monitor Status', 'activity'],
  ],
  Collector: [['/assignments', 'My Assignments', 'clipboard-check-fill']],
};

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (!(await confirmLogout())) return;
    await logout();
    navigate('/login');
    toast.success('You have been signed out.');
  };

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <NavLink to={homeFor(user.role)} className="sidebar-brand" onClick={onClose}>
        <Logo />
        <span><b>EcoTrack</b><small>Waste collection, tracked</small></span>
      </NavLink>

      <nav className="sidebar-nav">
        {(NAV[user.role] || []).map(([to, label, icon]) => (
          <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className={`bi bi-${icon}`} /> {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user">
        <span className="avatar">{user.full_name?.[0]?.toUpperCase()}</span>
        <div className="min-w-0">
          <div className="name">{user.full_name}</div>
          <div className="role">{user.role}</div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout} title="Log out" aria-label="Log out">
          <i className="bi bi-box-arrow-right" />
        </button>
      </div>
    </aside>
  );
}
