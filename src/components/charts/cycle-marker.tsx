import { usePlotArea } from "recharts";

export const AXIS_STROKE = "#71717a";
// the cycle change line sits between the widget border (zinc-800) and the "previous cycle" label (zinc-600)
export const CYCLE_STROKE = "#3f3f46";
export const CYCLE_STROKE_WIDTH = 2;
// the "previous cycle" label is dimmer (zinc-600) than the new one
const CYCLE_TEXT = "#52525b";

// approximate widths of the labels, to leave out one that would run past the plot (over the axis)
const PREVIOUS_WIDTH = 84;
const NEW_WIDTH = 56;

// labels of a billing cycle change, drawn above the plot on each side of the line:
// the old cycle in the dimmer colour, the new one in the axis text colour
export function CycleLabels({ viewBox }: { viewBox?: { x?: number; y?: number } }) {
  const x = viewBox?.x ?? 0;
  const y = viewBox?.y ?? 0;
  const plot = usePlotArea();
  const left = plot?.x ?? 0;
  const right = plot ? plot.x + plot.width : Infinity;
  return (
    <g>
      <line
        x1={x}
        x2={x}
        y1={y - 16}
        y2={y}
        stroke={CYCLE_STROKE}
        strokeWidth={CYCLE_STROKE_WIDTH}
      />
      {x - 8 - PREVIOUS_WIDTH >= left && (
        <text x={x - 8} y={y - 4} textAnchor="end" fill={CYCLE_TEXT} fontSize={12}>
          previous cycle
        </text>
      )}
      {x + 8 + NEW_WIDTH <= right && (
        <text x={x + 8} y={y - 4} textAnchor="start" fill={AXIS_STROKE} fontSize={12}>
          new cycle
        </text>
      )}
    </g>
  );
}
