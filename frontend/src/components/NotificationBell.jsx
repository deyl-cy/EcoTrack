import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from '../utils/alert';

const POLL_MS = 60_000;
const ICON = { overdue: 'exclamation-triangle-fill', today: 'calendar-event-fill', bin: 'trash3-fill' };

/** Bell in the top bar: what needs attention right now, refreshed every minute. */
export default function NotificationBell() {
  const [data, setData] = useState({ count: 0, items: [] });
  const [open, setOpen] = useState(false);
  const seen = useRef(null); // ids we've already shown, so only NEW urgent items pop a toast
  const box = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications', { silent: true });
      const fresh = res.data.items.filter((i) => seen.current && !seen.current.has(i.id) && i.severity === 'danger');
      seen.current = new Set(res.data.items.map((i) => i.id));
      setData(res.data);
      if (fresh.length) toast.warning(fresh.length === 1 ? `${fresh[0].title}: ${fresh[0].detail}` : `${fresh.length} new urgent notifications`);
    } catch { /* the bell is a convenience; stay quiet if it can't refresh */ }
  }, []);

  // Poll while the tab is visible; refresh on return and after every page change (e.g. a pickup was recorded).
  useEffect(() => {
    load();
    const tick = setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(tick); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);
  useEffect(() => { load(); }, [pathname, load]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const away = (e) => !box.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const go = (link) => { setOpen(false); navigate(link); };

  return (
    <div className="bell" ref={box}>
      <button className="btn btn-soft btn-icon position-relative" onClick={() => setOpen(!open)} aria-label={`Notifications (${data.count})`} aria-expanded={open}>
        <i className="bi bi-bell-fill" />
        {data.count > 0 && <span className="bell-badge">{data.count > 9 ? '9+' : data.count}</span>}
      </button>

      {open && (
        <div className="bell-panel" role="dialog" aria-label="Notifications">
          <div className="bell-head"><b>Notifications</b><span className="text-muted small">{data.count ? `${data.count} need attention` : 'All clear'}</span></div>
          {data.items.length === 0 ? (
            <div className="empty py-4"><i className="bi bi-check2-circle" />You're all caught up.</div>
          ) : (
            <div className="bell-list">
              {data.items.map((i) => (
                <button key={i.id} className="bell-item" onClick={() => go(i.link)}>
                  <span className={`bell-icon sev-${i.severity}`}><i className={`bi bi-${ICON[i.type] || 'info-circle-fill'}`} /></span>
                  <span className="min-w-0"><b className="d-block">{i.title}</b><small className="text-muted d-block text-truncate">{i.detail}</small></span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
