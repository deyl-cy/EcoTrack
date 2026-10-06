import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { DataTable, PageHeader } from '../components/ui';
import { toast } from '../utils/alert';

export default function Monitor() {
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get('/monitor')
      .then((res) => setD(res.data))
      .catch((e) => { if (!e.handled) toast.error(errMsg(e)); });
  }, []);
  if (!d) return <div className="text-muted">Loading...</div>;

  const overdue = d.overdue.data ?? d.overdue;

  return (
    <>
      <PageHeader title="Status monitor" subtitle="See each collector's workload and the pickups that have fallen behind." />

      <h6 className="mb-2">Workload by collector</h6>
      <div className="mb-4">
        <DataTable
          rows={d.by_collector}
          columns={[
            { key: 'collector_name', label: 'Collector', render: (r) => <span className="fw-semibold">{r.collector_name}</span> },
            { key: 'total', label: 'Assigned' },
            { key: 'pending', label: 'Pending' },
            { key: 'completed', label: 'Completed' },
            {
              label: 'Progress', sortable: false,
              render: (r) => (
                <div className="d-flex align-items-center gap-2">
                  <div className="progress" style={{ width: 140 }}>
                    <div className="progress-bar" style={{ width: `${r.total ? (r.completed / r.total) * 100 : 0}%` }} />
                  </div>
                  <small className="text-muted">{r.total ? Math.round((r.completed / r.total) * 100) : 0}%</small>
                </div>
              ),
            },
          ]}
        />
      </div>

      <h6 className="mb-2">Overdue pickups <small className="text-muted fw-normal">still pending after their date</small></h6>
      <DataTable
        empty="Nothing is overdue."
        emptyIcon="check2-circle"
        rows={overdue}
        columns={[
          { key: 'scheduled_date', label: 'Scheduled', render: (r) => <span className="pill pill-red">{r.scheduled_date}</span> },
          { key: 'location', label: 'Location' },
          { key: 'area', label: 'Area' },
          { key: 'collector_name', label: 'Collector' },
        ]}
      />
    </>
  );
}
