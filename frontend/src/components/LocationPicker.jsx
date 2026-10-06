import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from '../utils/alert';

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const PH_CENTER = [12.8797, 121.774]; // whole-country view until a pin exists

const valid = (lat, lng) => {
  const a = parseFloat(lat), b = parseFloat(lng);
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180;
};
const round = (n) => Math.round(n * 1e6) / 1e6;

const pinIcon = L.divIcon({
  className: 'map-pin', html: '<i class="bi bi-geo-alt-fill"></i>', iconSize: [30, 36], iconAnchor: [15, 34],
});

/**
 * Small map for choosing a bin's position: click to drop the pin, drag it to fine-tune,
 * or type the coordinates. onChange(lat, lng) gets numbers, or ('', '') when cleared.
 */
export default function LocationPicker({ lat, lng, onChange }) {
  const box = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const emit = useRef(onChange);
  emit.current = onChange;

  // Build the map once.
  useEffect(() => {
    const has = valid(lat, lng);
    const m = L.map(box.current).setView(has ? [parseFloat(lat), parseFloat(lng)] : PH_CENTER, has ? 17 : 6);
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(m);
    m.on('click', (e) => emit.current(round(e.latlng.lat), round(e.latlng.lng)));
    map.current = m;
    setTimeout(() => m.invalidateSize(), 60); // the modal is still animating open
    return () => { m.remove(); map.current = null; marker.current = null; };
  }, []);

  // Keep the pin in step with the form values.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!valid(lat, lng)) {
      if (marker.current) { marker.current.remove(); marker.current = null; }
      return;
    }
    const pos = [parseFloat(lat), parseFloat(lng)];
    if (!marker.current) {
      marker.current = L.marker(pos, { icon: pinIcon, draggable: true }).addTo(m);
      marker.current.on('dragend', () => { const p = marker.current.getLatLng(); emit.current(round(p.lat), round(p.lng)); });
    } else {
      marker.current.setLatLng(pos);
    }
    if (!m.getBounds().contains(pos)) m.setView(pos, Math.max(m.getZoom(), 16));
  }, [lat, lng]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.warning('This device cannot share its location.');
    navigator.geolocation.getCurrentPosition(
      (p) => { emit.current(round(p.coords.latitude), round(p.coords.longitude)); map.current?.setView([p.coords.latitude, p.coords.longitude], 17); },
      () => toast.warning('Could not get your location. Allow location access, or click the map instead.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="mb-3">
      <label className="form-label">Map position <span className="text-muted fw-normal">(optional)</span></label>
      <div ref={box} className="picker-map" />
      <div className="row g-2 mt-1">
        <div className="col-6"><input type="number" step="any" className="form-control form-control-sm" placeholder="Latitude" aria-label="Latitude" value={lat ?? ''} onChange={(e) => onChange(e.target.value, lng ?? '')} /></div>
        <div className="col-6"><input type="number" step="any" className="form-control form-control-sm" placeholder="Longitude" aria-label="Longitude" value={lng ?? ''} onChange={(e) => onChange(lat ?? '', e.target.value)} /></div>
      </div>
      <div className="d-flex gap-2 mt-2 flex-wrap align-items-center">
        <button type="button" className="btn btn-sm btn-soft" onClick={useMyLocation}><i className="bi bi-crosshair me-1" />Use my location</button>
        {valid(lat, lng) && <button type="button" className="btn btn-sm btn-light" onClick={() => onChange('', '')}>Clear pin</button>}
        <span className="form-text m-0">Click the map to place the pin, then drag to fine-tune.</span>
      </div>
    </div>
  );
}
