import { useEffect, useState } from 'react';
import api, { errMsg, showError } from '../api';
import { DataTable, PageHeader, StatCard } from '../components/ui';
import { closeAlert, loading, toast } from '../utils/alert';
import { downloadReportExcel, downloadReportPdf } from '../utils/reportExport';

// Every stat card shares one row: they grow to fill it, and the row scrolls sideways on narrow screens.
const CARD = { flex: '1 0 180px' };

const WASTE_ICON = { Biodegradable: 'flower1', 'Non-Biodegradable': 'x-octagon-fill', Recyclable: 'recycle' };

export default function Reports() {
  const [range, setRange] = useState({ date_from: '', date_to: '' });
  const [report, setReport] = useState(null);

  // Reload whenever a date changes (this replaces the old "Generate report" button).
  useEffect(() => {
    let stale = false;
    api.get('/reports', { params: range })
      .then((res) => {
        if (stale) return;
        setReport(res.data);
        if ((range.date_from || range.date_to) && res.data.data.length === 0) toast.info('No collections found in that date range.');
      })
      .catch((e) => { if (!stale && !e.handled) toast.error(errMsg(e)); });
    return () => { stale = true; };
  }, [range]);

  // Refuse a backwards date range.
  const changeRange = (name, value) => {
    const next = { ...range, [name]: value };
    if (next.date_from && next.date_to && next.date_from > next.date_to) {
      toast.warning('The "From" date must be on or before the "To" date.');
      return;
    }
    setRange(next);
  };

  // Spinner while the file is built, then a toast (or an error popup).
  const runExport = async (label, build) => {
    loading(`Preparing your ${label}...`);
    try {
      await new Promise((r) => setTimeout(r, 60)); // let the spinner paint before the heavy work
      await build();
      closeAlert();
      toast.success(`${label} downloaded.`);
    } catch (e) { showError(e, `Could not create the ${label}`); }
  };

  const count = report ? report.data.length : 0;
  const hasData = count > 0;

  return (
    <>
      <PageHeader title="Collection reports" subtitle="What was actually collected, by date range.">
        <button className="btn btn-pdf" onClick={() => runExport('PDF', () => downloadReportPdf(report, range))} disabled={!hasData}>
          Download PDF ({count})
        </button>
        <button className="btn btn-xls" onClick={() => runExport('Excel file', () => downloadReportExcel(report, range))} disabled={!hasData}>
          Download Excel ({count})
        </button>
      </PageHeader>

      <div className="eco-card p-3 mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-6 col-md-3"><label className="form-label">From</label><input type="date" className="form-control" value={range.date_from} onChange={(e) => changeRange('date_from', e.target.value)} /></div>
          <div className="col-6 col-md-3"><label className="form-label">To</label><input type="date" className="form-control" value={range.date_to} onChange={(e) => changeRange('date_to', e.target.value)} /></div>
        </div>
      </div>

      {report && (
        <>
          <div className="report-stats d-flex gap-3 mb-4 pb-1 overflow-auto">
            <div style={CARD}><StatCard icon="truck" label="Total pickups" value={report.summary.total_pickups} tone="blue" /></div>
            <div style={CARD}><StatCard icon="speedometer2" label="Total weight (kg)" value={report.summary.total_weight_kg} /></div>
            {Object.entries(report.summary.by_waste_type).map(([type, kg]) => (
              <div style={CARD} key={type}><StatCard icon={WASTE_ICON[type] || 'trash3-fill'} label={`${type} (kg)`} value={kg} tone="gray" /></div>
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