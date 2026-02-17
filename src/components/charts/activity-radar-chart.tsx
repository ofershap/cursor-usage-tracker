"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface ActivityRadarChartProps {
  user: Record<string, number>;
  teamAvg: Record<string, number>;
}

const DIMENSIONS = [
  { key: "agent_requests", label: "Agent" },
  { key: "lines_added", label: "Lines" },
  { key: "total_accepts", label: "Accepts" },
  { key: "tabs_accepted", label: "Tabs" },
  { key: "usage_based_reqs", label: "Usage-based" },
  { key: "chat_requests", label: "Chat" },
  { key: "composer_requests", label: "Composer" },
] as const;

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "8px",
  color: "#fafafa",
} as const;

export function ActivityRadarChart({ user, teamAvg }: ActivityRadarChartProps) {
  const maxValues: Record<string, number> = {};
  for (const dim of DIMENSIONS) {
    maxValues[dim.key] = Math.max(user[dim.key] ?? 0, teamAvg[dim.key] ?? 0, 1);
  }

  const data = DIMENSIONS.map((dim) => ({
    dimension: dim.label,
    user: Math.round(((user[dim.key] ?? 0) / (maxValues[dim.key] ?? 1)) * 100),
    team: Math.round(((teamAvg[dim.key] ?? 0) / (maxValues[dim.key] ?? 1)) * 100),
    rawUser: user[dim.key] ?? 0,
    rawTeam: Math.round(teamAvg[dim.key] ?? 0),
  }));

  const hasData = data.some((d) => d.rawUser > 0);
  if (!hasData) {
    return (
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 text-center text-zinc-500 text-sm">
        No activity data for radar chart
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
      <h3 className="text-xs font-medium text-zinc-500 mb-2">Activity Profile vs Team Average</h3>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#27272a" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={
              ((
                _value: number,
                _name: string,
                props: { payload: { rawUser: number; rawTeam: number; dimension: string } },
              ) => {
                const p = props.payload;
                if (_name === "user") return [p.rawUser.toLocaleString(), "User"];
                return [p.rawTeam.toLocaleString(), "Team Avg"];
              }) as never
            }
          />
          <Radar
            name="user"
            dataKey="user"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Radar
            name="team"
            dataKey="team"
            stroke="#71717a"
            fill="#71717a"
            fillOpacity={0.1}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
            formatter={(value: string) => (value === "user" ? "This User" : "Team Average")}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
