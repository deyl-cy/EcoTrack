import CrudPage from '../components/CrudPage';
import { Badge } from '../components/ui';

const STATUSES = ['Available', 'On Route', 'Maintenance'].map((v) => ({ value: v, label: v }));

export default function Vehicles() {
  return (
    <CrudPage
      title="Vehicle"
      heading="Vehicles"
      description="Collection trucks and their availability."
      endpoint="/vehicles"
      addLabel="Add vehicle"
      blank={{ plate_number: '', vehicle_type: '', capacity_kg: '', status: 'Available' }}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'plate_number', label: 'Plate no.' },
        { key: 'vehicle_type', label: 'Type' },
        { key: 'capacity_kg', label: 'Capacity (kg)' },
        { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} /> },
      ]}
      fields={[
        { name: 'plate_number', label: 'Plate number', required: true },
        { name: 'vehicle_type', label: 'Vehicle type', required: true, placeholder: 'e.g. Garbage Truck' },
        { name: 'capacity_kg', label: 'Capacity (kg)', type: 'number', required: true },
        { name: 'status', label: 'Status', type: 'select', options: STATUSES, required: true },
      ]}
    />
  );
}
