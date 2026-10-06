import { Empty } from './ui';
import { WASTE_COLORS, WASTE_TYPES } from '../utils/colors';

// Small hand-drawn SVG charts (no chart library), matching the hand-drawn donut on the Dashboard.

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
export const kg = (n) => `${nf.format(n)} kg`;

/** Rounds a maximum up to a "nice" axis top: 37 -> 40, 820 -> 1000. */
function niceCeil(n) {
  const pow = 10 ** Math.floor(Math.log10(n));
  const f = n / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

export function Legend({ items }) {
  return (
    <div className="chart-legend">
      {items.map(([label, color]) => (
        <span key={label}><i style={{ background: color }} />{label}</span>
      ))}
    </div>
  );
}

/**
 * Stacked columns, one per period, split by waste type.
 * data: [{ label, total, Biodegradable, 'Non-Biodegradable', Recyclable }]
 */
export function StackedBars({ data, height = 230 }) {
  if (!data?.some((d) => d.total > 0)) return <Empty icon="bar-chart-line">No pickups recorded in this period.</Empty>;

  const W = 640, H = height, padL = 46, padR = 8, padT = 10, padB = 28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const top = niceCeil(Math.max(...data.map((d) => d.total)));
  const slot = innerW / data.length;
  const bw = Math.min(42, slot * 0.64);
  const y = (v) => padT + innerH * (1 - v / top);
  const every = Math.ceil(data.length / 10); // thin out x labels on long ranges

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Weight collected over time, by waste type">
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (top * i) / 4;
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#e6eee9" />
              <text x={padL - 8} y={y(v) + 4} textAnchor="end" className="chart-tick">{nf.format(v)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = padL + slot * i + (slot - bw) / 2;
          let acc = 0;
          return (
            <g key={d.label + i}>
              <title>{`${d.label}: ${kg(d.total)} (${WASTE_TYPES.map((t) => `${t} ${nf.format(d[t] || 0)}`).join(', ')})`}</title>
              {WASTE_TYPES.map((t) => {
                const v = d[t] || 0;
                if (!v) return null;
                const rect = <rect key={t} x={x} y={y(acc + v)} width={bw} height={y(acc) - y(acc + v)} fill={WASTE_COLORS[t]} rx="2" />;
                acc += v;
                return rect;
              })}
              {i % every === 0 && <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="chart-tick">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      <Legend items={WASTE_TYPES.map((t) => [t, WASTE_COLORS[t]])} />
    </>
  );
}

/**
 * Horizontal bars for comparing things (collectors, routes, waste types).
 * items: [{ name, weight_kg, pickups?, color? }]
 */
export function BarList({ items, color = '#22c55e', empty = 'Nothing to compare yet.' }) {
  if (!items?.length || !items.some((i) => i.weight_kg > 0)) return <Empty icon="bar-chart-line">{empty}</Empty>;
  const max = Math.max(...items.map((i) => i.weight_kg)) || 1;

  return (
    <div className="barlist">
      {items.map((i) => (
        <div className="barlist-row" key={i.name}>
          <div className="barlist-top">
            <span className="barlist-name" title={i.name}>{i.name}</span>
            <b>{kg(i.weight_kg)}</b>
          </div>
          <div className="barlist-track"><div style={{ width: `${(i.weight_kg / max) * 100}%`, background: i.color || color }} /></div>
          {i.pickups != null && <small className="text-muted">{i.pickups} pickup{i.pickups === 1 ? '' : 's'}</small>}
        </div>
      ))}
    </div>
  );
}
