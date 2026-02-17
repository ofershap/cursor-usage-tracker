"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { DetectionConfig } from "@/lib/types";

interface GroupData {
  id: string;
  name: string;
  member_count: number;
  spend_cents: number;
  emails: string[];
}

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

      <BillingGroupsManager />
    </div>
  );
}

interface ImportPreview {
  totalMembers: number;
  matched: number;
  hasGroupColumn?: boolean;
  moves: number;
  keeps: number;
  noMatch: number;
  changes: Array<{
    email: string;
    name: string;
    department: string;
    title: string;
    currentGroup: string;
    newGroup: string;
  }>;
  groups: Array<{ name: string; memberCount: number }>;
  noMatchMembers: Array<{ email: string; name?: string; currentGroup: string }>;
  applied?: number;
}

function BillingGroupsManager() {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [filter, setFilter] = useState("unassigned");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importStep, setImportStep] = useState<"upload" | "preview" | "done">("upload");
  const [importBusy, setImportBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set());

  const loadGroups = useCallback(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data: GroupData[]) => setGroups(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  async function handleCsvFile(file: File) {
    const text = await file.text();
    setCsvText(text);
    setImportBusy(true);
    try {
      const res = await fetch("/api/groups/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const preview: ImportPreview = await res.json();
      if ("error" in preview) {
        alert((preview as unknown as { error: string }).error);
        return;
      }
      setImportPreview(preview);
      setSelectedChanges(new Set(preview.changes.map((c: ImportPreview["changes"][0]) => c.email)));
      setImportStep("preview");
    } finally {
      setImportBusy(false);
    }
  }

  async function handleApplyImport() {
    if (!importPreview || !csvText) return;
    setImportBusy(true);
    try {
      const res = await fetch("/api/groups/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: csvText,
          apply: true,
          selectedEmails: [...selectedChanges],
        }),
      });
      const result: ImportPreview = await res.json();
      setImportPreview(result);
      setImportStep("done");
      loadGroups();
    } finally {
      setImportBusy(false);
    }
  }

  function closeImport() {
    setShowImport(false);
    setImportPreview(null);
    setImportStep("upload");
    setCsvText("");
    setSelectedChanges(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const unassigned = groups.find((g) => g.name === "Unassigned");
  const namedGroups = groups.filter((g) => g.name !== "Unassigned");

  const isSearching = search.trim().length > 0;

  const allEmails = groups.flatMap((g) => g.emails);

  const displayGroup =
    filter === "unassigned"
      ? unassigned
      : filter === "all"
        ? null
        : groups.find((g) => g.id === filter);

  const displayEmails = displayGroup ? displayGroup.emails : allEmails;

  const filteredEmails = isSearching
    ? allEmails.filter((e) => e.toLowerCase().includes(search.toLowerCase()))
    : displayEmails;

  async function handleRename(groupId: string, name: string) {
    setBusy(true);
    await fetch("/api/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename", groupId, name }),
    });
    setEditingId(null);
    loadGroups();
    setBusy(false);
  }

  async function handleAssign(email: string, targetGroupId: string) {
    setBusy(true);
    await fetch("/api/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assign", email, targetGroupId }),
    });
    loadGroups();
    setBusy(false);
  }

  async function handleCreateGroup(name: string) {
    if (!name.trim()) return;
    setBusy(true);
    await fetch("/api/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: name.trim() }),
    });
    setNewGroupName("");
    setShowNewGroup(false);
    loadGroups();
    setBusy(false);
  }

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-medium text-zinc-400">Billing Groups</h3>
          <p className="text-[10px] text-zinc-600">
            Manage team groups synced from Cursor. Rename groups or assign unassigned members.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600">
            {namedGroups.length} groups · {unassigned?.member_count ?? 0} unassigned
          </span>
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[11px] font-medium transition-colors"
          >
            Import from HiBob
          </button>
        </div>
      </div>

      {namedGroups.length > 0 && (
        <div>
          <div className="text-[10px] text-zinc-500 mb-1.5 font-medium uppercase tracking-wider">
            Groups ({namedGroups.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {namedGroups.map((g) => (
              <div
                key={g.id}
                className={`flex items-center gap-1 border rounded px-2 py-0.5 text-[10px] cursor-pointer transition-colors ${
                  filter === g.id
                    ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                    : "bg-zinc-800 border-zinc-700/50 hover:border-zinc-600 text-zinc-300"
                }`}
                onClick={() => setFilter(filter === g.id ? "unassigned" : g.id)}
              >
                {editingId === g.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRename(g.id, editName);
                    }}
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => setEditingId(null)}
                      className="bg-zinc-700 border border-zinc-600 rounded px-1 py-0.5 text-[10px] w-40 text-white focus:outline-none"
                    />
                  </form>
                ) : (
                  <>
                    <span>{g.name}</span>
                    <span className="text-zinc-600">({g.member_count})</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(g.id);
                        setEditName(g.name);
                      }}
                      className="text-zinc-600 hover:text-zinc-400 ml-0.5"
                      title="Rename group"
                    >
                      edit
                    </button>
                  </>
                )}
              </div>
            ))}
            {showNewGroup ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateGroup(newGroupName);
                }}
                className="flex items-center gap-1"
              >
                <input
                  autoFocus
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onBlur={() => {
                    if (!newGroupName.trim()) setShowNewGroup(false);
                  }}
                  placeholder="Group > Team"
                  className="bg-zinc-700 border border-zinc-600 rounded px-1.5 py-0.5 text-[10px] w-40 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
                <button
                  type="submit"
                  disabled={!newGroupName.trim() || busy}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 disabled:text-zinc-600"
                >
                  add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewGroup(false);
                    setNewGroupName("");
                  }}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300"
                >
                  cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowNewGroup(true)}
                className="flex items-center gap-0.5 border border-dashed border-zinc-600 rounded px-2 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
              >
                + New group
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="text-[10px] text-zinc-500 mb-1.5 font-medium uppercase tracking-wider">
          Members
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="unassigned">Show: Unassigned ({unassigned?.member_count ?? 0})</option>
            <option value="all">Show: All members</option>
            {namedGroups.map((g) => (
              <option key={g.id} value={g.id}>
                Show: {g.name} ({g.member_count})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Find member across all groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 w-56"
            />
            {isSearching && (
              <span className="text-[10px] text-zinc-500">
                {filteredEmails.length} result{filteredEmails.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-h-[300px] overflow-y-auto border border-zinc-800 rounded">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-zinc-900">
            <tr className="text-zinc-500 border-b border-zinc-800">
              <th className="text-left py-1.5 px-2 font-medium">Email</th>
              <th className="text-left py-1.5 px-2 font-medium">Current Group</th>
              <th className="text-right py-1.5 px-2 font-medium">Reassign to</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmails.map((email) => {
              const currentGroup = groups.find((g) => g.emails.includes(email));
              return (
                <tr key={email} className="border-b border-zinc-800/30 hover:bg-zinc-800/30">
                  <td className="py-1 px-2 text-zinc-300 font-mono">{email}</td>
                  <td className="py-1 px-2 text-zinc-500">{currentGroup?.name ?? "—"}</td>
                  <td className="py-1 px-2 text-right">
                    <select
                      disabled={busy}
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) handleAssign(email, e.target.value);
                        e.target.value = "";
                      }}
                      className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-[10px] text-zinc-300 focus:outline-none"
                    >
                      <option value="" disabled>
                        Assign...
                      </option>
                      {groups
                        .filter((g) => g.id !== currentGroup?.id)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {filteredEmails.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-zinc-600 text-xs">
                  No members found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-200">Import from HiBob</h3>
              <button
                onClick={closeImport}
                className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {importStep === "upload" && (
                <div className="space-y-3">
                  <div className="text-xs text-zinc-400 space-y-1">
                    <p>
                      1. Open{" "}
                      <a
                        href="https://app.hibob.com/people/org?tab=directory"
                        target="_blank"
                        rel="noopener"
                        className="text-blue-400 hover:underline"
                      >
                        HiBob People Directory
                      </a>
                    </p>
                    <p>2. Click the download/export button to get a CSV</p>
                    <p>3. Make sure these columns are included:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-zinc-300">
                        Email
                      </span>
                      <span className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-zinc-300">
                        Department
                      </span>
                      <span className="bg-emerald-900/50 px-1.5 py-0.5 rounded font-mono text-emerald-300">
                        Group
                      </span>
                      <span className="bg-emerald-900/50 px-1.5 py-0.5 rounded font-mono text-emerald-300">
                        Team
                      </span>
                      <span className="bg-zinc-800/50 px-1.5 py-0.5 rounded font-mono text-zinc-500">
                        Display name
                      </span>
                      <span className="bg-zinc-800/50 px-1.5 py-0.5 rounded font-mono text-zinc-500">
                        Job title
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      Green = recommended for accurate sub-team mapping. Gray = optional.
                    </p>
                    <p>4. Drop the CSV below or click to upload</p>
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        if (fileInputRef.current) fileInputRef.current.files = dt.files;
                        handleCsvFile(file);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      dragOver
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCsvFile(file);
                      }}
                    />
                    <div className="text-zinc-500 text-sm">
                      {importBusy ? (
                        <span className="animate-pulse">Analyzing CSV...</span>
                      ) : (
                        <>
                          <p className="text-2xl mb-1">📄</p>
                          <p>Drop HiBob CSV here or click to browse</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {importStep === "preview" && importPreview && (
                <div className="space-y-3">
                  {!importPreview.hasGroupColumn && (
                    <div className="bg-amber-900/30 border border-amber-700/50 rounded p-2 text-[11px] text-amber-300">
                      Group/Team columns not found - using Department only. For better sub-team
                      mapping, re-export with Group and Team columns.
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-zinc-800 rounded p-2">
                      <div className="text-lg font-bold">{importPreview.matched}</div>
                      <div className="text-[10px] text-zinc-500">Matched</div>
                    </div>
                    <div className="bg-zinc-800 rounded p-2">
                      <div className="text-lg font-bold text-amber-400">{importPreview.moves}</div>
                      <div className="text-[10px] text-zinc-500">Will move</div>
                    </div>
                    <div className="bg-zinc-800 rounded p-2">
                      <div className="text-lg font-bold text-green-400">{importPreview.keeps}</div>
                      <div className="text-[10px] text-zinc-500">Stay</div>
                    </div>
                    <div className="bg-zinc-800 rounded p-2">
                      <div className="text-lg font-bold text-zinc-500">{importPreview.noMatch}</div>
                      <div className="text-[10px] text-zinc-500">No match</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-medium text-zinc-400 mb-1">
                      Groups ({importPreview.groups.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {importPreview.groups.map((g) => (
                        <span
                          key={g.name}
                          className="bg-zinc-800 border border-zinc-700/50 rounded px-1.5 py-0.5 text-[10px] text-zinc-300"
                        >
                          {g.name} <span className="text-zinc-500">({g.memberCount})</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {importPreview.moves > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-medium text-zinc-400">
                          Changes ({selectedChanges.size} / {importPreview.moves} selected)
                        </h4>
                        <div className="flex gap-2 text-[10px]">
                          <button
                            onClick={() =>
                              setSelectedChanges(new Set(importPreview.changes.map((c) => c.email)))
                            }
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Select all
                          </button>
                          <button
                            onClick={() => setSelectedChanges(new Set())}
                            className="text-zinc-500 hover:text-zinc-300"
                          >
                            Deselect all
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[250px] overflow-y-auto border border-zinc-800 rounded">
                        <table className="w-full text-[11px]">
                          <thead className="sticky top-0 bg-zinc-900">
                            <tr className="text-zinc-500 border-b border-zinc-800">
                              <th className="w-6 py-1 px-1">
                                <input
                                  type="checkbox"
                                  checked={selectedChanges.size === importPreview.moves}
                                  onChange={(e) =>
                                    setSelectedChanges(
                                      e.target.checked
                                        ? new Set(importPreview.changes.map((c) => c.email))
                                        : new Set(),
                                    )
                                  }
                                  className="accent-blue-500"
                                />
                              </th>
                              <th className="text-left py-1 px-2 font-medium">Email</th>
                              <th className="text-left py-1 px-2 font-medium">From</th>
                              <th className="text-center py-1 font-medium">&rarr;</th>
                              <th className="text-left py-1 px-2 font-medium">To</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.changes.map((c) => {
                              const checked = selectedChanges.has(c.email);
                              return (
                                <tr
                                  key={c.email}
                                  className={`border-b border-zinc-800/30 cursor-pointer ${
                                    checked ? "bg-zinc-800/20" : "opacity-50"
                                  }`}
                                  onClick={() => {
                                    const next = new Set(selectedChanges);
                                    if (checked) next.delete(c.email);
                                    else next.add(c.email);
                                    setSelectedChanges(next);
                                  }}
                                >
                                  <td
                                    className="py-0.5 px-1 text-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        const next = new Set(selectedChanges);
                                        if (checked) next.delete(c.email);
                                        else next.add(c.email);
                                        setSelectedChanges(next);
                                      }}
                                      className="accent-blue-500"
                                    />
                                  </td>
                                  <td className="py-0.5 px-2 text-zinc-300 font-mono">{c.email}</td>
                                  <td className="py-0.5 px-2 text-zinc-500">{c.currentGroup}</td>
                                  <td className="py-0.5 text-center text-zinc-600">&rarr;</td>
                                  <td className="py-0.5 px-2 text-amber-400">{c.newGroup}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {importPreview.moves === 0 && (
                    <div className="text-center py-4 text-zinc-500 text-sm">
                      Everything is up to date - no changes needed.
                    </div>
                  )}

                  <div className="text-[10px] text-zinc-600">
                    Teams with fewer than 3 members are merged into their parent group. Members not
                    found in the CSV keep their current assignment.
                  </div>
                </div>
              )}

              {importStep === "done" && importPreview && (
                <div className="text-center py-6 space-y-2">
                  <div className="text-3xl">✓</div>
                  <div className="text-sm text-zinc-200">
                    Applied {importPreview.applied ?? 0} changes
                  </div>
                  <div className="text-xs text-zinc-500">
                    Groups have been updated in the local database.
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-zinc-800">
              {importStep === "preview" && importPreview && (
                <>
                  <button
                    onClick={() => {
                      setImportStep("upload");
                      setImportPreview(null);
                      setSelectedChanges(new Set());
                    }}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Back
                  </button>
                  {selectedChanges.size > 0 && (
                    <button
                      onClick={handleApplyImport}
                      disabled={importBusy}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-md text-xs font-medium transition-colors"
                    >
                      {importBusy
                        ? "Applying..."
                        : `Apply ${selectedChanges.size} change${selectedChanges.size === 1 ? "" : "s"}`}
                    </button>
                  )}
                </>
              )}
              {importStep === "done" && (
                <button
                  onClick={closeImport}
                  className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-xs font-medium transition-colors"
                >
                  Close
                </button>
              )}
              {importStep === "upload" && (
                <button
                  onClick={closeImport}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
