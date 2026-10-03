import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, homeFor } from './AuthContext';
import Guard from './components/Guard';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bins from './pages/Bins';
import Vehicles from './pages/Vehicles';
import Users from './pages/Users';
import Schedules from './pages/Schedules';
import RoutesPage from './pages/Routes';
import Monitor from './pages/Monitor';
import Reports from './pages/Reports';
import Assignments from './pages/Assignments';
import UpdateCollection from './pages/UpdateCollection';

const ADMIN = ['Admin'];
const STAFF = ['Admin', 'Supervisor'];
const COLLECTOR = ['Collector'];

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Everything below shares the navbar layout and requires login. */}
      <Route element={<Guard><Layout /></Guard>}>
        <Route path="/dashboard" element={<Guard roles={STAFF}><Dashboard /></Guard>} />
        <Route path="/bins" element={<Guard roles={STAFF}><Bins /></Guard>} />
        <Route path="/schedules" element={<Guard roles={STAFF}><Schedules /></Guard>} />
        <Route path="/vehicles" element={<Guard roles={ADMIN}><Vehicles /></Guard>} />
        <Route path="/users" element={<Guard roles={ADMIN}><Users /></Guard>} />
        <Route path="/reports" element={<Guard roles={ADMIN}><Reports /></Guard>} />
        <Route path="/routes" element={<Guard roles={['Supervisor']}><RoutesPage /></Guard>} />
        <Route path="/monitor" element={<Guard roles={['Supervisor']}><Monitor /></Guard>} />
        <Route path="/assignments" element={<Guard roles={COLLECTOR}><Assignments /></Guard>} />
        <Route path="/assignments/:id" element={<Guard roles={COLLECTOR}><UpdateCollection /></Guard>} />
      </Route>

      <Route path="*" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
    </Routes>
  );
}
