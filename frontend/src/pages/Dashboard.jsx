import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { BarList, StackedBars } from '../components/Charts';
import { DataTable, LevelGauge, PageHeader, StatCard } from '../components/ui';
import { WASTE_COLORS } from '../utils/colors';
import { DASH_ALERT_KEY, toast, warning } from '../utils/alert';

const LEVELS = [['Low', '#22a35a'], ['Medium', '#e0a526'], ['High', '#ea7a1c'], ['Full', '#d93f3f']];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** Completed vs pending pickups as a ring. */
function Donut({ done, total }) {
  const r = 52, c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <svg viewBox="0 0 128 128" width="150" height="150" role="img" aria-label={`${Math.round(pct * 100)}% of pickups completed`}>
      <circle cx="64" cy="64" r={r} fill="none" stroke="#e6eee9" strokeWidth="14" />
      <circle cx="64" cy="64" r={r} fill="none" stroke="#22c55e" strokeWidth="14" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 64 64)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x="64" y="70" textAnchor="middle" className="donut-label" fill="#12261c">{Math.round(pct * 100)}%</text>
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [d, setD] = useState(null);

  useEffect(() => {
    api.get('/dashboard')
      .then((res) => { setD(res.data); headsUp(res.data); })
      .catch((e) => { if (!e.handled) toast.error(errMsg(e)); });
  }, []);

  // One "heads up" popup per login session if anything needs attention.
  const headsUp = async (data) => {
    if (sessionStorage.getItem(DASH_ALERT_KEY)) return;
    sessionStorage.setItem(DASH_ALERT_KEY, '1');
    const lines = [];
    if (data.overdue > 0) lines.push(`<b>${data.overdue}</b> pickup${data.overdue > 1 ? 's are' : ' is'} overdue`);
    const n = data.bins_needing_collection.length;
    if (n > 0) lines.push(`<b>${n}</b> bin${n > 1 ? 's need' : ' needs'} collecting`);
    if (!lines.length) return;
    const res = await warning('Heads up', undefined, {
      html: lines.join('<br>'), showCancelButton: true,
      confirmButtonText: 'View schedules', cancelButtonText: 'Dismiss',
    });
    if (res.isConfirmed) navigate('/schedules');
  };

  if (!d) return <div className="text-muted">Loading...</div>;

  const totalBins = d.bins || 1;
  const totalSchedules = d.pending + d.completed;

  return (
    <>
      <PageHeader title={`${greeting()}, ${user.full_name.split(' ')[0]}`}
        subtitle={d.overdue > 0 ? `${d.overdue} pickup${d.overdue > 1 ? 's are' : ' is'} overdue and ${d.bins_needing_collection.length} bin${d.bins_needing_collection.length === 1 ? '' : 's'} need collecting.` : 'Everything is on schedule.'} />

      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-4 col-xl-2"><StatCard icon="trash3-fill" label="Bins" value={d.bins} /></div>
        <div className="col-6 col-lg-4 col-xl-2"><StatCard icon="truck" label="Vehicles" value={d.vehicles} tone="blue" /></div>
        <div className="col-6 col-lg-4 col-xl-2"><StatCard icon="people-fill" label="Collectors" value={d.collectors} tone="gray" /></div>
        <div className="col-6 col-lg-4 col-xl-2"><StatCard icon="hourglass-split" label="Pending" value={d.pending} tone="amber" /></div>
        <div className="col-6 col-lg-4 col-xl-2"><StatCard icon="check2-circle" label="Completed" value={d.completed} /></div>
        <div className="col-6 col-lg-4 col-xl-2"><StatCard icon="exclamation-triangle-fill" label="Overdue" value={d.overdue} tone="red" /></div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-7">
          <div className="eco-card h-100">
            <div className="eco-card-head"><b>Bin fill levels</b><span className="text-muted small">{d.bins} bins</span></div>
            <div className="eco-card-body">
              {LEVELS.map(([level, color]) => {
                const n = d.bins_by_level[level] || 0;
                return (
                  <div className="d-flex align-items-center gap-3 mb-3" key={level}>
                    <div style={{ width: 110 }}><LevelGauge level={level} /></div>
                    <div className="progress flex-grow-1" style={{ height: 10 }}>
                      <div className="progress-bar" style={{ width: `${(n / totalBins) * 100}%`, background: color }} />
                    </div>
                    <b style={{ width: 28, textAlign: 'right' }}>{n}</b>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="eco-card h-100">
            <div className="eco-card-head"><b>Pickup progress</b></div>
            <div className="eco-card-body d-flex align-items-center gap-4">
              <Donut done={d.completed} total={totalSchedules} />
              <div>
                <div className="mb-2"><span className="pill pill-green">Completed</span> <b className="ms-1">{d.completed}</b></div>
                <div className="mb-2"><span className="pill pill-amber">Pending</span> <b className="ms-1">{d.pending}</b></div>
                <div><span className="pill pill-red">Overdue</span> <b className="ms-1">{d.overdue}</b></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {d.trends && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-lg-8">
              <div className="eco-card h-100">
                <div className="eco-card-head"><b>Weight collected, last 8 weeks</b><span className="text-muted small">kg per week</span></div>
                <div className="eco-card-body"><StackedBars data={d.trends.weekly} /></div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="eco-card h-100">
                <div className="eco-card-head"><b>By waste type</b><span className="text-muted small">last 30 days</span></div>
                <div className="eco-card-body">
                  <BarList items={d.trends.by_waste_type.map((t) => ({ ...t, color: WASTE_COLORS[t.name] }))} empty="No pickups in the last 30 days." />
                </div>
              </div>
            </div>
          </div>
          <div className="eco-card mb-4">
            <div className="eco-card-head"><b>Collectors compared</b><span className="text-muted small">last 30 days</span></div>
            <div className="eco-card-body"><BarList items={d.trends.by_collector} empty="No pickups in the last 30 days." /></div>
          </div>
        </>
      )}

      <h6 className="mb-2">Bins that need collecting</h6>
      <DataTable
        empty="All bins are under control."
        emptyIcon="check2-circle"
        rows={d.bins_needing_collection}
        columns={[
          { key: 'location', label: 'Location' },
          { key: 'area', label: 'Area' },
          { key: 'capacity_kg', label: 'Capacity (kg)' },
          { key: 'current_level', label: 'Level', render: (r) => <LevelGauge level={r.current_level} /> },
        ]}
      />
    </>
  );
}
