import { runDetection } from "../anomaly/detector";
import { processNewAnomalies } from "../incidents";
import { sendAlerts } from "../alerts/index";

async function main() {
  console.log("[detect] Running anomaly detection...");

  const result = runDetection();
  console.log(
    `[detect] Found ${result.newAnomalies.length} new anomalies, resolved ${result.resolvedCount}, total open: ${result.totalOpen}`,
  );

  if (result.newAnomalies.length > 0) {
    const pairs = processNewAnomalies(result.newAnomalies);
    console.log(`[detect] Created ${pairs.length} incidents`);

    const alertResult = await sendAlerts(pairs);
    console.log(
      `[detect] Alerts sent — Slack: ${alertResult.slack}, Email: ${alertResult.email}, Failed: ${alertResult.failed}`,
    );
  }
}

main().catch((err) => {
  console.error("[detect] Fatal error:", err);
  process.exit(1);
});
