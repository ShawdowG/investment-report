export const STORAGE_SCHEMA_KEY = "investment_report_schema_versions";
export const STORAGE_MIGRATION_JOURNAL_KEY = "investment_report_migration_journal";

export const DATASET_REGISTRY = {
  watchlist: { key: "watchlist_items", version: 1, defaultValue: [] },
  portfolio: { key: "portfolio_positions", version: 1, defaultValue: [] },
  notes: { key: "ticker_notes", version: 1, defaultValue: {} },
  dispatches: { key: "research_dispatches", version: 1, defaultValue: [] },
  strategies: { key: "strategies", version: 1, defaultValue: [] },
  dashboardSettings: { key: "dashboard_settings", version: 1, defaultValue: null },
  theses: { key: "theses", version: 1, defaultValue: {} },
  quarterlyReviews: { key: "quarterly_reviews", version: 1, defaultValue: [] },
} as const;

export type DatasetId = keyof typeof DATASET_REGISTRY;
export type DatasetVersions = Partial<Record<DatasetId, number>>;
export const DATASET_IDS = Object.keys(DATASET_REGISTRY) as DatasetId[];
