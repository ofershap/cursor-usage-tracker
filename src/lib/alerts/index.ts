import type { Anomaly, Incident } from "../types";
import { sendSlackAlert } from "./slack";
import { sendEmailAlert } from "./email";
import { markIncidentAlerted } from "../incidents";

export async function sendAlerts(
  pairs: Array<{ anomaly: Anomaly; incident: Incident }>,
  options: { dashboardUrl?: string } = {},
): Promise<{ slack: number; email: number; failed: number }> {
  let slack = 0;
  let email = 0;
  let failed = 0;

  for (const { anomaly, incident } of pairs) {
    const slackOk = await sendSlackAlert(anomaly, incident, {
      dashboardUrl: options.dashboardUrl,
    });
    if (slackOk) slack++;

    const emailOk = await sendEmailAlert(anomaly, incident, {
      dashboardUrl: options.dashboardUrl,
    });
    if (emailOk) email++;

    if (slackOk || emailOk) {
      markIncidentAlerted(incident.id ?? 0, anomaly.id ?? 0);
    } else {
      failed++;
    }
  }

  return { slack, email, failed };
}
