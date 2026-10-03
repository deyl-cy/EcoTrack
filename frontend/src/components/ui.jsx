import { useMemo, useState } from 'react';

/* ---------- status pills ---------- */
const TONES = {
  Available: 'green', 'On Route': 'blue', Maintenance: 'gray',
  Pending: 'amber', Completed: 'green', Planned: 'gray', 'In Progress': 'blue',
  Admin: 'dark', Supervisor: 'blue', Collector: 'green',
};

export function Badge({ value }) {
  return <span className={`pill pill-${TONES[value] || 'gray'}`}>{value}</span>;
}

/* ---------- bin fill gauge (the EcoTrack signature) ---------- */
export function LevelGauge({ level, large = false }) {
  return (
    <span className={`gauge gauge-${String(level).toLowerCase()} ${large ? 'gauge-lg' : ''}`}>
      <span className="gauge-bin"><span /></span>
      <span className="gauge-label">{level}</span>
    </span>
  );
}

/* ---------- page header ---------- */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="d-flex gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

/* ---------- stat card ---------- */
export function StatCard({ icon, label, value, tone = 'green' }) {
  return (
    <div className="eco-card stat">
      <span className={`stat-icon tone-${tone}`}><i className={`bi bi-${icon}`} /></span>
      <div>
        <div className="stat-value">{value ?? '–'}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

/* ---------- alert ---------- */
export function Alert({ msg, type = 'danger', onClose }) {
  if (!msg) return null;
  const icon = type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill';
  return (
    <div className={`alert alert-${type} py-2 d-flex align-items-center gap-2`} role="alert">
      <i className={`bi bi-${icon}`} />
      <span className="flex-grow-1">{msg}</span>
      {onClose && <button type="button" className="btn-close" onClick={onClose} aria-label="Dismiss" />}
    </div>
  );
}

/* ---------- empty state ---------- */
export function Empty({ icon = 'inbox', children }) {
  return <div className="empty"><i className={`bi bi-${icon}`} />{children}</div>;
}

/* ---------- modal ---------- */
// size: '' | 'lg'
export function Modal({ title, onClose, children, size = '' }) {
  return (
    <div className="eco-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`eco-modal-box ${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="eco-modal-head">
          <h5>{title}</h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
        </div>
        {children}
      </div>
    </div>
  );
}
export const ModalBody = ({ children }) => <div className="eco-modal-body">{children}</div>;
export const ModalFoot = ({ children }) => <div className="eco-modal-foot">{children}</div>;

/* ---------- sortable table (inside a card) ---------- */
// columns: [{ key, label, render?(row), sortable? }]
export function DataTable({ columns, rows, empty = 'No records found.', emptyIcon = 'inbox' }) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const out = [...rows].sort((a, b) => collator.compare(String(a[sort.key] ?? ''), String(b[sort.key] ?? '')));
    return sort.dir === 'asc' ? out : out.reverse();
  }, [rows, sort]);

  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  return (
    <div className="eco-card overflow-hidden">
      <div className="table-responsive">
        <table className="eco-table">
          <thead>
            <tr>
              {columns.map((c) => {
                const canSort = c.sortable !== false && c.key;
                return (
                  <th key={c.label} className={canSort ? 'sortable' : ''} onClick={canSort ? () => toggle(c.key) : undefined}>
                    {c.label}
                    {sort.key === c.key && <i className={`bi bi-caret-${sort.dir === 'asc' ? 'up' : 'down'}-fill ms-1 small`} />}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={columns.length}><Empty icon={emptyIcon}>{empty}</Empty></td></tr>
            )}
            {sorted.map((row, i) => (
              <tr key={row.id ?? i}>
                {columns.map((c) => <td key={c.label}>{c.render ? c.render(row) : row[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- pagination ---------- */
export function Pagination({ meta, onPage }) {
  if (!meta || meta.last_page <= 1) return null;
  return (
    <div className="d-flex justify-content-between align-items-center mt-3">
      <small className="text-muted">Page {meta.current_page} of {meta.last_page} · {meta.total} records</small>
      <div className="btn-group btn-group-sm">
        <button className="btn btn-outline-success" disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)}>
          <i className="bi bi-chevron-left" /> Previous
        </button>
        <button className="btn btn-outline-success" disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)}>
          Next <i className="bi bi-chevron-right" />
        </button>
      </div>
    </div>
  );
}

/* ---------- search box with icon ---------- */
export function SearchBox({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="position-relative">
      <i className="bi bi-search position-absolute text-muted" style={{ left: 13, top: '50%', transform: 'translateY(-50%)' }} />
      <input className="form-control" style={{ paddingLeft: 38 }} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* ---------- one form field (input / select / textarea) ---------- */
export function Field({ field, value, onChange }) {
  const common = {
    className: field.type === 'select' ? 'form-select' : 'form-control',
    value: value ?? '',
    required: field.required,
    disabled: field.disabled,
    onChange: (e) => onChange(field.name, e.target.value),
  };
  return (
    <div className="mb-3">
      <label className="form-label">{field.label}</label>
      {field.type === 'select' ? (
        <select {...common}>
          <option value="">{field.required ? 'Select...' : 'None'}</option>
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea {...common} rows={2} />
      ) : (
        <input {...common} type={field.type || 'text'} step={field.type === 'number' ? '0.01' : undefined} placeholder={field.placeholder} />
      )}
      {field.help && <div className="form-text">{field.help}</div>}
    </div>
  );
}