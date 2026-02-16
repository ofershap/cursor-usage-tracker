import nodemailer from "nodemailer";
import type { Anomaly, Incident } from "../types";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function formatValue(metric: string, value: number): string {
  switch (metric) {
    case "spend":
      return `$${(value / 100).toFixed(2)}`;
    case "tokens":
      return `${(value / 1_000_000).toFixed(2)}M tokens`;
    case "requests":
      return `${value.toFixed(0)} requests`;
    case "model_shift":
      return `${value.toFixed(0)}%`;
    default:
      return `${value}`;
  }
}

function buildHtml(anomaly: Anomaly, incident: Incident, dashboardUrl?: string): string {
  const severityColor = anomaly.severity === "critical" ? "#dc2626" : "#f59e0b";
  const diagnosisHtml = anomaly.diagnosisModel
    ? `<tr><td style="padding:8px;color:#6b7280">Diagnosis</td><td style="padding:8px">Primary model: <code>${anomaly.diagnosisModel}</code></td></tr>`
    : "";
  const linkHtml = dashboardUrl
    ? `<p style="margin-top:16px"><a href="${dashboardUrl}/users/${encodeURIComponent(anomaly.userEmail)}">View user dashboard</a> · <a href="${dashboardUrl}/anomalies">View all anomalies</a></p>`
    : "";

  return `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:${severityColor};color:white;padding:16px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Cursor Usage Alert — ${anomaly.severity.toUpperCase()}</h2>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:16px;border-radius:0 0 8px 8px">
        <p style="font-size:16px;font-weight:600">${anomaly.message}</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;color:#6b7280">User</td><td style="padding:8px">${anomaly.userEmail}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Type</td><td style="padding:8px">${anomaly.type}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Metric</td><td style="padding:8px">${anomaly.metric}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Value</td><td style="padding:8px">${formatValue(anomaly.metric, anomaly.value)}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Threshold</td><td style="padding:8px">${formatValue(anomaly.metric, anomaly.threshold)}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Incident</td><td style="padding:8px">#${incident.id}</td></tr>
          ${diagnosisHtml}
        </table>
        ${linkHtml}
        <p style="margin-top:16px;color:#9ca3af;font-size:12px">Detected at ${anomaly.detectedAt} · cursor-usage-tracker</p>
      </div>
    </div>
  `;
}

export async function sendEmailAlert(
  anomaly: Anomaly,
  incident: Incident,
  options: { to?: string; dashboardUrl?: string } = {},
): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  const to = options.to ?? process.env.ALERT_EMAIL_TO;
  if (!to) return false;

  const from = process.env.SMTP_FROM ?? "cursor-tracker@noreply.com";
  const severityPrefix = anomaly.severity === "critical" ? "[CRITICAL]" : "[WARNING]";

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `${severityPrefix} Cursor Usage Alert: ${anomaly.userEmail} — ${anomaly.metric}`,
      html: buildHtml(anomaly, incident, options.dashboardUrl),
    });
    return true;
  } catch {
    console.error("[email] Failed to send alert email");
    return false;
  }
}
