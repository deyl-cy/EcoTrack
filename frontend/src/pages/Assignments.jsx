import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import { Badge, DataTable, Empty, PageHeader } from '../components/ui';
import { toast } from '../utils/alert';

export default function Assignments() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    // The API automatically limits a collector to their own schedules.
    api.get('/schedules', { params: { per_page: 200 } })
      .then((res) => {
        setRows(res.data.data);
        const late = res.data.data.filter((s) => s.is_overdue && s.status === 'Pending').length;
        if (late > 0) toast.warning(`You have ${late} overdue pickup${late > 1 ? 's' : ''}.`);
      })
      .catch((e) => { if (!e.handled) toast.error(errMsg(e)); });
  }, []);

  if (!rows) return <div className="text-muted">Loading...</div>;

  // Group pickups under their route; pickups without a route go in one "individual" group.
  const groups = rows.reduce((acc, s) => {
    const key = s.route_name || 'Individual pickups';
    (acc[key] ||= []).push(s);
    return acc;
  }, {});

  const columns = [
    { key: 'scheduled_date', label: 'Date', render: (s) => <span className="text-nowrap">{s.scheduled_date} {s.is_overdue && <span className="pill pill-red">Overdue</span>}</span> },
    { key: 'location', label: 'Location', render: (s) => <><div className="fw-semibold">{s.location}</div><small className="text-muted">{s.area}</small></> },
    { key: 'waste_type', label: 'Waste type' },
    { key: 'status', label: 'Status', render: (s) => <Badge value={s.status} /> },
    {
      label: 'Action', sortable: false,
      render: (s) => s.status === 'Pending'
        ? <Link className="btn btn-sm btn-success" to={`/assignments/${s.id}`}>Record pickup</Link>
        : <span className="text-muted small"><i className="bi bi-check2 me-1" />Done</span>,
    },
  ];

  const pending = rows.filter((s) => s.status === 'Pending').length;

  return (
    <>
      <PageHeader title="My assignments"
        subtitle={rows.length ? `${pending} of ${rows.length} pickups still to collect.` : 'Bins and routes assigned to you appear here.'} />

      {rows.length === 0 && <div className="eco-card"><Empty icon="clipboard-check">You have no assignments yet. Your supervisor will schedule pickups for you.</Empty></div>}

      {Object.entries(groups).map(([name, list]) => (
        <div key={name} className="mb-4">
          <h6 className="mb-2"><i className={`bi bi-${name === 'Individual pickups' ? 'trash3-fill' : 'signpost-split-fill'} text-success me-2`} />{name}
            <span className="text-muted fw-normal ms-2 small">{list.length} stop{list.length > 1 ? 's' : ''}</span></h6>
          <DataTable columns={columns} rows={list} />
        </div>
      ))}
    </>
  );
}
