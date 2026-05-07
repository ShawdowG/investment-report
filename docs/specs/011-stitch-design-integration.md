# [SPEC-011] Stitch Design Integration (No MCP)

## 1. Context
Bruker leverte Stitch design som HTML/Tailwind håndoff. Vi bruker dette som visuell referanse uten direkte MCP-integrasjon.

## 2. Problem
Eksisterende app har funksjonell struktur, men trenger visuell/IA-opprydding for å ligne designet uten å bryte statisk pipeline.

## 3. Scope
### In scope
- Mappe Stitch design tokens til eksisterende CSS variabler.
- Oppdatere dashboard/watchlist/ticker/portfolio layout trinnvis.
- Beholde eksisterende dataflyt (`search-index`, `latest`, `reports-lite`).
- Implementere komponenter gradvis, ikke full rewrite.

### Out of scope
- Direkte Tailwind runtime-innlasting i prod via CDN.
- Full Next.js migrering i denne specen.
- Komplett parity med alle Stitch-screens i ett steg.

## 4. Acceptance criteria
- [ ] AC1: v3 theme tokens i `assets/style.css` matcher Stitch-retning.
- [ ] AC2: Dashboard cards følger ny hierarki/spacing.
- [ ] AC3: Watchlist-side får tabell + import CTA struktur.
- [ ] AC4: Ingen regressions i eksisterende rapportrender.

## 5. Execution plan
1. Theme tokens + spacing oppdatering.
2. Dashboard card layout refresh.
3. Watchlist MVP UI (tabell + import flow).
4. Ticker detail + portfolio layout alignment.
