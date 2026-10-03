import { useEffect, useMemo, useState } from 'react';
import api, { errMsg } from '../api';
import { Alert, DataTable, Field, Modal, ModalBody, ModalFoot, PageHeader, SearchBox } from './ui';

/**
 * Reusable list + add/edit/delete page, used by Bins, Vehicles, Personnel and Routes.
 *
 * props:
 *  title (singular, used in modal), heading (page title), description, endpoint ('/bins')
 *  columns  -> table columns (see DataTable)
 *  fields   -> form fields: { name, label, type, options, required, createOnly, editOnly }
 *  blank    -> initial form values for "Add"
 *  canWrite -> false = read-only view (no add/edit/delete buttons)
 *  rowActions(row) -> extra buttons per row (e.g. "Stops")
 *  canDelete(row) -> false hides the delete button for that row (default: always shown)
 *
 * A field may also have:  options: (form) => [...]  and  disabledWhen: (form) => boolean
 *  query    -> optional query-string params for the GET request
 */
export default function CrudPage({ title, heading, description, endpoint, columns, fields, blank, canWrite = true, rowActions, canDelete = () => true, query, addLabel = 'Add' }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);       // null = modal closed
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const load = () => api.get(endpoint, { params: query }).then((res) => setRows(res.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [endpoint]);

  // Live search across every visible column.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => columns.some((c) => c.key && String(r[c.key] ?? '').toLowerCase().includes(q)));
  }, [rows, search, columns]);

  const openAdd = () => { setForm({ ...blank }); setEditingId(null); setError(''); };
  const openEdit = (row) => {
    const values = {};
    fields.forEach((f) => { values[f.name] = row[f.name] ?? ''; });
    setForm(values); setEditingId(row.id); setError('');
  };
  const close = () => setForm(null);
  const change = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await api.put(`${endpoint}/${editingId}`, form);
      else await api.post(endpoint, form);
      close(); setFlash(editingId ? 'Changes saved.' : `${title} added.`); setError('');
      load();
    } catch (err) { setError(errMsg(err)); }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete this ${title.toLowerCase()}? This cannot be undone.`)) return;
    try { await api.delete(`${endpoint}/${row.id}`); setFlash(`${title} deleted.`); load(); }
    catch (err) { setError(errMsg(err)); }
  };

  const cols = canWrite || rowActions
    ? [...columns, {
        label: 'Actions', sortable: false,
        render: (row) => (
          <div className="d-flex gap-1">
            {rowActions?.(row)}
            {canWrite && <button className="btn btn-sm btn-soft btn-icon" title="Edit" aria-label="Edit" onClick={() => openEdit(row)}><i className="bi bi-pencil-fill" /></button>}
            {canWrite && canDelete(row) && <button className="btn btn-sm btn-outline-danger btn-icon" title="Delete" aria-label="Delete" onClick={() => remove(row)}><i className="bi bi-trash3-fill" /></button>}
          </div>
        ),
      }]
    : columns;

  const visibleFields = fields.filter((f) => (editingId ? !f.createOnly : !f.editOnly));

  return (
    <>
      <PageHeader title={heading || title} subtitle={description}>
        {canWrite && <button className="btn btn-success" onClick={openAdd}><i className="bi bi-plus-lg me-1" />{addLabel}</button>}
      </PageHeader>

      <Alert msg={!form && error} onClose={() => setError('')} />
      <Alert msg={flash} type="success" onClose={() => setFlash('')} />

      <div className="mb-3" style={{ maxWidth: 420 }}><SearchBox value={search} onChange={setSearch} /></div>
      <DataTable columns={cols} rows={filtered} />

      {form && (
        <Modal title={`${editingId ? 'Edit' : 'Add'} ${title.toLowerCase()}`} onClose={close}>
          <form onSubmit={save}>
            <ModalBody>
              <Alert msg={error} />
              {visibleFields.map((f) => (
                <Field key={f.name} value={form[f.name]} onChange={change}
                  field={{
                    ...f,
                    required: f.required && !(editingId && f.createOnlyRequired),
                    options: typeof f.options === 'function' ? f.options(form) : f.options,
                    help: typeof f.help === 'function' ? f.help(form) : f.help,
                    disabled: f.disabledWhen?.(form),
                  }} />
              ))}
            </ModalBody>
            <ModalFoot>
              <button type="button" className="btn btn-light" onClick={close}>Cancel</button>
              <button className="btn btn-success">Save</button>
            </ModalFoot>
          </form>
        </Modal>
      )}
    </>
  );
}