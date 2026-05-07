# Investment Report v3 — Incremental Execution Spec (OpenSpec-style for Codex)

Dette dokumentet definerer en enkel, OpenSpec-lignende arbeidsmåte vi kan bruke med Codex før og under implementasjon av v3.

Mål:
- Små, verifiserbare steg
- Tydelige akseptansekriterier per steg
- Sporbarhet fra idé → spec → task → PR → release
- Lav risiko for regressions

---

## 1) Arbeidsmodell (Spec-first)

For hvert arbeidspunkt følger vi denne flyten:

```text
Intent
→ Spec
→ Task breakdown
→ Implementasjon
→ Verifisering
→ PR
→ Merge
```

### 1.1 Intent (kort)
- Hva vil vi løse?
- Hvem er bruker?
- Hva er «minimum win»?

### 1.2 Spec (konkret)
- Scope (in/out)
- UX-flow
- Data-kontrakter
- Risiko og avhengigheter
- Akseptansekriterier

### 1.3 Task breakdown
- Del opp i små tasks (0.5–1.5 dag)
- Én task = én tydelig leveranse
- Legg teststrategi per task

### 1.4 Implementasjon
- Feature branch
- Små commits
- Hold deg til definert scope

### 1.5 Verifisering
- Lint
- Typecheck
- Unit/component/e2e (relevant)
- Manuell UX-sjekk

### 1.6 PR
- Hva ble gjort
- Hvorfor
- Hvordan testet
- Risiko/rollout-notat

---

## 2) Folderstruktur for specs

```text
docs/specs/
  README.md
  000-template.md
  001-v3-shell-navigation.md
  002-static-report-indexes.md
  003-dashboard-v3.md
  ...
```

Anbefaling:
- Ett spec-dokument per feature/epic.
- Nummerér sekvensielt for tydelig historikk.

---

## 3) Spec-template (bruk denne)

```md
# [SPEC-XXX] Tittel

## 1. Context
Kort bakgrunn og brukerbehov.

## 2. Problem
Hvilket konkret problem løses?

## 3. Scope
### In scope
- ...
### Out of scope
- ...

## 4. User stories
- Som [bruker], vil jeg [mål], slik at [verdi].

## 5. Functional requirements
- FR1 ...
- FR2 ...

## 6. Non-functional requirements
- Ytelse
- Robusthet
- Tilgjengelighet

## 7. Data contracts
Input/output, typer, JSON-format.

## 8. UX notes
Skisser av states: loading, empty, error, success.

## 9. Acceptance criteria
- [ ] AC1 ...
- [ ] AC2 ...

## 10. Test plan
- Unit:
- Component:
- E2E:

## 11. Rollout plan
Feature flag? Migrering? Fallback?

## 12. Risks
- Risiko
- Mitigasjon
```

---

## 4) Definition of Ready (DoR)

Task/spec er klar for utvikling når:
- Scope er tydelig
- Avhengigheter er identifisert
- AC er testbare
- Data-kontrakter er definert
- Minst én testmetode er valgt

---

## 5) Definition of Done (DoD)

Leveranse er ferdig når:
- AC oppfylt
- Lint/typecheck/test/build grønt
- Loading/empty/error states finnes
- Dokumentasjon oppdatert
- PR-review kommentarer håndtert

---

## 6) Foreslått inkrementell plan (første 6 specs)

### SPEC-001 — v3 Shell + Navigation
- Mål: Grunnstruktur med Dashboard/Reports/Watchlist/Portfolio/Tickers/Settings.
- Output: Ruteoppsett + placeholder sider.

### SPEC-002 — Static Report Indexes
- Mål: `latest.json`, `reports-lite.json`, `by-date`, `by-ticker`.
- Output: Oppdatert generator + validering av filer.

### SPEC-003 — Dashboard v3 (MVP)
- Mål: Vis regime, posture, movers, compare latest/previous.
- Output: Dashboard-komponenter + fallback states.

### SPEC-004 — Watchlist Local Store
- Mål: CRUD for watchlist i localStorage.
- Output: `watchlist-store` + grunnleggende UI.

### SPEC-005 — Ticker Import/Parser
- Mål: Parse rotete input til normaliserte symboler.
- Output: `parse-tickers` + preview + ukjente tokens.

### SPEC-006 — Watchlist Impact
- Mål: Match watchlist mot latest report.
- Output: `getWatchlistImpact` + prioriterte signaler.

---

## 7) Hvordan bruke dette med Codex i praksis

Pr. feature kan du gi en prompt i denne stilen:

```text
Bruk docs/specs/000-template.md.
Lag SPEC-00X for [feature].
Fyll ut scope, AC, testplan og risiko.
Deretter implementer kun In Scope.
Kjør lint/typecheck/test/build.
Lag commit + PR-notat.
```

Dette gir en OpenSpec-lignende flyt, men tilpasset Codex og repoet vårt.

---

## 8) Beslutning

Ja — vi bruker denne modellen før prosjektstart.

Neste konkrete steg:
1. Opprett `docs/specs/` med template + README.
2. Skriv SPEC-001 (navigation shell).
3. Skriv SPEC-002 (static indexes).
4. Start implementasjon når SPEC-001 er godkjent.
