import type { Anomaly, DetectionConfig } from "../types";
import { getConfig, insertAnomaly, getOpenAnomalies, resolveAnomaly } from "../db";
import { detectThresholdAnomalies } from "./thresholds";
import { detectZScoreAnomalies } from "./zscore";
import { detectTrendAnomalies } from "./trends";

export interface DetectionResult {
  newAnomalies: Anomaly[];
  resolvedCount: number;
  totalOpen: number;
}

export function runDetection(configOverride?: DetectionConfig): DetectionResult {
  const config = configOverride ?? getConfig();

  const thresholdAnomalies = detectThresholdAnomalies(config);
  const zscoreAnomalies = detectZScoreAnomalies(config);
  const trendAnomalies = detectTrendAnomalies(config);

  const allDetected = [...thresholdAnomalies, ...zscoreAnomalies, ...trendAnomalies];

  const existingOpen = getOpenAnomalies();
  const existingKeys = new Set(existingOpen.map((a) => `${a.userEmail}:${a.type}:${a.metric}`));

  const newAnomalies: Anomaly[] = [];
  const detectedKeys = new Set<string>();

  for (const anomaly of allDetected) {
    const key = `${anomaly.userEmail}:${anomaly.type}:${anomaly.metric}`;
    detectedKeys.add(key);

    if (!existingKeys.has(key)) {
      const id = insertAnomaly(anomaly);
      anomaly.id = id;
      newAnomalies.push(anomaly);
    }
  }

  let resolvedCount = 0;
  for (const existing of existingOpen) {
    const key = `${existing.userEmail}:${existing.type}:${existing.metric}`;
    if (!detectedKeys.has(key) && existing.id) {
      resolveAnomaly(existing.id);
      resolvedCount++;
    }
  }

  const totalOpen = getOpenAnomalies().length;

  return { newAnomalies, resolvedCount, totalOpen };
}
