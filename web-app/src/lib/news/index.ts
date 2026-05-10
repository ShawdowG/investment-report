import { CatalystAdapter } from "./catalyst-adapter";
import type { NewsAdapter, NewsItem } from "./types";

const adapters: NewsAdapter[] = [new CatalystAdapter()];

export function registerAdapter(adapter: NewsAdapter): void {
  adapters.push(adapter);
}

export function getNewsForTicker(symbol: string): NewsItem[] {
  return adapters
    .flatMap((adapter) => adapter.getNewsForTicker(symbol))
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      const aPub = a.publishedAt ?? "";
      const bPub = b.publishedAt ?? "";
      return bPub.localeCompare(aPub);
    });
}

export type { NewsAdapter, NewsItem } from "./types";
