import type { Anomaly, Incident } from "../types";

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: Array<{ type: string; text: string }>;
  elements?: Array<{ type: string; text: string }>;
}

function severityEmoji(severity: string): string {
  return severity === "critical" ? ":rotating_light:" : ":warning:";
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
        text: `*Diagnosis:* Primary model — \`${anomaly.diagnosisModel}\`${anomaly.diagnosisDelta ? ` (delta: ${formatValue(anomaly.metric, anomaly.diagnosisDelta)})` : ""}`,
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

function formatValue(metric: string, value: number): string {
  switch (metric) {
    case "spend":
      return `$${(value / 100).toFixed(2)}`;
    case "tokens":
      return `${(value / 1_000_000).toFixed(2)}M`;
    case "requests":
      return `${value.toFixed(0)}`;
    case "model_shift":
      return `${value.toFixed(0)}%`;
    default:
      return `${value}`;
  }
}

export async function sendSlackAlert(
  anomaly: Anomaly,
  incident: Incident,
  options: { webhookUrl?: string; dashboardUrl?: string } = {},
): Promise<boolean> {
  const webhookUrl = options.webhookUrl ?? process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const blocks = buildAlertBlocks(anomaly, incident, options.dashboardUrl);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `${severityEmoji(anomaly.severity)} ${anomaly.message} — ${anomaly.userEmail}`,
      blocks,
    }),
  });

  return response.ok;
}

export async function sendSlackResolution(
  anomaly: Anomaly,
  options: { webhookUrl?: string } = {},
): Promise<boolean> {
  const webhookUrl = options.webhookUrl ?? process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `:white_check_mark: Resolved: ${anomaly.message} — ${anomaly.userEmail}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:white_check_mark: *Resolved:* ${anomaly.message}\n*User:* ${anomaly.userEmail}`,
          },
        },
      ],
    }),
  });

  return response.ok;
}
