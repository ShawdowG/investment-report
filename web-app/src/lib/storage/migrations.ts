import {
  DATASET_IDS,
  DATASET_REGISTRY,
  STORAGE_MIGRATION_JOURNAL_KEY,
  STORAGE_SCHEMA_KEY,
  type DatasetId,
  type DatasetVersions,
} from "./registry";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type MigrationResult =
  | { ok: true; migrated: DatasetId[]; versions: DatasetVersions }
  | { ok: false; message: string; cause?: unknown };

type Migration = (value: unknown) => unknown;

// Version 1 records the legacy wire shapes without changing them. New shape
// changes must append a migration here before a registry version is raised.
const MIGRATIONS: Record<DatasetId, Migration[]> = Object.fromEntries(
  DATASET_IDS.map((id) => [id, [(value: unknown) => value]]),
) as Record<DatasetId, Migration[]>;

function parseVersions(raw: string | null): DatasetVersions {
  if (raw === null) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Storage schema marker is not an object.");
  }
  return parsed as DatasetVersions;
}

function restore(storage: KeyValueStorage, before: Map<string, string | null>): void {
  for (const [key, value] of before) {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  }
}

export function runLocalDataMigrations(storage: KeyValueStorage): MigrationResult {
  const before = new Map<string, string | null>();
  try {
    const versionsRaw = storage.getItem(STORAGE_SCHEMA_KEY);
    const versions = parseVersions(versionsRaw);
    const migrated: DatasetId[] = [];
    before.set(STORAGE_SCHEMA_KEY, versionsRaw);
    before.set(STORAGE_MIGRATION_JOURNAL_KEY, storage.getItem(STORAGE_MIGRATION_JOURNAL_KEY));

    storage.setItem(
      STORAGE_MIGRATION_JOURNAL_KEY,
      JSON.stringify({ startedAt: new Date().toISOString(), versions }),
    );

    for (const id of DATASET_IDS) {
      const entry = DATASET_REGISTRY[id];
      const fromVersion = versions[id] ?? 0;
      if (fromVersion > entry.version) {
        throw new Error(`Dataset "${id}" uses unsupported version ${fromVersion}.`);
      }
      if (fromVersion === entry.version) continue;

      const raw = storage.getItem(entry.key);
      before.set(entry.key, raw);
      let value: unknown = raw === null ? entry.defaultValue : JSON.parse(raw);
      for (let version = fromVersion; version < entry.version; version += 1) {
        const migrate = MIGRATIONS[id][version];
        if (!migrate) throw new Error(`Missing ${id} migration to version ${version + 1}.`);
        value = migrate(value);
      }
      if (raw !== null) storage.setItem(entry.key, JSON.stringify(value));
      versions[id] = entry.version;
      migrated.push(id);
    }

    storage.setItem(STORAGE_SCHEMA_KEY, JSON.stringify(versions));
    storage.removeItem(STORAGE_MIGRATION_JOURNAL_KEY);
    return { ok: true, migrated, versions };
  } catch (cause) {
    try {
      restore(storage, before);
    } catch {
      // Preserve the original failure; the journal remains recovery evidence.
    }
    return {
      ok: false,
      message: cause instanceof Error ? cause.message : "Local data migration failed.",
      cause,
    };
  }
}
