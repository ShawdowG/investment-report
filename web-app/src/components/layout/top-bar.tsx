"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Bell, Menu, Search, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { normalizeSymbol } from "@/lib/parsing/normalize-symbol";

export function TopBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const normalised = normalizeSymbol(trimmed) ?? trimmed.toUpperCase();
    router.push(`/ticker/${encodeURIComponent(normalised)}`);
  }

  return (
    <header className="w-full h-16 border-b border-border-subtle bg-background flex justify-between items-center px-margin-mobile md:px-gutter sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="md:hidden text-text-secondary hover:text-text-primary transition-colors p-2 rounded-full hover:bg-surface-variant"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>
        <div className="md:hidden font-h2 text-h2 text-text-primary">Investment Report</div>
        <form
          onSubmit={handleSubmit}
          className="hidden md:flex items-center bg-surface-variant rounded-full px-4 py-2 w-72 border border-border-subtle focus-within:border-primary/60 transition-colors"
          role="search"
        >
          <Search className="size-4 text-text-secondary mr-2 shrink-0" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ticker symbol…"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="bg-transparent border-0 font-body-compact text-body-compact text-text-primary p-0 w-full placeholder:text-text-secondary focus:outline-none focus:ring-0"
            aria-label="Search ticker symbol"
          />
        </form>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Notifications"
          className="text-text-secondary hover:text-text-primary transition-colors p-2 rounded-full hover:bg-surface-variant"
        >
          <Bell className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Account"
          className="text-text-secondary hover:text-text-primary transition-colors p-2 rounded-full hover:bg-surface-variant"
        >
          <User className="size-5" />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
