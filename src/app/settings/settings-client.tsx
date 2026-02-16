"use client";

import { useState } from "react";
import type { DetectionConfig } from "@/lib/types";

interface SettingsClientProps {
  config: DetectionConfig;
}

export function SettingsClient({ config: initial }: SettingsClientProps) {
  const [config, setConfig] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold mb-1">Detection Settings</h1>
        <p className="text-zinc-400 text-sm">Configure anomaly detection thresholds and behavior</p>
      </div>

      <Section title="Static Thresholds">
        <Field
          label="Max spend per cycle (cents)"
          value={config.thresholds.maxSpendCentsPerCycle}
          onChange={(v) =>
            setConfig({
              ...config,
              thresholds: { ...config.thresholds, maxSpendCentsPerCycle: v },
            })
          }
          hint={`= $${(config.thresholds.maxSpendCentsPerCycle / 100).toFixed(2)}`}
        />
        <Field
          label="Max requests per day"
          value={config.thresholds.maxRequestsPerDay}
          onChange={(v) =>
            setConfig({
              ...config,
              thresholds: { ...config.thresholds, maxRequestsPerDay: v },
            })
          }
        />
        <Field
          label="Max tokens per day"
          value={config.thresholds.maxTokensPerDay}
          onChange={(v) =>
            setConfig({
              ...config,
              thresholds: { ...config.thresholds, maxTokensPerDay: v },
            })
          }
          hint={`= ${(config.thresholds.maxTokensPerDay / 1_000_000).toFixed(1)}M tokens`}
        />
      </Section>

      <Section title="Z-Score Detection">
        <Field
          label="Standard deviation multiplier"
          value={config.zscore.multiplier}
          onChange={(v) => setConfig({ ...config, zscore: { ...config.zscore, multiplier: v } })}
          step={0.5}
          hint="Flag when user exceeds mean + N*stddev"
        />
        <Field
          label="Window (days)"
          value={config.zscore.windowDays}
          onChange={(v) => setConfig({ ...config, zscore: { ...config.zscore, windowDays: v } })}
        />
      </Section>

      <Section title="Trend Detection">
        <Field
          label="Spike multiplier"
          value={config.trends.spikeMultiplier}
          onChange={(v) =>
            setConfig({
              ...config,
              trends: { ...config.trends, spikeMultiplier: v },
            })
          }
          step={0.5}
          hint="Flag when today > N * user's average"
        />
        <Field
          label="Spike lookback (days)"
          value={config.trends.spikeLookbackDays}
          onChange={(v) =>
            setConfig({
              ...config,
              trends: { ...config.trends, spikeLookbackDays: v },
            })
          }
        />
        <Field
          label="Drift days above P75"
          value={config.trends.driftDaysAboveP75}
          onChange={(v) =>
            setConfig({
              ...config,
              trends: { ...config.trends, driftDaysAboveP75: v },
            })
          }
          hint="Consecutive days above team P75 to flag"
        />
      </Section>

      <Section title="Collection">
        <Field
          label="Cron interval (minutes)"
          value={config.cronIntervalMinutes}
          onChange={(v) => setConfig({ ...config, cronIntervalMinutes: v })}
        />
      </Section>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg transition-colors text-sm font-medium"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {saved && <span className="text-green-400 text-sm">Settings saved</span>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm text-zinc-300 w-56 shrink-0">{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm w-32 text-white focus:outline-none focus:border-blue-500"
      />
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </div>
  );
}
