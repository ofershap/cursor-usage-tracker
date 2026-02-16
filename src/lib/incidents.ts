import type { Anomaly, Incident } from "./types";
import { insertIncident, updateIncidentStatus, getOpenIncidents, markAnomalyAlerted } from "./db";

function minutesBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 60_000;
}

export function createIncidentForAnomaly(anomaly: Anomaly): Incident {
  const now = new Date().toISOString();
  const mttd = minutesBetween(anomaly.detectedAt, now);

  const incident: Omit<Incident, "id"> = {
    anomalyId: anomaly.id ?? 0,
    userEmail: anomaly.userEmail,
    status: "open",
    detectedAt: anomaly.detectedAt,
    alertedAt: null,
    acknowledgedAt: null,
    resolvedAt: null,
    mttdMinutes: mttd,
    mttiMinutes: null,
    mttrMinutes: null,
  };

  const id = insertIncident(incident);
  return { ...incident, id };
}

export function markIncidentAlerted(incidentId: number, anomalyId: number): void {
  const now = new Date().toISOString();
  updateIncidentStatus(incidentId, "alerted", { alertedAt: now });
  markAnomalyAlerted(anomalyId);
}

export function acknowledgeIncident(incidentId: number): void {
  const now = new Date().toISOString();
  const incidents = getOpenIncidents();
  const incident = incidents.find((i) => i.id === incidentId);
  if (!incident) return;

  const mttiMinutes = incident.alertedAt ? minutesBetween(incident.alertedAt, now) : null;

  updateIncidentStatus(incidentId, "acknowledged", {
    acknowledgedAt: now,
    mttiMinutes,
  });
}

export function resolveIncident(incidentId: number): void {
  const now = new Date().toISOString();
  const incidents = getOpenIncidents();
  const incident = incidents.find((i) => i.id === incidentId);
  if (!incident) return;

  const mttrMinutes = incident.detectedAt ? minutesBetween(incident.detectedAt, now) : null;

  updateIncidentStatus(incidentId, "resolved", {
    resolvedAt: now,
    mttrMinutes,
  });
}

export function processNewAnomalies(
  anomalies: Anomaly[],
): Array<{ anomaly: Anomaly; incident: Incident }> {
  const results: Array<{ anomaly: Anomaly; incident: Incident }> = [];

  for (const anomaly of anomalies) {
    const incident = createIncidentForAnomaly(anomaly);
    results.push({ anomaly, incident });
  }

  return results;
}
