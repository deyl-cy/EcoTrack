import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../AuthContext';
import { errMsg } from '../api';
import { Alert } from '../components/ui';
import Logo from '../components/Logo';

// The four fill levels the whole app is built around.
const LEVELS = [
  ['Low', '25%', '#22a35a'], ['Medium', '50%', '#e0a526'],
  ['High', '75%', '#ea7a1c'], ['Full', '100%', '#d93f3f'],
];

export default function Login() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(form.username, form.password); }
    catch (err) { setError(errMsg(err)); setBusy(false); }
  };

  return (
    <div className="login-wrap">
      <section className="login-hero">
        <div className="d-flex align-items-center gap-2">
          <Logo size={42} /><b style={{ fontSize: '1.4rem', letterSpacing: '-.02em' }}>EcoTrack</b>
        </div>

        <div>
          <h1>Know which bins to empty before they overflow.</h1>
          <p>Schedule pickups, plan routes and watch every collection from one place.</p>
          <div className="hero-bins" aria-hidden="true">
            {LEVELS.map(([name, h, color], i) => (
              <div className="hero-bin" key={name}>
                <div className="shell">
                  <div className="fill" style={{ '--h': h, background: color, animationDelay: `${i * 0.18}s` }} />
                </div>
                {name}
              </div>
            ))}
          </div>
        </div>

        <small style={{ color: '#6fa58b' }}>Muñoz, Nueva Ecija</small>
      </section>

      <section className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <h2>Sign in</h2>
          <p className="text-muted mb-4">Use the account your administrator gave you.</p>
          <Alert msg={error} />
          <div className="mb-3">
            <label className="form-label" htmlFor="username">Username</label>
            <input id="username" className="form-control form-control-lg" required autoFocus autoComplete="username"
              value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-group">
              <input id="password" type={show ? 'text' : 'password'} className="form-control form-control-lg" required autoComplete="current-password"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
                <i className={`bi bi-eye${show ? '-slash' : ''}`} />
              </button>
            </div>
          </div>
          <button className="btn btn-success btn-lg w-100" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
        </form>
      </section>
    </div>
  );
}
