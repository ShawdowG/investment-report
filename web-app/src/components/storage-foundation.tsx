"use client";

import { useEffect, useState } from "react";
import { runLocalDataMigrations } from "@/lib/storage/migrations";

export function StorageFoundation({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const result = runLocalDataMigrations(window.localStorage);
    if (!result.ok) setError(result.message);
  }, []);

  return (
    <>
      {error ? (
        <p role="alert" className="m-4 rounded border border-destructive p-3 text-sm">
          Local data could not be migrated: {error} Your stored data was not cleared.
        </p>
      ) : null}
      {children}
    </>
  );
}
