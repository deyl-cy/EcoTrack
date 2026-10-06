import { useState } from 'react';
import api, { showError } from '../api';
import { useAuth } from '../AuthContext';
import { Badge, PageHeader } from '../components/ui';
import { success, toast, warning, withLoading } from '../utils/alert';

/** 0-4: length, lower+upper case, digit, symbol. */
function strength(pw) {
  let n = 0;
  if (pw.length >= 8) n++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) n++;
  if (/\d/.test(pw)) n++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) n++;
  return n;
}
const STRENGTH = [['Too weak', '#d93f3f'], ['Weak', '#ea7a1c'], ['Okay', '#e0a526'], ['Good', '#22a35a'], ['Strong', '#12873c']];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ full_name: user.full_name || '', email: user.email || '', contact_number: user.contact_number || '' });
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [show, setShow] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await withLoading(api.put('/profile', form), 'Saving profile...');
      updateUser(res.data);
      toast.success('Profile updated.');
    } catch (err) { showError(err, 'Could not update profile'); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.password !== pw.password_confirmation) return warning('Passwords do not match', 'Type the new password twice, exactly the same.');
    try {
      const res = await withLoading(api.put('/profile/password', pw), 'Changing password...');
      setPw({ current_password: '', password: '', password_confirmation: '' });
      success('Password changed', res.data.message);
    } catch (err) { showError(err, 'Could not change password'); }
  };

  const score = strength(pw.password);
  const [label, color] = STRENGTH[score];
  const type = show ? 'text' : 'password';

  return (
    <>
      <PageHeader title="My profile" subtitle="Update your details and change your password." />

      <div className="row g-3">
        <div className="col-lg-6">
          <form className="eco-card" onSubmit={saveProfile}>
            <div className="eco-card-head"><b>Your details</b><Badge value={user.role} /></div>
            <div className="eco-card-body">
              <div className="mb-3"><label className="form-label">Username</label><input className="form-control" value={user.username} disabled />
                <div className="form-text">Your username can only be changed by an admin.</div></div>
              <div className="mb-3"><label className="form-label">Full name</label>
                <input className="form-control" required maxLength={100} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="mb-3"><label className="form-label">Email <span className="text-muted fw-normal">(optional)</span></label>
                <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="mb-3"><label className="form-label">Contact number <span className="text-muted fw-normal">(optional)</span></label>
                <input className="form-control" maxLength={20} value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /></div>
              <button className="btn btn-success">Save changes</button>
            </div>
          </form>
        </div>

        <div className="col-lg-6">
          <form className="eco-card" onSubmit={changePassword}>
            <div className="eco-card-head">
              <b>Change password</b>
              <button type="button" className="btn btn-sm btn-light" onClick={() => setShow(!show)}>
                <i className={`bi bi-eye${show ? '-slash' : ''} me-1`} />{show ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="eco-card-body">
              <div className="mb-3"><label className="form-label">Current password</label>
                <input type={type} className="form-control" required autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></div>
              <div className="mb-3"><label className="form-label">New password</label>
                <input type={type} className="form-control" required minLength={8} autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
                {pw.password && (
                  <div className="mt-2">
                    <div className="strength-track"><div style={{ width: `${(score + 1) * 20}%`, background: color }} /></div>
                    <small style={{ color }}>{label}</small>
                  </div>
                )}
                <div className="form-text">At least 8 characters, with letters and numbers.</div></div>
              <div className="mb-3"><label className="form-label">Confirm new password</label>
                <input type={type} className="form-control" required autoComplete="new-password" value={pw.password_confirmation} onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })} /></div>
              <button className="btn btn-success">Change password</button>
              <div className="form-text mt-2">Changing it signs you out on every other device.</div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
