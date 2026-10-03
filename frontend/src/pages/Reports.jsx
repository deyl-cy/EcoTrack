import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { Alert, DataTable, PageHeader, StatCard } from '../components/ui';
import { downloadReportExcel, downloadReportPdf } from '../utils/reportExport';

const WASTE_ICON = { Biodegradable: 'flower1', 'Non-Biodegradable': 'x-octagon-fill', Recyclable: 'recycle' };

export default function Reports() {
  const [range, setRange] = useState({ date_from: '', date_to: '' });
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  // Reload whenever a date changes (this replaces the old "Generate report" button).
  useEffect(() => {
    let stale = false;
    api.get('/reports', { params: range })
      .then((res) => { if (!stale) setReport(res.data); })
      .catch((e) => { if (!stale) setError(errMsg(e)); });
    return () => { stale = true; };
  }, [range]);

  const count = report ? report.data.length : 0;
  const hasData = count > 0;

  return (
    <>
      <PageHeader title="Collection reports" subtitle="What was actually collected, by date range.">
        <button className="btn btn-pdf" onClick={() => downloadReportPdf(report, range)} disabled={!hasData}>
          Download PDF ({count})
        </button>
        <button className="btn btn-xls" onClick={() => downloadReportExcel(report, range).catch((e) => setError(errMsg(e)))} disabled={!hasData}>
          Download Excel ({count})
        </button>
      </PageHeader>
      <Alert msg={error} onClose={() => setError('')} />

      <div className="eco-card p-3 mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-6 col-md-3"><label className="form-label">From</label><input type="date" className="form-control" value={range.date_from} onChange={(e) => setRange({ ...range, date_from: e.target.value })} /></div>
          <div className="col-6 col-md-3"><label className="form-label">To</label><input type="date" className="form-control" value={range.date_to} onChange={(e) => setRange({ ...range, date_to: e.target.value })} /></div>
        </div>
      </div>

      {report && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-lg-3"><StatCard icon="truck" label="Total pickups" value={report.summary.total_pickups} tone="blue" /></div>
            <div className="col-6 col-lg-3"><StatCard icon="speedometer2" label="Total weight (kg)" value={report.summary.total_weight_kg} /></div>
            {Object.entries(report.summary.by_waste_type).map(([type, kg]) => (
              <div className="col-6 col-lg-3" key={type}><StatCard icon={WASTE_ICON[type] || 'trash3-fill'} label={`${type} (kg)`} value={kg} tone="gray" /></div>
            ))}
          </div>
          <DataTable
            rows={report.data}
            emptyIcon="bar-chart-line"
            empty="No collections in this date range."
            columns={[
              { key: 'collected_at', label: 'Collected at' },
              { key: 'location', label: 'Location' },
              { key: 'area', label: 'Area' },
              { key: 'waste_type', label: 'Waste type' },
              { key: 'actual_weight_kg', label: 'Weight (kg)' },
              { key: 'collector_name', label: 'Collector' },
            ]}
          />
        </>
      )}
    </>
  );
}