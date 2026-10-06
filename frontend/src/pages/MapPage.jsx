import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { PageHeader } from '../components/ui';
import { toast } from '../utils/alert';
import { LEVEL_COLORS } from '../utils/colors';

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ROUTE_COLORS = ['#2563eb', '#9333ea', '#db2777', '#0d9488', '#ea580c', '#4f46e5', '#65a30d'];
const LEVELS = ['Low', 'Medium', 'High', 'Full'];
const PH_CENTER = [12.8797, 121.774];

const has = (p) => p.latitude != null && p.longitude != null;

/** Builds popup/tooltip content with textContent, so names from the database can never inject HTML. */
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function binPopup(b, onRecord) {
  const box = el('div', null, 'map-popup');
  box.append(el('b', b.location), el('div', b.area, 'text-muted small'));
  const level = el('div', null, 'mt-2');
  const dot = el('span', null, 'map-dot');
  dot.style.background = LEVEL_COLORS[b.current_level];
  level.append(dot, document.createTextNode(` ${b.current_level} · ${b.capacity_kg} kg capacity`));
  box.append(level);
  if (b.pending_count > 0) {
    box.append(el('div', `${b.pending_count} pending pickup${b.pending_count > 1 ? 's' : ''}${b.overdue ? ' · overdue' : ''}`, b.overdue ? 'text-danger fw-semibold mt-1' : 'mt-1'));
  }
  if (onRecord && b.next_schedule_id) {
    const btn = el('button', 'Record pickup', 'btn btn-sm btn-success mt-2');
    btn.type = 'button';
    btn.addEventListener('click', () => onRecord(b.next_schedule_id));
    box.append(btn);
  }
  return box;
}

export default function MapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCollector = user.role === 'Collector';

  const box = useRef(null);
  const map = useRef(null);
  const binLayer = useRef(null);
  const routeLayer = useRef(null);
  const meLayer = useRef(null);
  const goRecord = useRef(null);
  goRecord.current = (id) => navigate(`/assignments/${id}`);

  const [data, setData] = useState(null);
  const [date, setDate] = useState('');
  const [levels, setLevels] = useState(new Set(LEVELS));
  const [hiddenRoutes, setHiddenRoutes] = useState(new Set());

  // Build the map once.
  useEffect(() => {
    const m = L.map(box.current).setView(PH_CENTER, 6);
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(m);
    binLayer.current = L.layerGroup().addTo(m);
    routeLayer.current = L.layerGroup().addTo(m);
    meLayer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  // Load bins + routes (again whenever the date filter changes).
  useEffect(() => {
    let stale = false;
    api.get('/map', { params: date ? { date } : {} })
      .then((res) => { if (!stale) { setData(res.data); setHiddenRoutes(new Set()); } })
      .catch((e) => { if (!stale && !e.handled) toast.error(errMsg(e)); });
    return () => { stale = true; };
  }, [date]);

  const fitAll = () => {
    if (!data || !map.current) return;
    const pts = [...data.bins.filter(has), ...data.routes.flatMap((r) => r.stops.filter(has))].map((p) => [p.latitude, p.longitude]);
    if (pts.length) map.current.fitBounds(pts, { padding: [40, 40], maxZoom: 17 });
  };
  useEffect(fitAll, [data]); // zoom to everything when new data arrives, not when toggling filters

  // Draw bins and routes whenever the data or the filters change.
  useEffect(() => {
    if (!data || !map.current) return;
    binLayer.current.clearLayers();
    routeLayer.current.clearLayers();

    data.bins.filter((b) => has(b) && levels.has(b.current_level)).forEach((b) => {
      L.circleMarker([b.latitude, b.longitude], {
        radius: 9, weight: b.overdue ? 4 : 2, color: b.overdue ? '#7f1d1d' : '#ffffff',
        fillColor: LEVEL_COLORS[b.current_level], fillOpacity: 0.95,
      }).bindPopup(binPopup(b, isCollector ? (id) => goRecord.current(id) : null)).bindTooltip(el('span', b.location)).addTo(binLayer.current);
    });

    data.routes.forEach((r, i) => {
      if (hiddenRoutes.has(r.id)) return;
      const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
      const stops = r.stops.filter(has);
      if (stops.length > 1) {
        L.polyline(stops.map((s) => [s.latitude, s.longitude]), { color, weight: 4, opacity: 0.75, dashArray: '8 8' }).addTo(routeLayer.current);
      }
      stops.forEach((s) => {
        L.marker([s.latitude, s.longitude], {
          icon: L.divIcon({
            className: `map-stop ${s.status === 'Completed' ? 'done' : ''}`,
            html: `<span style="background:${color}">${Number(s.order)}</span>`, iconSize: [26, 26], iconAnchor: [13, 13],
          }),
        }).bindTooltip(el('span', `${r.name} · stop ${s.order}: ${s.location}${s.status === 'Completed' ? ' (done)' : ''}`)).addTo(routeLayer.current);
      });
    });
  }, [data, levels, hiddenRoutes, isCollector]);

  const toggleLevel = (lv) => setLevels((s) => { const n = new Set(s); n.has(lv) ? n.delete(lv) : n.add(lv); return n; });
  const toggleRoute = (id) => setHiddenRoutes((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const locateMe = () => {
    if (!navigator.geolocation) return toast.warning('This device cannot share its location.');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = [p.coords.latitude, p.coords.longitude];
        meLayer.current.clearLayers();
        L.circle(pos, { radius: p.coords.accuracy, color: '#2563eb', weight: 1, fillOpacity: 0.1 }).addTo(meLayer.current);
        L.circleMarker(pos, { radius: 7, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).bindTooltip('You are here').addTo(meLayer.current);
        map.current.setView(pos, 16);
      },
      () => toast.warning('Could not get your location. Allow location access in your browser.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const counts = LEVELS.map((lv) => [lv, data ? data.bins.filter((b) => b.current_level === lv).length : 0]);
  const pinned = data ? data.bins.filter(has).length : 0;

  return (
    <>
      <PageHeader title="Map"
        subtitle={isCollector ? 'Your assigned bins and routes. Tap a bin to record its pickup.' : 'Every bin by fill level, and the routes your collectors are running.'}>
        <button className="btn btn-soft" onClick={locateMe}><i className="bi bi-crosshair me-1" />My location</button>
        <button className="btn btn-soft" onClick={fitAll}><i className="bi bi-arrows-fullscreen me-1" />Fit all</button>
      </PageHeader>

      {data && data.missing_coordinates > 0 && (
        <div className="alert alert-warning py-2 d-flex align-items-center gap-2" role="status">
          <i className="bi bi-geo-alt" />
          <span>
            {data.missing_coordinates} bin{data.missing_coordinates > 1 ? 's have' : ' has'} no map position yet.{' '}
            {user.role === 'Admin' ? <>Add one in <Link to="/bins">Bins</Link> (Edit &rarr; pick the spot on the map).</> : 'Ask an admin to add it.'}
          </span>
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-9">
          <div className="eco-card overflow-hidden"><div ref={box} className="map-box" /></div>
          {data && pinned === 0 && <div className="text-muted small mt-2">No bins to show on the map yet.</div>}
        </div>

        <div className="col-lg-3">
          <div className="eco-card mb-3">
            <div className="eco-card-head"><b>Bin level</b><span className="text-muted small">{pinned} pinned</span></div>
            <div className="eco-card-body d-grid gap-2">
              {counts.map(([lv, n]) => (
                <label key={lv} className="map-filter">
                  <input type="checkbox" className="form-check-input" checked={levels.has(lv)} onChange={() => toggleLevel(lv)} />
                  <span className="map-dot" style={{ background: LEVEL_COLORS[lv] }} /> {lv}
                  <span className="ms-auto text-muted">{n}</span>
                </label>
              ))}
              <small className="text-muted"><span className="map-dot map-dot-ring" /> Dark ring = overdue pickup</small>
            </div>
          </div>

          <div className="eco-card">
            <div className="eco-card-head"><b>Routes</b></div>
            <div className="eco-card-body">
              <label className="form-label small mb-1">Route date</label>
              <div className="input-group input-group-sm mb-3">
                <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
                {date && <button className="btn btn-light" onClick={() => setDate('')} aria-label="Clear date">&times;</button>}
              </div>
              {!data ? <div className="text-muted small">Loading...</div>
                : data.routes.length === 0 ? <div className="text-muted small">{date ? 'No routes on that date.' : 'No active routes.'}</div>
                : data.routes.map((r, i) => (
                  <label key={r.id} className="map-route">
                    <input type="checkbox" className="form-check-input" checked={!hiddenRoutes.has(r.id)} onChange={() => toggleRoute(r.id)} />
                    <span className="map-swatch" style={{ background: ROUTE_COLORS[i % ROUTE_COLORS.length] }} />
                    <span className="min-w-0">
                      <b className="d-block text-truncate">{r.name}</b>
                      <small className="text-muted">{r.route_date} · {r.stops.length} stop{r.stops.length === 1 ? '' : 's'} · {r.status}</small>
                    </span>
                  </label>
                ))}
              <small className="text-muted d-block mt-2">Lines join stops in order; they are not road directions.</small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
