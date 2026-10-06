import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../AuthContext';
import { confirmLogout, toast } from '../utils/alert';

const LINKS = {
  Admin: [
    ['/dashboard', 'Dashboard'], ['/bins', 'Bins'], ['/users', 'Personnel'],
    ['/vehicles', 'Vehicles'], ['/schedules', 'Schedules'], ['/reports', 'Reports'],
  ],
  Supervisor: [
    ['/dashboard', 'Dashboard'], ['/bins', 'Bins'], ['/routes', 'Routes'],
    ['/schedules', 'Schedules'], ['/monitor', 'Monitor Status'],
  ],
  Collector: [['/assignments', 'My Assignments']],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    if (!(await confirmLogout())) return;
    await logout();
    navigate('/login');
    toast.success('You have been signed out.');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-success mb-4">
      <div className="container">
        <NavLink className="navbar-brand" to={homeFor(user.role)}>🗑️ EcoTrack</NavLink>
        <button className="navbar-toggler" type="button" onClick={() => setOpen(!open)}>
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
          <ul className="navbar-nav me-auto">
            {(LINKS[user.role] || []).map(([to, label]) => (
              <li className="nav-item" key={to}>
                <NavLink to={to} className={({ isActive }) => `nav-link ${isActive ? 'active fw-bold' : ''}`} onClick={() => setOpen(false)}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          <span className="navbar-text text-white me-3">
            Hi, {user.full_name} <span className="badge bg-light text-success">{user.role}</span>
          </span>
          <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </nav>
  );
}
