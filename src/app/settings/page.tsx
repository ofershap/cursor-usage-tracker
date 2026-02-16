import { getConfig } from "@/lib/db";
import { DEFAULT_CONFIG } from "@/lib/types";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  let config;
  try {
    config = getConfig();
  } catch {
    config = DEFAULT_CONFIG;
  }

  return <SettingsClient config={config} />;
}
