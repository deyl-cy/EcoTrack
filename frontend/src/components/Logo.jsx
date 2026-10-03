/** EcoTrack mark: a leaf on a green tile. */
export default function Logo({ size = 38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#22c55e" />
      <path d="M11 28c0-10 6-15 18-15 0 11-5 17-15 17" fill="#06281b" />
      <path d="M12 29c4-6 8-9 13-11" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}
