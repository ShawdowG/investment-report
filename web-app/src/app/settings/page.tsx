export const dynamic = "force-static";

import { AppShell } from "@/components/layout/app-shell";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="font-h1 text-h1 text-text-primary">Settings</h1>
        <p className="font-body-compact text-body-compact text-text-secondary">
          Theme toggle, watchlist export/import, and a data-freshness panel
          (last successful report run). Scope finalised when SPEC-012 lands.
        </p>
        <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
          Placeholder — feature under development.
        </div>
      </div>
    </AppShell>
  );
}
