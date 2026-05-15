export const dynamic = "force-static";

import { AppShell } from "@/components/layout/app-shell";
import { DashboardSettingsPanel } from "@/components/settings/dashboard-settings-panel";
import { ResearchFilesSettings } from "@/components/settings/research-files-settings";
import { SettingsActions } from "@/components/settings/settings-actions";
import { listQuoteSymbols } from "@/lib/quotes/load-quote";

export default function SettingsPage() {
  const knownSymbols = listQuoteSymbols();

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-h1 text-h1 text-text-primary">Settings</h1>
          <p className="font-body-compact text-body-compact text-text-secondary">
            Local data utilities and app preferences.
          </p>
        </header>
        <DashboardSettingsPanel knownSymbols={knownSymbols} />
        <ResearchFilesSettings />
        <SettingsActions />
      </div>
    </AppShell>
  );
}
