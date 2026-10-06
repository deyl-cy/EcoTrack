import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { closeAlert, idleWarning, info, toast } from '../utils/alert';
import { ACTIVITY_KEY, IDLE_MINUTES, IDLE_MS, WARN_MS } from '../utils/session';

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'wheel', 'touchstart'];

/**
 * Signs the user out after a period of inactivity. Renders nothing.
 *
 * - Activity is stored as a timestamp in localStorage, so every open tab shares one clock.
 * - A check runs every second against the real clock, so a laptop that slept still times out on wake.
 * - WARN_MS before the limit, a "Still there?" countdown popup lets the user stay signed in.
 */
export default function IdleTimeout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const warningOpen = useRef(false);
  const closedByCode = useRef(false);
  const ending = useRef(false);

  useEffect(() => {
    const touch = () => localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    const idleFor = () => Date.now() - Number(localStorage.getItem(ACTIVITY_KEY) || Date.now());

    const closeWarning = () => { closedByCode.current = true; closeAlert(); };

    const end = async (reason) => {
      if (ending.current) return;
      ending.current = true;
      if (warningOpen.current) closeWarning();
      await logout();
      navigate('/login', { replace: true });
      if (reason === 'timeout') info('Signed out', `You were signed out after ${IDLE_MINUTES} minutes of inactivity.`);
      else toast.success('You have been signed out.');
    };

    // Ignore activity while the warning is open: the user must click "Stay signed in".
    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      if (warningOpen.current || now - lastWrite < 1000) return;
      lastWrite = now;
      touch();
    };

    touch();
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const timer = setInterval(async () => {
      if (ending.current) return;
      const idle = idleFor();

      if (idle >= IDLE_MS) return end('timeout');

      // Activity in another tab while our warning is showing: dismiss it.
      if (idle < IDLE_MS - WARN_MS && warningOpen.current) { closeWarning(); return; }

      if (idle >= IDLE_MS - WARN_MS && !warningOpen.current) {
        warningOpen.current = true;
        const res = await idleWarning(Math.ceil((IDLE_MS - idle) / 1000));
        warningOpen.current = false;

        if (closedByCode.current) { closedByCode.current = false; return; }
        if (res.isConfirmed) touch();
        else end(res.dismiss === 'timer' ? 'timeout' : 'manual');
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, []);

  return null;
}
