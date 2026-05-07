# [SPEC-001] v3 Shell + Navigation

## 1. Context
Vi trenger et tydelig app-skall for v3 før vi bygger features. Brukeren skal raskt kunne navigere mellom hovedområdene i produktet på desktop og mobil.

## 2. Problem
Dagens struktur er ikke tydelig nok som dashboard-first cockpit. Uten et stabilt navigasjonsskall blir videre arbeid på dashboard, watchlist, portfolio og ticker-sider fragmentert.

## 3. Scope
### In scope
- Opprette/oppdatere toppnivå navigasjon med:
  - Dashboard
  - Reports
  - Watchlist
  - Portfolio
  - Tickers
  - Settings
- Etablere side-ruter med placeholder-innhold der funksjonalitet ikke finnes enda.
- Aktiv markering av nåværende side.
- Mobilvennlig navigasjon (enkelt menyoppsett er ok i MVP).
- Grunnleggende layout-komponent for konsekvent side-struktur.

### Out of scope
- Komplett innhold på alle sider.
- Datahenting fra nye API-er.
- Kompleks design-polish utover fungerende og ryddig MVP.
- Auth/brukerinnlogging.

## 4. User stories
- Som bruker vil jeg se tydelige hovedseksjoner slik at jeg raskt finner dashboard, rapporter og watchlist.
- Som mobilbruker vil jeg kunne åpne meny og bytte side uten friksjon.

## 5. Functional requirements
- FR1: Navigasjon viser seks toppnivå lenker.
- FR2: Aktiv side vises visuelt (f.eks. active class/state).
- FR3: Hver toppnivå rute returnerer gyldig sidevisning.
- FR4: Navigasjon er brukbar på små skjermer.

## 6. Non-functional requirements
- Rendering skal være rask uten unødvendig client-only logikk i shell.
- Tilgjengelighet: fokus/keyboard-navigasjon på lenker og menyknapp.
- Struktur: komponenter plasseres etter v3-separasjon (layout/ui/app).

## 7. Data contracts
Ingen nye datakontrakter kreves i SPEC-001.

## 8. UX notes
Minimum states:
- Success: sider vises med korrekt nav/highlight.
- Empty: placeholders forklarer at funksjon kommer i neste specs.
- Error: 404-side for ukjente ruter.
- Loading: standard sideovergang (ingen blank skjerm).

## 9. Acceptance criteria
- [ ] AC1: Navigasjon har Dashboard/Reports/Watchlist/Portfolio/Tickers/Settings.
- [ ] AC2: Aktiv side markeres tydelig på alle toppnivå-ruter.
- [ ] AC3: Alle seks ruter kan åpnes uten runtime-feil.
- [ ] AC4: Mobilvisning har fungerende meny (eller tilsvarende enkel nav-løsning).
- [ ] AC5: Placeholder-sider finnes for seksjoner som ikke er implementert.

## 10. Test plan
- Unit:
  - (Ved behov) test av helper for active-route matching.
- Component:
  - Nav viser alle seks lenker.
  - Aktiv route state oppdateres korrekt.
- E2E smoke:
  - Åpne app.
  - Naviger gjennom alle seks ruter.
  - Verifiser at ingen side er blank eller krasjer.

## 11. Rollout plan
- Ingen feature flag nødvendig.
- Leveres som base for neste specs (dashboard/data/watchlist).
- Hvis regressions: rollback til forrige layout-komponent.

## 12. Risks
- Risiko: Ulik eksisterende mappestruktur kan gjøre routing-endring mer omfattende.
  - Mitigasjon: tilpass spec til faktisk prosjektstruktur, men behold funksjonelle krav.
- Risiko: Mobilmeny kan få a11y-feil i første iterasjon.
  - Mitigasjon: prioriter semantiske elementer + keyboard test.
