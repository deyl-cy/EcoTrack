import CrudPage from '../components/CrudPage';
import { LevelGauge } from '../components/ui';
import { useAuth } from '../AuthContext';

const LEVELS = ['Low', 'Medium', 'High', 'Full'].map((v) => ({ value: v, label: v }));

export default function Bins() {
  const { user } = useAuth();
  return (
    <CrudPage
      title="Bin"
      heading="Bins"
      description={user.role === 'Admin' ? 'Every waste bin and how full it is.' : 'Every waste bin and how full it is (view only).'}
      endpoint="/bins"
      canWrite={user.role === 'Admin'}
      addLabel="Add bin"
      blank={{ location: '', area: '', capacity_kg: '', current_level: 'Low' }}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'location', label: 'Location' },
        { key: 'area', label: 'Area' },
        { key: 'capacity_kg', label: 'Capacity (kg)' },
        { key: 'current_level', label: 'Level', render: (r) => <LevelGauge level={r.current_level} /> },
      ]}
      fields={[
        { name: 'location', label: 'Location', required: true },
        { name: 'area', label: 'Area', required: true },
        { name: 'capacity_kg', label: 'Capacity (kg)', type: 'number', required: true },
        { name: 'current_level', label: 'Current level', type: 'select', options: LEVELS, required: true },
      ]}
    />
  );
}
