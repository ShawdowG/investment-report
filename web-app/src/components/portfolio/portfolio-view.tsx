"use client";

import { useEffect, useState } from "react";
import { AddPositionForm } from "./add-position-form";
import { PortfolioTable } from "./portfolio-table";
import type { PortfolioPosition } from "@/lib/domain/portfolio";
import {
  addPosition,
  getPortfolio,
  removePosition,
} from "@/lib/storage/portfolio-store";

export function PortfolioView() {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPositions(getPortfolio());
    setReady(true);
  }, []);

  function handleAdd(input: { symbol: string; quantity: number; avgPrice: number }) {
    setPositions(addPosition(input));
  }

  function handleRemove(symbol: string) {
    setPositions(removePosition(symbol));
  }

  if (!ready) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        Loading portfolio…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AddPositionForm onAdd={handleAdd} />
      <PortfolioTable positions={positions} onRemove={handleRemove} />
      <p className="text-xs text-muted-foreground">
        Stored locally under{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-[10px]">portfolio_positions</code>.
        Dollar deltas on the dashboard are estimates — see SPEC-008 §8.
      </p>
    </div>
  );
}
