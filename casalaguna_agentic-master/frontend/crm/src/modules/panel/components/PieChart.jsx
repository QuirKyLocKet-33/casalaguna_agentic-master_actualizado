import React, { useState, useEffect, useRef } from 'react';

// [MOD] Componente NUEVO — Gráfica de pastel 2D profesional con SVG puro
// Reemplaza las barras de métricas anteriores en Dashboard.jsx
// Modificar: size (tamaño), showLabel threshold (0.12 = 12%), colores en Dashboard
function PieChart({ title, segments = [], size = 160 }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);

  const total = segments.reduce((s, seg) => s + seg.value, 0);

  if (total === 0) {
    return (
      <div className="pie-chart-container">
        <span className="pie-chart-title">{title}</span>
        <div className="pie-chart-empty">Sin datos</div>
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) - 6;

  // Build arc paths — siempre completos (sin animProgress)
  let cumAngle = -90;
  const slices = segments.map((seg, i) => {
    const pct = seg.value / total;
    const sweepDeg = pct * 360;
    const startRad = (cumAngle * Math.PI) / 180;
    const endRad = ((cumAngle + sweepDeg) * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = sweepDeg > 180 ? 1 : 0;

    const midRad = ((cumAngle + sweepDeg / 2) * Math.PI) / 180;
    const labelR = radius * 0.6;
    const lx = cx + labelR * Math.cos(midRad);
    const ly = cy + labelR * Math.sin(midRad);

    const d = sweepDeg >= 359.99
      ? `M ${cx},${cy - radius} A ${radius},${radius} 0 1,1 ${cx - 0.001},${cy - radius} Z`
      : `M ${cx},${cy} L ${x1},${y1} A ${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;

    cumAngle += sweepDeg;

    return {
      d,
      color: seg.color,
      label: seg.label,
      value: seg.value,
      pct: Math.round(pct * 100),
      lx,
      ly,
      showLabel: pct >= 0.12,
    };
  });

  return (
    <div className="pie-chart-container" ref={containerRef}>
      <span className="pie-chart-title">{title}</span>
      <div className="pie-chart-svg-wrap">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="pie-chart-svg"
        >
          {slices.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill={p.color}
              stroke="var(--bg-primary, #fff)"
              strokeWidth="2"
              className="pie-slice"
              onMouseEnter={(e) => {
                const rect = containerRef.current.getBoundingClientRect();
                setTooltip({
                  label: p.label,
                  value: p.value,
                  pct: p.pct,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top - 40,
                });
              }}
              onMouseMove={(e) => {
                const rect = containerRef.current.getBoundingClientRect();
                setTooltip((prev) =>
                  prev
                    ? {
                        ...prev,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top - 40,
                      }
                    : prev
                );
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}
          {slices.map((p, i) =>
            p.showLabel ? (
              <text
                key={`lbl-${i}`}
                x={p.lx}
                y={p.ly}
                textAnchor="middle"
                dominantBaseline="central"
                className="pie-label"
                fill="#fff"
                fontSize="13"
                fontWeight="600"
                style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
              >
                {p.pct}%
              </text>
            ) : null
          )}
        </svg>
        {tooltip && (
          <div
            className="pie-tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <strong>{tooltip.label}</strong>
            <span>{tooltip.value} ({tooltip.pct}%)</span>
          </div>
        )}
      </div>
      <div className="pie-legend">
        {segments.map((seg, i) => (
          <div className="pie-legend-item" key={i}>
            <span className="pie-legend-dot" style={{ backgroundColor: seg.color }}></span>
            <span className="pie-legend-text">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PieChart;
