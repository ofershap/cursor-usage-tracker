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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Detection Settings</h1>
          <p className="text-[11px] text-zinc-500">
            Configure anomaly detection thresholds and alerting behavior
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-green-400 text-xs animate-pulse">Saved</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-md transition-colors text-xs font-medium"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Section title="Static Thresholds" description="Hard limits that trigger immediate alerts">
          <Field
            label="Max spend / cycle"
            value={config.thresholds.maxSpendCentsPerCycle}
            onChange={(v) =>
              setConfig({
                ...config,
                thresholds: { ...config.thresholds, maxSpendCentsPerCycle: v },
              })
            }
            suffix={`$${(config.thresholds.maxSpendCentsPerCycle / 100).toFixed(0)}`}
            unit="cents"
          />
          <Field
            label="Max requests / day"
            value={config.thresholds.maxRequestsPerDay}
            onChange={(v) =>
              setConfig({
                ...config,
                thresholds: { ...config.thresholds, maxRequestsPerDay: v },
              })
            }
            unit="reqs"
          />
          <Field
            label="Max tokens / day"
            value={config.thresholds.maxTokensPerDay}
            onChange={(v) =>
              setConfig({
                ...config,
                thresholds: { ...config.thresholds, maxTokensPerDay: v },
              })
            }
            suffix={`${(config.thresholds.maxTokensPerDay / 1_000_000).toFixed(1)}M`}
            unit="tokens"
          />
        </Section>

        <Section
          title="Z-Score Detection"
          description="Statistical outlier detection using standard deviations"
        >
          <Field
            label="Std dev multiplier"
            value={config.zscore.multiplier}
            onChange={(v) => setConfig({ ...config, zscore: { ...config.zscore, multiplier: v } })}
            step={0.5}
            hint="mean + N × σ"
          />
          <Field
            label="Lookback window"
            value={config.zscore.windowDays}
            onChange={(v) => setConfig({ ...config, zscore: { ...config.zscore, windowDays: v } })}
            unit="days"
          />
        </Section>

        <Section title="Trend Detection" description="Detect sudden spikes and sustained drift">
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
            hint="today > N × avg"
          />
          <Field
            label="Spike lookback"
            value={config.trends.spikeLookbackDays}
            onChange={(v) =>
              setConfig({
                ...config,
                trends: { ...config.trends, spikeLookbackDays: v },
              })
            }
            unit="days"
          />
          <Field
            label="Drift threshold"
            value={config.trends.driftDaysAboveP75}
            onChange={(v) =>
              setConfig({
                ...config,
                trends: { ...config.trends, driftDaysAboveP75: v },
              })
            }
            unit="days"
            hint="consecutive > P75"
          />
        </Section>

        <Section title="Collection Schedule" description="How often to pull data from Cursor APIs">
          <Field
            label="Cron interval"
            value={config.cronIntervalMinutes}
            onChange={(v) => setConfig({ ...config, cronIntervalMinutes: v })}
            unit="min"
          />
          <div className="mt-2 text-[10px] text-zinc-600 space-y-1">
            <p>Data is fetched from Cursor Admin + Analytics APIs on each collection run.</p>
            <p>Rate limits: Admin 20 req/min · Analytics 100 req/min</p>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
      <h3 className="text-xs font-medium text-zinc-400">{title}</h3>
      <p className="text-[10px] text-zinc-600 mb-3">{description}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step = 1,
  hint,
  suffix,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  hint?: string;
  suffix?: string;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-zinc-300 w-36 shrink-0">{label}</label>
      <div className="flex items-center gap-1.5 flex-1">
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1 text-xs w-24 text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 font-mono"
        />
        {unit && <span className="text-[10px] text-zinc-600">{unit}</span>}
        {suffix && <span className="text-[10px] text-zinc-500 font-mono">= {suffix}</span>}
        {hint && <span className="text-[10px] text-zinc-600 italic">{hint}</span>}
      </div>
    </div>
  );
}
