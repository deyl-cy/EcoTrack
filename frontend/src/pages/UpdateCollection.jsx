import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { showError } from '../api';
import { PageHeader } from '../components/ui';
import { confirm, success, toast, withLoading } from '../utils/alert';

export default function UpdateCollection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(null);
  const [form, setForm] = useState({ actual_weight_kg: '', remarks: '' });

  useEffect(() => {
    api.get(`/schedules/${id}`)
      .then((res) => setSchedule(res.data.data))
      .catch((e) => {
        if (!e.handled) toast.error('That assignment could not be found.');
        navigate('/assignments', { replace: true }); // not yours / not found
      });
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    const ok = await confirm({
      title: 'Mark as collected?',
      text: `Record ${form.actual_weight_kg} kg collected at ${schedule.location}. This completes the pickup.`,
      confirmText: 'Yes, mark collected',
    });
    if (!ok) return;
    try {
      await withLoading(api.post('/records', { schedule_id: id, ...form }), 'Recording pickup...', 0);
      await success('Pickup recorded!', `${schedule.location} is now marked as collected.`, { timer: 1800, timerProgressBar: true, showConfirmButton: false });
      navigate('/assignments');
    } catch (err) { showError(err, 'Could not record pickup'); }
  };

  if (!schedule) return <div className="text-muted">Loading...</div>;

  return (
    <div style={{ maxWidth: 560 }}>
      <Link to="/assignments" className="text-muted text-decoration-none small"><i className="bi bi-arrow-left me-1" />My assignments</Link>
      <PageHeader title="Record pickup" subtitle="Enter what you actually collected." />

      {schedule.status === 'Completed' ? (
        <div className="alert alert-success">This pickup is already marked as completed.</div>
      ) : (
        <>
          <div className="eco-card mb-3">
            <div className="eco-card-body">
              <div className="d-flex align-items-start gap-3">
                <span className="stat-icon tone-green"><i className="bi bi-trash3-fill" /></span>
                <div>
                  <div className="fw-bold">{schedule.location}</div>
                  <div className="text-muted small mb-2">{schedule.area}</div>
                  <span className="pill pill-gray me-2">{schedule.scheduled_date}</span>
                  <span className="pill pill-green">{schedule.waste_type}</span>
                </div>
              </div>
            </div>
          </div>

          <form className="eco-card" onSubmit={submit}>
            <div className="eco-card-body">
              <div className="mb-3">
                <label className="form-label">Actual weight collected (kg)</label>
                <input type="number" step="0.01" min="0" required className="form-control form-control-lg" value={form.actual_weight_kg}
                  onChange={(e) => setForm({ ...form, actual_weight_kg: e.target.value })} />
              </div>
              <div className="mb-4">
                <label className="form-label">Remarks <span className="text-muted fw-normal">(optional)</span></label>
                <textarea rows={2} className="form-control" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </div>
              <button className="btn btn-success btn-lg w-100"><i className="bi bi-check2-circle me-1" />Mark as collected</button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
