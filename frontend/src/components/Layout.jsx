import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import IdleTimeout from './IdleTimeout';
import NotificationBell from './NotificationBell';
import Sidebar, { NAV } from './Sidebar';

export default function Layout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const links = NAV[user.role] || [];
  const title = links.find(([to]) => pathname.startsWith(to))?.[1] || (pathname.startsWith('/profile') ? 'My profile' : 'EcoTrack');
  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <>
      <IdleTimeout />
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className={`backdrop ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="btn btn-soft btn-icon d-lg-none" onClick={() => setOpen(true)} aria-label="Open menu">
            <i className="bi bi-list fs-5" />
          </button>
          <h2 className="page-title">{title}</h2>
          <div className="topbar-right">
            <span className="today d-none d-md-inline">{today}</span>
            <NotificationBell />
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </>
  );
}
