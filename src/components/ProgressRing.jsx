/**
 * Anillo de progreso radial. Estilo Apple Health / minimalista.
 *
 * @param {number} value - 0..100
 * @param {number} size - dimensión del SVG
 * @param {number} strokeWidth - grosor del trazo
 * @param {string} color - color del trazo activo
 */
export function ProgressRing({
  value,
  size = 140,
  strokeWidth = 8,
  color = 'var(--accent)',
  trackColor = 'var(--line)',
  children,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className="ring-wrap" style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1), stroke 200ms ease' }}
        />
      </svg>
      <div className="ring-content">
        {children}
      </div>
    </div>
  );
}
