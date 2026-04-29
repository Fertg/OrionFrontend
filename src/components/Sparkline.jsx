/**
 * Sparkline minimalista. Recibe un array de números y dibuja una línea SVG.
 *
 * @param {number[]} values - serie de valores
 * @param {number} width
 * @param {number} height
 * @param {string} color - color del trazo
 */
export function Sparkline({ values, width = 120, height = 36, color = 'currentColor', fill = false }) {
  if (!values || values.length === 0) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }

  const max = Math.max(...values, 1);
  const min = 0;
  const range = max - min || 1;
  const stepX = width / Math.max(1, values.length - 1);

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${(values.length - 1) * stepX},${height} L 0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {fill && (
        <path
          d={areaPath}
          fill={color}
          opacity="0.08"
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
