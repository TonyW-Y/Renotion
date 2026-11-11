import type { FurnitureModel } from '@/core/furniture/catalog';

/** Plan-view SVG of a furniture model, drawn from the same parts as the 3D model. */
export function TopView({ model, className }: { model: FurnitureModel; className?: string }) {
  const pad = 0.06;
  const w = model.width + pad * 2;
  const d = model.depth + pad * 2;
  // Draw lower parts first so the tallest surfaces end up on top.
  const parts = [...model.parts].sort(
    (a, b) => a.position[1] + a.size[1] / 2 - (b.position[1] + b.size[1] / 2),
  );
  return (
    <svg viewBox={`${-w / 2} ${-d / 2} ${w} ${d}`} className={className} aria-hidden="true">
      {parts.map((p, i) => {
        const [pw, , pd] = p.size;
        const [x, , z] = p.position;
        return p.shape === 'box' ? (
          <rect
            key={i}
            x={x - pw / 2}
            y={z - pd / 2}
            width={pw}
            height={pd}
            rx={Math.min(pw, pd) * 0.08}
            fill={p.color}
            stroke="rgb(0 0 0 / 0.18)"
            strokeWidth={0.008}
          />
        ) : (
          <circle
            key={i}
            cx={x}
            cy={z}
            r={pw / 2}
            fill={p.color}
            stroke="rgb(0 0 0 / 0.18)"
            strokeWidth={0.008}
          />
        );
      })}
    </svg>
  );
}
