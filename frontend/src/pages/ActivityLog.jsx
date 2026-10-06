import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { DataTable, PageHeader, Pagination, SearchBox } from '../components/ui';
import { toast } from '../utils/alert';

const TONE = {
  created: 'green', collected: 'green', updated: 'blue', deleted: 'red', login_failed: 'red', login_blocked: 'red',
  password: 'amber', login: 'gray', logout: 'gray', export: 'gray',
};
const LABEL = { login_failed: 'failed login', login_blocked: 'login blocked', password: 'password' };

export default function ActivityLog() {
  const [filters, setFilters] = useState({ keyword: '', action: '', date_from: '', date_to: '' });
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);

  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

  // Re-query when filters/page change (small delay so typing in the search box doesn't fire every key).
  useEffect(() => {
    let stale = false;
    const t = setTimeout(() => {
      api.get('/activity-logs', { params: { ...filters, page } })
        .then((r) => { if (!stale) setRes(r.data); })
        .catch((e) => { if (!stale && !e.handled) toast.error(errMsg(e)); });
    }, 250);
    return () => { stale = true; clearTimeout(t); };
  }, [filters, page]);

  if (!res) return <div className="text-muted">Loading...</div>;

  return (
    <>
      <PageHeader title="Activity log" subtitle="Who did what, and when. Sign-ins, changes, deletions and pickups are recorded here." />

      <div className="eco-card p-3 mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-lg-4"><SearchBox value={filters.keyword} onChange={(v) => setFilter('keyword', v)} placeholder="Search user or details" /></div>
          <div className="col-6 col-lg-2">
            <select className="form-select" value={filters.action} onChange={(e) => setFilter('action', e.target.value)} aria-label="Action">
              <option value="">All actions</option>
              {res.actions.map((a) => <option key={a} value={a}>{LABEL[a] || a}</option>)}
            </select>
          </div>
          <div className="col-6 col-lg-3"><input type="date" className="form-control" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} aria-label="From date" /></div>
          <div className="col-6 col-lg-3"><input type="date" className="form-control" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} aria-label="To date" /></div>
        </div>
      </div>

      <DataTable
        rows={res.data}
        emptyIcon="clock-history"
        empty="No activity matches these filters."
        columns={[
          { key: 'created_at', label: 'When', render: (r) => <span className="text-nowrap">{r.created_at}</span> },
          { key: 'username', label: 'User', render: (r) => r.username || <span className="text-muted">—</span> },
          { key: 'action', label: 'Action', render: (r) => <span className={`pill pill-${TONE[r.action] || 'gray'}`}>{LABEL[r.action] || r.action}</span> },
          { key: 'description', label: 'Details' },
          { key: 'ip_address', label: 'IP address', render: (r) => <span className="text-muted small">{r.ip_address}</span> },
        ]}
      />
      <Pagination meta={res.meta} onPage={setPage} />
    </>
  );
}
