import type { Anomaly, Incident } from "../types";
import { sendSlackBatch } from "./slack";
import { sendEmailAlert } from "./email";
import { markIncidentAlerted } from "../incidents";

export async function sendAlerts(
  pairs: Array<{ anomaly: Anomaly; incident: Incident }>,
  options: { dashboardUrl?: string } = {},
): Promise<{ slack: number; email: number; failed: number }> {
  let failed = 0;

  const slackSent = await sendSlackBatch(pairs, options);
  const slackOk = slackSent > 0;

  let emailSent = 0;
  const emailResults: boolean[] = [];
  for (const { anomaly, incident } of pairs) {
    const ok = await sendEmailAlert(anomaly, incident, {
      dashboardUrl: options.dashboardUrl,
    });
    emailResults.push(ok);
    if (ok) emailSent++;
  }

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    if (!pair) continue;
    const { anomaly, incident } = pair;
    if (slackOk || emailResults[i]) {
      markIncidentAlerted(incident.id ?? 0, anomaly.id ?? 0);
    } else {
      failed++;
    }
  }

  return { slack: slackSent, email: emailSent, failed };
}
