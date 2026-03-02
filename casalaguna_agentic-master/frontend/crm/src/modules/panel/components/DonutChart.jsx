import React, { useState, useRef } from 'react';

// [MOD] Componente NUEVO — Gráfica de anillo (donut) 2D con SVG puro
// Reemplaza PieChart.jsx en Dashboard.jsx
// Props: title, value (porcentaje central), segments [{label, value, color}], size
// [MOD] Porcentajes flotantes fuera de cada segmento, centrados

function DonutChart({ title, value, suffix = '%', segments = [], size = 150 }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);

  const total = segments.reduce((s, seg) => s + seg.value, 0);

  // [MOD-33] Cuando no hay datos (total=0), renderizar anillo vacío con marcadores en 0%
  // en vez de mostrar "Sin datos". Se usa el último segmento (bg) como anillo completo.
  const isEmptyData = total === 0;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = (size / 2) - 4;
  const innerR = outerR * 0.6; // Grosor del anillo = 40% del radio
  const labelR = outerR + 16; // [MOD] Radio exterior para porcentajes flotantes
  const pad = 24; // [MOD] Padding extra en el viewBox para las etiquetas externas

  // [MOD-33] Build donut arcs — si isEmptyData, anillo completo con color bg y 0%
  let arcs;
  if (isEmptyData) {
    // Anillo completo vacío usando el color del último segmento (fondo)
    const bgColor = segments.length > 1 ? segments[segments.length - 1].color : (segments[0]?.color || '#555');
    const fullRingD = `M ${cx},${cy - outerR} A ${outerR},${outerR} 0 1,1 ${cx - 0.001},${cy - outerR} 
         L ${cx - 0.001},${cy - innerR} A ${innerR},${innerR} 0 1,0 ${cx},${cy - innerR} Z`;
    arcs = [{
      d: fullRingD,
      color: bgColor,
      label: 'Sin datos',
      value: 0,
      pct: 0,
      textX: cx,
      textY: cy - labelR,
      sweepDeg: 360,
      isEmpty: true,
    }];
  } else {
    let cumAngle = -90;
    arcs = segments.map((seg, i) => {
      const pct = seg.value / total;
      const sweepDeg = pct * 360;
      const startRad = (cumAngle * Math.PI) / 180;
      const endRad = ((cumAngle + sweepDeg) * Math.PI) / 180;

      // [MOD] Punto medio del arco para posicionar el porcentaje FUERA del anillo
      const midAngleRad = ((cumAngle + sweepDeg / 2) * Math.PI) / 180;
      const textX = cx + labelR * Math.cos(midAngleRad);
      const textY = cy + labelR * Math.sin(midAngleRad);

      // Outer arc points
      const ox1 = cx + outerR * Math.cos(startRad);
      const oy1 = cy + outerR * Math.sin(startRad);
      const ox2 = cx + outerR * Math.cos(endRad);
      const oy2 = cy + outerR * Math.sin(endRad);

      // Inner arc points (reversed)
      const ix1 = cx + innerR * Math.cos(endRad);
      const iy1 = cy + innerR * Math.sin(endRad);
      const ix2 = cx + innerR * Math.cos(startRad);
      const iy2 = cy + innerR * Math.sin(startRad);

      const largeArc = sweepDeg > 180 ? 1 : 0;

      let d;
      if (sweepDeg >= 359.99) {
        // Full ring
        d = `M ${cx},${cy - outerR} A ${outerR},${outerR} 0 1,1 ${cx - 0.001},${cy - outerR} 
             L ${cx - 0.001},${cy - innerR} A ${innerR},${innerR} 0 1,0 ${cx},${cy - innerR} Z`;
      } else {
        d = `M ${ox1},${oy1} A ${outerR},${outerR} 0 ${largeArc},1 ${ox2},${oy2} 
             L ${ix1},${iy1} A ${innerR},${innerR} 0 ${largeArc},0 ${ix2},${iy2} Z`;
      }

      cumAngle += sweepDeg;

      return {
        d,
        color: seg.color,
        label: seg.label,
        value: seg.value,
        pct: Math.round(pct * 100),
        textX,        // [MOD] posición X del texto flotante fuera del segmento
        textY,        // [MOD] posición Y del texto flotante fuera del segmento
        sweepDeg,     // [MOD] para decidir si hay espacio para mostrar el %
      };
    });
  }

  return (
    <div className="donut-chart-container" ref={containerRef}>
      <span className="donut-chart-title">{title}</span>
      <div className="donut-chart-svg-wrap">
        <svg
          width={size + pad * 2}
          height={size + pad * 2}
          viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`}
          className="donut-chart-svg"
        >
          {arcs.map((a, i) => (
            <path
              key={i}
              d={a.d}
              className="donut-slice"
              style={{ fill: a.color, stroke: 'none' }}  // [MOD-27] Sin bordes
              onMouseEnter={(e) => {
                const rect = containerRef.current.getBoundingClientRect();
                setTooltip({
                  label: a.label,
                  value: a.value,
                  pct: a.pct,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top - 40,
                });
              }}
              onMouseMove={(e) => {
                const rect = containerRef.current.getBoundingClientRect();
                setTooltip((prev) =>
                  prev
                    ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top - 40 }
                    : prev
                );
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}
          {/* [MOD-33] Porcentajes flotantes — mostrar 0% cuando no hay datos */}
          {isEmptyData ? (
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              className="donut-segment-label"
              fontSize="13"
              fontWeight="700"
              style={{ pointerEvents: 'none', fill: 'var(--text-primary, #e2e8f0)' }}
            >
              0%
            </text>
          ) : (
            arcs.map((a, i) =>
              a.pct > 0 ? (
                <text
                  key={`lbl-${i}`}
                  x={a.textX}
                  y={a.textY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="donut-segment-label"
                  fontSize="11"
                  fontWeight="700"
                  style={{ pointerEvents: 'none', fill: 'var(--text-primary, #e2e8f0)' }}  // [MOD-16] style para var()
                >
                  {a.pct}%
                </text>
              ) : null
            )
          )}
        </svg>
        {tooltip && (
          <div className="donut-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
            <strong>{tooltip.label}</strong>
            <span>{tooltip.value} ({tooltip.pct}%)</span>
          </div>
        )}
      </div>
      <div className="donut-legend">
        {segments.map((seg, i) => (
          <div className="donut-legend-item" key={i}>
            <span className="donut-legend-dot" style={{ backgroundColor: seg.color }}></span>
            <span className="donut-legend-text">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DonutChart;
