import { useEffect, useState } from 'react';
import api, { errMsg, showError } from '../api';
import { confirm, confirmDelete, confirmDiscard, toast, withLoading } from '../utils/alert';
import { Badge, DataTable, Field, Modal, ModalBody, ModalFoot, PageHeader, Pagination, SearchBox } from '../components/ui';

const BLANK = { bin_id: '', collector_id: '', vehicle_id: '', collection_route_id: '', scheduled_date: '', waste_type: 'Biodegradable', waste_amount_kg: '', status: 'Pending', notes: '' };
const WASTE = ['Biodegradable', 'Non-Biodegradable', 'Recyclable'];
const WASTE_ICON = { Biodegradable: 'flower1', 'Non-Biodegradable': 'x-octagon-fill', Recyclable: 'recycle' };

export default function Schedules() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ keyword: '', waste_type: '', status: '', date_from: '', date_to: '' });
  const [lookups, setLookups] = useState({ bins: [], collectors: [], vehicles: [], routes: [] });
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [initial, setInitial] = useState(null); // snapshot of the form when the modal opened

  // dropdown data (loaded once)
  useEffect(() => {
    Promise.all([api.get('/bins'), api.get('/users', { params: { role: 'Collector' } }), api.get('/vehicles'), api.get('/routes')])
      .then(([b, u, v, r]) => setLookups({ bins: b.data, collectors: u.data, vehicles: v.data, routes: r.data }))
      .catch((e) => { if (!e.handled) toast.error(`Could not load dropdown data. ${errMsg(e)}`); });
  }, []);

  const load = () =>
    api.get('/schedules', { params: { ...filters, page, per_page: 10 } })
      .then((res) => { setRows(res.data.data); setMeta(res.data.meta); })
      .catch((e) => { if (!e.handled) toast.error(errMsg(e)); });

  // LIVE SEARCH: re-query the server 300 ms after the user stops typing / changes a filter.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [filters, page]);

  const setFilter = (name, value) => { setPage(1); setFilters((f) => ({ ...f, [name]: value })); };
  const change = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const openAdd = () => { setForm({ ...BLANK }); setInitial({ ...BLANK }); setEditingId(null); };
  const openEdit = (s) => {
    const values = Object.fromEntries(Object.keys(BLANK).map((k) => [k, s[k] ?? '']));
    setForm(values); setInitial(values); setEditingId(s.id);
  };
  // Closing with unsaved edits asks first.
  const requestClose = async () => {
    const dirty = JSON.stringify(form) !== JSON.stringify(initial);
    if (dirty && !(await confirmDiscard())) return;
    setForm(null);
  };

  const save = async (e) => {
    e.preventDefault();
    if (editingId && !(await confirm({ title: 'Save changes?', text: 'Update this schedule?', confirmText: 'Yes, save' }))) return;
    try {
      await withLoading(
        editingId ? api.put(`/schedules/${editingId}`, form) : api.post('/schedules', form),
        'Saving schedule...'
      );
      setForm(null);
      toast.success(editingId ? 'Schedule updated.' : 'Schedule added.');
      load();
    } catch (err) { showError(err, 'Could not save schedule'); }
  };

  const remove = async (s) => {
    if (!(await confirmDelete('schedule', `${s.location} · ${s.scheduled_date}`))) return;
    try {
      await withLoading(api.delete(`/schedules/${s.id}`), 'Deleting...');
      toast.success('Schedule deleted.');
      load();
    } catch (err) { showError(err, 'Could not delete schedule'); }
  };

  const opts = (list, label) => list.map((x) => ({ value: x.id, label: label(x) }));
  const fields = [
    { name: 'bin_id', label: 'Bin', type: 'select', required: true, options: opts(lookups.bins, (b) => `${b.location} — ${b.area}`) },
    { name: 'collector_id', label: 'Collector', type: 'select', required: true, options: opts(lookups.collectors, (u) => u.full_name) },
    { name: 'vehicle_id', label: 'Vehicle', type: 'select', options: opts(lookups.vehicles, (v) => `${v.plate_number} (${v.status})`) },
    { name: 'collection_route_id', label: 'Route (optional)', type: 'select', options: opts(lookups.routes, (r) => `${r.name} — ${r.route_date}`) },
    { name: 'scheduled_date', label: 'Scheduled date', type: 'date', required: true },
    { name: 'waste_type', label: 'Waste type', type: 'select', required: true, options: WASTE.map((w) => ({ value: w, label: w })) },
    { name: 'waste_amount_kg', label: 'Estimated amount (kg)', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', required: true, options: ['Pending', 'Completed'].map((w) => ({ value: w, label: w })) },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const columns = [
    { key: 'scheduled_date', label: 'Date', render: (s) => <span className="text-nowrap">{s.scheduled_date} {s.is_overdue && <span className="pill pill-red">Overdue</span>}</span> },
    { key: 'location', label: 'Location', render: (s) => <><div className="fw-semibold">{s.location}</div><small className="text-muted">{s.area}</small></> },
    { key: 'collector_name', label: 'Collector' },
    { key: 'plate_number', label: 'Vehicle', render: (s) => s.plate_number || '—' },
    { key: 'route_name', label: 'Route', render: (s) => s.route_name || '—' },
    { key: 'waste_type', label: 'Waste', render: (s) => <span className="text-nowrap"><i className={`bi bi-${WASTE_ICON[s.waste_type]} me-1 text-muted`} />{s.waste_type}</span> },
    { key: 'status', label: 'Status', render: (s) => <Badge value={s.status} /> },
    {
      label: 'Actions', sortable: false,
      render: (s) => (
        <div className="d-flex gap-1">
          <button className="btn btn-sm btn-soft btn-icon" title="Edit" aria-label="Edit" onClick={() => openEdit(s)}><i className="bi bi-pencil-fill" /></button>
          <button className="btn btn-sm btn-outline-danger btn-icon" title="Delete" aria-label="Delete" onClick={() => remove(s)}><i className="bi bi-trash3-fill" /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Schedules" subtitle="Plan which collector picks up which bin, and when.">
        <button className="btn btn-success" onClick={openAdd}><i className="bi bi-plus-lg me-1" />Add schedule</button>
      </PageHeader>

      <div className="eco-card p-3 mb-3">
        <div className="row g-2">
          <div className="col-lg-4"><SearchBox value={filters.keyword} onChange={(v) => setFilter('keyword', v)} placeholder="Search location, area or collector" /></div>
          <div className="col-6 col-lg-2">
            <select className="form-select" value={filters.waste_type} onChange={(e) => setFilter('waste_type', e.target.value)} aria-label="Waste type">
              <option value="">All waste types</option>{WASTE.map((w) => <option key={w}>{w}</option>)}
            </select>
          </div>
          <div className="col-6 col-lg-2">
            <select className="form-select" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} aria-label="Status">
              <option value="">All statuses</option><option>Pending</option><option>Completed</option>
            </select>
          </div>
          <div className="col-6 col-lg-2"><input type="date" className="form-control" aria-label="From date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} /></div>
          <div className="col-6 col-lg-2"><input type="date" className="form-control" aria-label="To date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} /></div>
        </div>
      </div>

      <DataTable columns={columns} rows={rows} empty="No schedules match these filters." emptyIcon="calendar-x" />
      <Pagination meta={meta} onPage={setPage} />

      {form && (
        <Modal title={editingId ? 'Edit schedule' : 'Add schedule'} onClose={requestClose}>
          <form onSubmit={save}>
            <ModalBody>
              {fields.map((f) => <Field key={f.name} field={f} value={form[f.name]} onChange={change} />)}
            </ModalBody>
            <ModalFoot>
              <button type="button" className="btn btn-light" onClick={requestClose}>Cancel</button>
              <button className="btn btn-success">Save</button>
            </ModalFoot>
          </form>
        </Modal>
      )}
    </>
  );
}
