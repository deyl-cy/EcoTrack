import { useEffect, useState } from 'react';
import api, { showError } from '../api';
import { withLoading } from '../utils/alert';
import CrudPage from '../components/CrudPage';
import { Badge, DataTable, Modal, ModalBody } from '../components/ui';

export default function Routes() {
  const [collectors, setCollectors] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stops, setStops] = useState(null); // { route, rows }

  useEffect(() => {
    api.get('/users', { params: { role: 'Collector' } }).then((r) => setCollectors(r.data));
    api.get('/vehicles').then((r) => setVehicles(r.data));
  }, []);

  const viewStops = async (route) => {
    try {
      const res = await withLoading(api.get(`/routes/${route.id}/stops`), 'Loading stops...');
      setStops({ route, rows: res.data.data });
    } catch (err) { showError(err, 'Could not load stops'); }
  };

  return (
    <>
      <CrudPage
        title="Route"
        heading="Routes"
        description="A route groups several bin pickups under one collector and vehicle for a day. Attach bins to a route from the Schedules page."
        endpoint="/routes"
        addLabel="Prepare route"
        blank={{ name: '', collector_id: '', vehicle_id: '', route_date: '', status: 'Planned', notes: '' }}
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Route name' },
          { key: 'route_date', label: 'Date' },
          { key: 'collector_name', label: 'Collector' },
          { key: 'plate_number', label: 'Vehicle' },
          { key: 'stop_count', label: 'Stops' },
          { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} /> },
        ]}
        fields={[
          { name: 'name', label: 'Route name', required: true, placeholder: 'e.g. Poblacion Morning Route' },
          { name: 'collector_id', label: 'Collector', type: 'select', required: true, options: collectors.map((u) => ({ value: u.id, label: u.full_name })) },
          { name: 'vehicle_id', label: 'Vehicle', type: 'select', required: true, options: vehicles.map((v) => ({ value: v.id, label: `${v.plate_number} (${v.status})` })) },
          { name: 'route_date', label: 'Route date', type: 'date', required: true },
          { name: 'status', label: 'Status', type: 'select', editOnly: true, required: true, options: ['Planned', 'In Progress', 'Completed'].map((v) => ({ value: v, label: v })) },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ]}
        rowActions={(row) => (
          <button className="btn btn-sm btn-outline-success" onClick={() => viewStops(row)}>
            <i className="bi bi-geo-alt-fill me-1" />Stops
          </button>
        )}
      />

      {stops && (
        <Modal title={`Stops on ${stops.route.name}`} onClose={() => setStops(null)} size="lg">
          <ModalBody>
            <DataTable
              empty="No bins attached yet. Add them from the Schedules page."
              emptyIcon="geo-alt"
              rows={stops.rows}
              columns={[
                { key: 'location', label: 'Location' },
                { key: 'area', label: 'Area' },
                { key: 'waste_type', label: 'Waste type' },
                { key: 'status', label: 'Status', render: (s) => <Badge value={s.status} /> },
              ]}
            />
          </ModalBody>
        </Modal>
      )}
    </>
  );
}
