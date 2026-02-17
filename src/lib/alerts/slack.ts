import type { Anomaly, Incident } from "../types";

const SLACK_API_URL = "https://slack.com/api/chat.postMessage";
const BATCH_THRESHOLD = 3;

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: Array<{ type: string; text: string }>;
  elements?: Array<{ type: string; text: string }>;
}

function severityEmoji(severity: string): string {
  return severity === "critical" ? ":rotating_light:" : ":warning:";
}

function formatValue(metric: string, value: number): string {
  switch (metric) {
    case "spend":
      return `$${(value / 100).toFixed(2)}`;
    case "tokens":
      return `${(value / 1_000_000).toFixed(2)}M`;
    case "requests":
      return `${value.toFixed(0)}`;
    default:
      return `${value}`;
  }
}

function buildAlertBlocks(
  anomaly: Anomaly,
  incident: Incident,
  dashboardUrl?: string,
): SlackBlock[] {
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${severityEmoji(anomaly.severity)} Cursor Usage Alert — ${anomaly.severity.toUpperCase()}`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${anomaly.message}*`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*User:*\n${anomaly.userEmail}` },
        { type: "mrkdwn", text: `*Type:*\n${anomaly.type}` },
        { type: "mrkdwn", text: `*Metric:*\n${anomaly.metric}` },
        {
          type: "mrkdwn",
          text: `*Value:*\n${formatValue(anomaly.metric, anomaly.value)}`,
        },
        {
          type: "mrkdwn",
          text: `*Threshold:*\n${formatValue(anomaly.metric, anomaly.threshold)}`,
        },
        {
          type: "mrkdwn",
          text: `*Incident:*\n#${incident.id}`,
        },
      ],
    },
  ];

  if (anomaly.diagnosisModel) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Primary model:* \`${anomaly.diagnosisModel}\``,
      },
    });
  }

  if (dashboardUrl) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${dashboardUrl}/users/${encodeURIComponent(anomaly.userEmail)}|View user dashboard> · <${dashboardUrl}/anomalies|View all anomalies>`,
      },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Detected at ${anomaly.detectedAt} · cursor-usage-tracker`,
      },
    ],
  });

  return blocks;
}

function buildSummaryBlocks(
  pairs: Array<{ anomaly: Anomaly; incident: Incident }>,
  dashboardUrl?: string,
): SlackBlock[] {
  const critical = pairs.filter((p) => p.anomaly.severity === "critical");
  const warnings = pairs.filter((p) => p.anomaly.severity === "warning");

  const lines = pairs.map(({ anomaly, incident }) => {
    const emoji = severityEmoji(anomaly.severity);
    return `${emoji} *#${incident.id}* ${anomaly.userEmail}: ${anomaly.message}`;
  });

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `Cursor Usage — ${pairs.length} anomalies detected`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${critical.length}* critical · *${warnings.length}* warning`,
      },
    },
  ];

  const MAX_BLOCK_CHARS = 2800;
  let chunk: string[] = [];
  let chunkLen = 0;

  for (const line of lines) {
    if (chunkLen + line.length + 1 > MAX_BLOCK_CHARS && chunk.length > 0) {
      blocks.push({ type: "section", text: { type: "mrkdwn", text: chunk.join("\n") } });
      chunk = [];
      chunkLen = 0;
    }
    chunk.push(line);
    chunkLen += line.length + 1;
  }
  if (chunk.length > 0) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: chunk.join("\n") } });
  }

  if (dashboardUrl) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${dashboardUrl}/anomalies|View all anomalies>`,
      },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Detected at ${new Date().toISOString()} · cursor-usage-tracker`,
      },
    ],
  });

  return blocks;
}

async function postToSlack(
  token: string,
  channel: string,
  text: string,
  blocks: SlackBlock[],
): Promise<boolean> {
  try {
    const response = await fetch(SLACK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channel, text, blocks }),
    });

    if (!response.ok) {
      console.error(`[slack] HTTP error: ${response.status} ${response.statusText}`);
      return false;
    }

    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      console.error(`[slack] API error: ${data.error}`);
      return false;
    }

    console.log("[slack] Message sent successfully");
    return true;
  } catch (err) {
    console.error("[slack] Failed to send:", err instanceof Error ? err.message : err);
    return false;
  }
}

export async function sendSlackAlert(
  anomaly: Anomaly,
  incident: Incident,
  options: { dashboardUrl?: string } = {},
): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;
  if (!token || !channel) {
    console.warn("[slack] Skipping alert — missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID");
    return false;
  }

  const blocks = buildAlertBlocks(anomaly, incident, options.dashboardUrl);
  const text = `${severityEmoji(anomaly.severity)} ${anomaly.message} — ${anomaly.userEmail}`;

  return postToSlack(token, channel, text, blocks);
}

export async function sendSlackBatch(
  pairs: Array<{ anomaly: Anomaly; incident: Incident }>,
  options: { dashboardUrl?: string } = {},
): Promise<number> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;
  if (!token || !channel) {
    console.warn("[slack] Skipping batch — missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID");
    return 0;
  }

  console.log(
    `[slack] Sending ${pairs.length} anomalies (${pairs.length <= BATCH_THRESHOLD ? "individual" : "summary"} mode)`,
  );

  if (pairs.length <= BATCH_THRESHOLD) {
    let sent = 0;
    for (const { anomaly, incident } of pairs) {
      const ok = await sendSlackAlert(anomaly, incident, options);
      if (ok) sent++;
    }
    return sent;
  }

  const blocks = buildSummaryBlocks(pairs, options.dashboardUrl);
  const text = `Cursor Usage — ${pairs.length} anomalies detected`;
  const ok = await postToSlack(token, channel, text, blocks);
  return ok ? pairs.length : 0;
}
